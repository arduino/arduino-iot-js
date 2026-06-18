import { filter } from 'rxjs/operators';
import { Subscription as RxSubscription } from 'rxjs';

import * as SenML from '../senML';
import * as Utils from '../utils';
import { CloudOptions } from '../types/options';
import { MqttTransport } from '../transport/MqttTransport';
import { CloudMessage, CloudMessageValue } from '../transport/types';
import { Subscription } from './Subscription';
import { PropertyChannel, PropertyListener } from './Property';

/**
 * Base class for the object returned by `connect()`. Encapsulates a live
 * transport and the bookkeeping needed to share MQTT topic subscriptions across
 * many property listeners. Subclasses (`UserConnection`, `DeviceConnection`)
 * only add the topic conventions and credential-specific behaviour.
 */
export abstract class ActiveConnection {
  // How many active listeners reference each MQTT topic. The broker
  // subscription is created on the first listener and dropped with the last.
  private readonly topicRefs = new Map<string, number>();

  constructor(
    protected readonly transport: MqttTransport,
    protected readonly options: CloudOptions
  ) {
    if (this.options.onConnected) this.transport.on('connect', this.options.onConnected);
    if (this.options.onDisconnect) this.transport.on('close', this.options.onDisconnect);
    if (this.options.onOffline) this.transport.on('offline', this.options.onOffline);
  }

  /** Close the underlying connection. The instance must not be reused after. */
  public close(): void {
    this.endTransport();
  }

  /**
   * Tear down the transport socket. Shared low-level step behind {@link close}
   * and the reconnect in `UserConnection.updateToken`; unlike `close()` it
   * carries no "do not reuse" semantics, so it stays free of permanent cleanup.
   */
  protected endTransport(): void {
    this.transport.end(true);
  }

  /**
   * Subscribe to a topic, invoking `listener` for every message that matches
   * `predicate`. The MQTT subscription is reference-counted, so concurrent
   * listeners on the same topic share a single broker subscription.
   */
  protected observe<T extends CloudMessageValue>(
    topic: string,
    predicate: (message: CloudMessage) => boolean,
    listener: PropertyListener<T>
  ): Subscription {
    // Reference-count the topic: the first listener subscribes on the broker.
    const count = this.topicRefs.get(topic) || 0;
    if (count === 0) this.transport.subscribe(topic);
    this.topicRefs.set(topic, count + 1);

    const rxSub: RxSubscription = this.transport.messages
      .pipe(filter((m) => m.topic === topic && predicate(m)))
      .subscribe((m) => listener(m.value as T));

    let closed = false;
    return {
      unsubscribe: () => {
        if (closed) return;
        closed = true;
        rxSub.unsubscribe();

        // Drop the broker subscription once the last listener goes away.
        const remaining = (this.topicRefs.get(topic) || 1) - 1;
        if (remaining <= 0) {
          this.topicRefs.delete(topic);
          this.transport.unsubscribe(topic);
        } else {
          this.topicRefs.set(topic, remaining);
        }
      },
    };
  }

  /**
   * Build the channel a {@link Property} talks through: it listens on
   * `inboundTopic` and publishes to `outboundTopic`. The two differ (and are
   * swapped between user and device connections) because the broker treats a
   * thing's input and output as distinct topics.
   */
  protected channel(inboundTopic: string, outboundTopic: string): PropertyChannel {
    return {
      observe: (name, listener) => this.observe(inboundTopic, (m) => m.propertyName === name, listener),
      publish: (name, value, timestamp) => this.send(outboundTopic, name, value, timestamp),
    };
  }

  protected send(
    topic: string,
    name: string,
    value: CloudMessageValue,
    timestamp: number = new Date().getTime()
  ): Promise<void> {
    if (timestamp && !Number.isInteger(timestamp)) throw new Error('send failed: timestamp must be an Integer');
    if (!Utils.isString(name)) throw new Error('send failed: name must be a valid string');

    const values = SenML.parse(name, value, timestamp, this.options.useCloudProtocolV2 ?? false, null);
    const message = SenML.CBOR.encode(Utils.isArray(values) ? values : [values], this.options.useCloudProtocolV2);
    this.transport.publish(topic, Utils.toBuffer(message));
    return Promise.resolve();
  }
}
