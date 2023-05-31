import { filter } from 'rxjs/operators';
import { Subscription, Subject, Observable } from 'rxjs';

import * as SenML from '../senML';
import * as Utils from '../utils';
import { CloudOptions } from '../CloudOptions';
import { CloudMessageValue, ICloudClient } from './ICloudClient';
import { IConnection, CloudMessage } from '../connection/IConnection';

export class BaseCloudClient<T extends IConnection = IConnection> implements ICloudClient {
  constructor(protected connection: T, protected options: CloudOptions) {}

  public disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connection) return reject(new Error('disconnection failed: connection closed'));

      try {
        this.connection.end(true);
      } catch (error) {
        return reject(error);
      }

      this.connection = null;
      return resolve();
    });
  }

  public async reconnect(): Promise<void> {
    this.connection.reconnect();
  }

  protected async _sendProperty(
    topic: string,
    name: string,
    value: CloudMessageValue,
    tmp: number = new Date().getTime()
  ): Promise<void> {
    if (tmp && !Number.isInteger(tmp)) throw new Error('send message failed: timestamp must be Integer');
    if (!Utils.isString(name)) throw new Error('send message failed: name must be a valid string');

    const values = SenML.parse(name, value, tmp, this.options.useCloudProtocolV2, null);
    const message = SenML.CBOR.encode(Utils.isArray(values) ? values : [values], this.options.useCloudProtocolV2);

    return this.sendMessage(topic, message);
  }

  public async sendMessage(topic: string, message: string | ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connection) return reject(new Error('send message failed: no connection found'));

      const body = Utils.isString(message) ? Buffer.from(message, 'utf8') : message;
      this.connection.publish(topic, Utils.toBuffer(body), { qos: 1, retain: false });
      return resolve();
    });
  }

  protected observe(topic: string): Observable<CloudMessage> {
    if (!this.connection) throw new Error('subscription failed: no connection found');

    let subscription: Subscription;
    const subject = new Subject<CloudMessage>();
    this.connection.subscribe(topic, (err) => {
      if (err) throw new Error(`subscription failed: ${err.toString()}`);

      subscription = this.connection.messages.pipe(filter((v) => v.topic === topic)).subscribe((v) => subject.next(v));
    });

    const originalMethod = subject.unsubscribe;
    subject.unsubscribe = () => {
      subscription.unsubscribe();
      originalMethod();
    };

    return subject;
  }

  protected unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connection) return reject(new Error('unsubscribe failed: no connection found'));

      return this.connection.unsubscribe(topic, null, (err) => (err ? reject() : resolve()));
    });
  }
}
