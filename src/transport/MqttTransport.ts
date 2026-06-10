import { Observable, Subject } from 'rxjs';

import * as SenML from '../senML';
import * as Utils from '../utils';
import { MqttClient } from '../mqtt/MqttClient';
import { BaseConnectionOptions, CloudMessage, CloudMessageValue, MqttOptions } from './types';

export type MqttConnectFn = (url: string, options: MqttOptions) => MqttClient | Promise<MqttClient>;

/**
 * Thin wrapper around an MQTT client. It owns the socket lifecycle and turns
 * raw MQTT payloads into a stream of decoded {@link CloudMessage}s. It is pure
 * transport: it knows nothing about things, properties or topic conventions.
 */
export class MqttTransport {
  private client: MqttClient;
  private readonly messagesSubject = new Subject<CloudMessage>();

  /** Decoded messages for every subscribed topic. Survives reconnects. */
  public readonly messages: Observable<CloudMessage> = this.messagesSubject;

  constructor(private readonly url: string, private options: MqttOptions, private readonly mqttConnect: MqttConnectFn) {
    this.options = { ...BaseConnectionOptions, ...options };
  }

  public async connect(options?: Partial<MqttOptions>): Promise<void> {
    if (options) this.options = { ...this.options, ...options };

    const client = (this.client = await this.mqttConnect(this.url, this.options));
    client.on('message', (topic: string, msg: Buffer) => this.onMessage(topic, msg));

    return new Promise<void>((resolve, reject) => {
      client.once('connect', () => resolve());
      client.once('close', () => reject(new Error('connection failed: client not connected')));
    });
  }

  public on(event: string, cb: (...args: any[]) => void): void {
    this.client.on(event, cb);
  }

  public publish(topic: string, message: Buffer): void {
    this.client.publish(topic, message, { qos: 1, retain: false });
  }

  public subscribe(topic: string, callback?: Function): void {
    this.client.subscribe(topic, callback);
  }

  public unsubscribe(topic: string, callback?: Function): void {
    this.client.unsubscribe(topic, undefined, callback);
  }

  public reconnect(opts?: object): void {
    this.client.reconnect(opts);
  }

  public end(force = true): void {
    this.client.end(force);
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
