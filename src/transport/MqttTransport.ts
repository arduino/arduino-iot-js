import { Observable, Subject } from 'rxjs';

import * as SenML from '../senML';
import * as Utils from '../utils';
import { MqttCallback, MqttClient } from '../mqtt/MqttClient';
import { BaseConnectionOptions, CloudMessage, CloudMessageValue, MqttOptions } from './types';

export type MqttConnectFn = (url: string, options: MqttOptions) => MqttClient | Promise<MqttClient>;

/** MQTT username/password (and client id) used for a single connection. */
export type MqttCredentials = { username: string; password: string; clientId?: string };

/**
 * Supplies the credentials for a connection. Called on every (re)connect, so
 * for tokens that expire (user JWT / API exchange) it can hand back a freshly
 * minted one — letting the transport re-authenticate transparently after the
 * broker drops the socket.
 */
export type CredentialsProvider = () => Promise<MqttCredentials>;

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Thin wrapper around an MQTT client. It owns the socket lifecycle — including
 * credential refresh and automatic reconnection — and turns raw MQTT payloads
 * into a stream of decoded {@link CloudMessage}s. It is pure transport: it knows
 * nothing about things, properties or topic conventions.
 *
 * Each (re)connect builds a brand-new client, so the transport keeps the data
 * needed to make that transparent: the registered event handlers and the set of
 * subscribed topics are re-applied to every fresh client. That way lifecycle
 * callbacks keep firing and subscriptions survive across reconnects.
 */
export class MqttTransport {
  private client?: MqttClient;
  private closed = false;
  private reconnecting = false;

  private readonly messagesSubject = new Subject<CloudMessage>();
  /** Decoded messages for every subscribed topic. Survives reconnects. */
  public readonly messages: Observable<CloudMessage> = this.messagesSubject;

  // Re-applied to every fresh client so callbacks and subscriptions survive a
  // reconnect (and the credential refresh that comes with it).
  private readonly listeners = new Map<string, Set<MqttCallback>>();
  private readonly topics = new Set<string>();

  constructor(
    private readonly url: string,
    private readonly credentials: CredentialsProvider,
    private readonly mqttConnect: MqttConnectFn,
    private readonly onError?: (error: unknown) => void
  ) {}

  /** Open the connection. Rejects if the first attempt fails. */
  public async connect(): Promise<void> {
    this.closed = false;
    await this.openClient();
  }

  /** Permanently close the connection and stop reconnecting. */
  public end(): void {
    this.closed = true;
    this.client?.end(true);
  }

  public on(event: string, cb: MqttCallback): void {
    const handlers = this.listeners.get(event) ?? new Set<MqttCallback>();
    handlers.add(cb);
    this.listeners.set(event, handlers);
    this.client?.on(event, cb);
  }

  /**
   * Fire-and-forget publish. NOTE: a message published while the socket is down
   * (between a drop and the next successful reconnect) is silently lost — there
   * is no client to hand it to.
   * TODO: Buffering outbound messages across reconnects as a future improvement.
   */
  public publish(topic: string, message: Buffer): void {
    this.client?.publish(topic, message, { qos: 1, retain: false });
  }

  public subscribe(topic: string): void {
    this.topics.add(topic);
    this.client?.subscribe(topic);
  }

  public unsubscribe(topic: string): void {
    this.topics.delete(topic);
    this.client?.unsubscribe(topic);
  }

  /** Build a fresh client with freshly-resolved credentials and wire it up. */
  private async openClient(): Promise<void> {
    const credentials = await this.credentials();
    const options: MqttOptions = { ...BaseConnectionOptions, ...credentials, reconnectPeriod: 0 };

    // Release the previous client (a dropped connection, or a failed reconnect
    // attempt) before replacing it, so its socket and listeners don't linger.
    // Null it out first so operations during the (possibly async) connect no-op
    // cleanly instead of hitting the dead client. Its 'close' won't trigger
    // another reconnect: scheduleReconnect() bails while `reconnecting` is set.
    this.client?.end(true);
    this.client = undefined;

    const client = (this.client = await this.mqttConnect(this.url, options));
    this.listeners.forEach((handlers, event) => handlers.forEach((cb) => client.on(event, cb)));
    client.on('message', (topic: string, msg: Buffer) => this.onMessage(topic, msg));

    await this.waitForConnect(client);

    // close() may have landed while we were resolving credentials or connecting,
    // when `this.client` was undefined and so couldn't be ended. Tear down the
    // freshly-built client rather than leaving a live connection after close.
    if (this.closed) {
      client.end(true);
      this.client = undefined;
      return;
    }

    // Replay retained subscriptions onto the fresh (clean-session) connection.
    this.topics.forEach((topic) => client.subscribe(topic));

    // Own the reconnect loop once established. mqtt's own loop is disabled
    // (reconnectPeriod: 0) so we can refresh credentials before re-authing.
    client.on('close', () => this.scheduleReconnect());
  }

  private waitForConnect(client: MqttClient): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // The client may already be connected if mqttConnect resolved after the
      // 'connect' event fired — check synchronously so we don't miss it and hang.
      if (client.connected) {
        resolve();
        return;
      }

      let settled = false;
      client.once('connect', () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      client.once('close', () => {
        if (settled) return;
        settled = true;
        reject(new Error('connection failed: client not connected'));
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnecting) return;
    this.reconnecting = true;
    void this.reconnect().finally(() => {
      this.reconnecting = false;
    });
  }

  private async reconnect(): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      await delay(Math.min(RECONNECT_MAX_MS, RECONNECT_BASE_MS * 2 ** attempt));
      // close() may have been called during the backoff wait.
      if (this.closed) return;
      try {
        await this.openClient();
        return;
      } catch (error) {
        // Surface the failed attempt (bad credentials, token exchange, a
        // rejected connection, …) — some paths emit no socket event, so this is
        // the only signal. Keep retrying with backoff until connected or closed.
        this.onError?.(error);
      }
    }
  }

  private onMessage(topic: string, msg: Buffer): void {
    if (topic.indexOf('/s/o') > -1) this.messagesSubject.next({ topic, value: msg.toString() });
    else this.decode(topic, msg).forEach((m) => this.messagesSubject.next(m));
  }

  private decode(topic: string, msg: Buffer): CloudMessage[] {
    let current = '';
    let attribute = '';
    let previous = '';
    let valueToSend: CloudMessageValue = {};

    const messages: CloudMessage[] = [];
    const properties = SenML.CBOR.decode(Utils.toArrayBuffer(msg));

    properties.forEach((p) => {
      const value = SenML.valueFrom(p);
      [current, attribute] = SenML.nameFrom(p).split(':');
      if (previous === '') previous = current;

      if (previous !== current) {
        messages.push({ topic, propertyName: previous, value: valueToSend });
        previous = current;
        valueToSend = {};
      }

      if (attribute) valueToSend[attribute] = value;
      else valueToSend = value;
    });

    if (Utils.isNotAnEmptyObject(valueToSend)) {
      messages.push({ topic, propertyName: current, value: valueToSend });
    }

    return messages;
  }
}
