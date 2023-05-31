import jws from 'jws';
import mqtt from 'mqtt';
import { Observable, Subject } from 'rxjs';

import * as SenML from '../senML';
import * as Utils from '../utils';
import { CloudMessageValue } from '../client/ICloudClient';
import { MqttConnection } from '../builder/ICloudClientBuilder';
import { IConnection, CloudMessage, BaseConnectionOptions, ITokenConnection, ConnectionOptions } from './IConnection';
export class Connection implements IConnection {
  private _client: mqtt.MqttClient;
  protected options: ConnectionOptions;
  public messages: Observable<CloudMessage>;

  protected get client(): mqtt.MqttClient {
    return this._client;
  }

  protected set client(client: mqtt.MqttClient) {
    this._client = client;
    const messages = (this.messages = new Subject<CloudMessage>());

    this._client.on('message', (topic, msg) => {
      if (topic.indexOf('/s/o') > -1) messages.next({ topic, value: msg.toString() });
      else this.messagesFrom(topic, msg).forEach((m) => messages.next(m));
    });
  }

  constructor(
    protected host: string,
    protected username: string,
    protected password: string,
    protected mqttConnect: MqttConnection
  ) {
    if (!username) throw new Error('connection failed: you need to provide a valid username');
    if (!password) throw new Error('connection failed: you need to provide a valid password');
    if (!host) throw new Error('connection failed: you need to provide a valid host (broker)');

    this.options = {
      ...BaseConnectionOptions,
      username,
      password,
      clientId: username,
    };
  }

  public connect(options?: Partial<ConnectionOptions>): Promise<boolean> {
    return new Promise<boolean>((res, rej) => {
      this.options = options ? { ...this.options, ...options } : this.options;

      this.client = this.mqttConnect(this.host, this.options);
      this.client.once('connect', () => res(true));
      this.client.once('close', () => rej(new Error('connection failed: client not connected')));
    });
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

    // Checking if valueToSend is NOT {}
    if (Utils.isNotAnEmptyObject(valueToSend)) {
      messages.push({ topic, propertyName: current, value: valueToSend });
    }

    return messages;
  }
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Connection {
  type TokenConnection = new (host: string, token: string, mqttConnect: MqttConnection) => ITokenConnection;

  export const WithToken: TokenConnection = class extends Connection implements ITokenConnection {
    constructor(host: string, protected token: string, mqttConnect: MqttConnection) {
      super(host, jws.decode(token).payload['http://arduino.cc/id'], token, mqttConnect);
    }

    public async connect(options?: Partial<ConnectionOptions>): Promise<boolean> {
      await super.connect(options);
      this.token = this.options.password;
      return true;
    }

    public async updateToken(newToken: string): Promise<void> {
      while (true) {
        try {
          this.end();
          await this.connect({ ...this.options, password: newToken });
        } catch (error) {
          console.error(error);
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    public getToken(): string {
      return this.token;
    }
  };
}
