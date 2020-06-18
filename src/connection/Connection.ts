import jws from 'jws';
import mqtt from 'mqtt';
import { Observable, Subject } from 'rxjs';

import SenML from '../senML';
import Utils from '../utils';
import { CloudMessageValue } from '../client/ICloudClient';
import { IConnection, CloudMessage, ConnectionOptions } from './IConnection';

const BaseConnectionOptions: Partial<ConnectionOptions> = {
  clean: true,
  keepalive: 30,
  properties: {},
  protocolVersion: 4,
  connectTimeout: 30000,
};

export class Connection implements IConnection {
  public token: string;
  public messages: Observable<CloudMessage>;

  private _client: mqtt.MqttClient;
  private get client(): mqtt.MqttClient {
    return this._client;
  }

  private set client(client: mqtt.MqttClient) {
    this._client = client;
    const messages = (this.messages = new Subject<CloudMessage>());

    this._client.on('message', (topic, msg) => {
      if (topic.indexOf('/s/o') > -1) messages.next({ topic, value: msg.toString() });
      else this.messagesFrom(topic, msg).forEach((m) => messages.next(m));
    });
  }

  public static async From(host: string, port: string | number, token: string): Promise<IConnection> {
    if (!token) throw new Error('connection failed: you need to provide a valid token');
    if (!host) throw new Error('connection failed: you need to provide a valid host (broker)');

    const userId = jws.decode(token).payload['http://arduino.cc/id'];
    const options = {
      clientId: `${userId}:${new Date().getTime()}`,
      username: userId,
      password: token,
    };

    const connection = new Connection();
    connection.client = mqtt.connect(`wss://${host}:${port}/mqtt`, {
      ...BaseConnectionOptions,
      ...options,
    });
    connection.token = token;
    return connection;
  }

  public on(event: any, cb: any): IConnection {
    this.client.on(event, cb);
    return this;
  }
  public end(force?: boolean, opts?: Record<string, any>, cb?: mqtt.CloseCallback): IConnection {
    this.client.end(force, opts, cb);
    return this;
  }
  public reconnect(opts?: mqtt.IClientReconnectOptions): IConnection {
    this.client.reconnect(opts);
    return this;
  }

  public unsubscribe(topic: string | string[], opts?: any, callback?: any): IConnection {
    this.client.subscribe(topic, opts, callback);
    return this;
  }

  public publish(topic: any, message: any, opts?: any, callback?: any): IConnection {
    this.client.publish(topic, message, opts, callback);
    return this;
  }

  public subscribe(topic: any, callback?: any): IConnection {
    this.client.subscribe(topic, callback);
    return this;
  }

  private messagesFrom(topic: string, msg: Buffer): CloudMessage[] {
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

    if (valueToSend !== {}) messages.push({ topic, propertyName: current, value: valueToSend });

    return messages;
  }
}
