import CBOR from '@arduino/cbor-js';
import { filter } from "rxjs/operators";
import { Subscription, Subject, Observable } from "rxjs";

import * as Utils from "../utils/Utils";
import { Connection, CloudMessage } from "../connection/Connection";
import { IArduinoCloudClient, ConnectionOptions, OnMessageCallback } from "./IArduinoCloudClient";

const EMPTY = () => null;

export class ArduinoCloudClient implements IArduinoCloudClient {
  private connection: Connection;
  private subscriptions: { [key: string]: Subscription[] } = {};
  private callbacks: { [key: string]: OnMessageCallback<any>[] } = {};

  private options: ConnectionOptions = {
    host: this.host,
    port: this.port,
    ssl: false,
    token: undefined,
    onOffline: undefined,
    onDisconnect: undefined,
    onConnected: undefined,
    useCloudProtocolV2: false,
  };

  constructor(private host: string = 'wss.iot.arduino.cc', private port: number = 8443) { }

  public connect(options: ConnectionOptions): Promise<Connection> {
    return new Promise<Connection>((resolve, reject) => {
      const { host, port, token } = this.options = { ...this.options, ...options };
      const { onConnected = EMPTY, onOffline = () => EMPTY, onDisconnect = () => EMPTY } = this.options;

      if (this.connection) return reject(new Error('connection failed: connection already open'));
      if (!token) return reject(new Error('connection failed: you need to provide a valid token'));
      if (!host) return reject(new Error('connection failed: you need to provide a valid host (broker)'));

      this.connection = Connection.From(host, port, token);
      this.connection.on('offline', () => onOffline());
      this.connection.on('disconnect', () => onDisconnect());
      this.connection.on('error', (err) => reject(new Utils.ArduinoCloudError(5, err.toString())));
      this.connection.on('connect', () => {
        onConnected();
        return resolve(this.connection);
      });
    });
  }

  public disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connection) return reject(new Error('disconnection failed: connection closed'));

      try {
        this.connection.end(true);
      } catch (error) {
        return reject(error);
      }

      this.connection = null;
      Object.values(this.subscriptions).forEach((subs, topic) => {
        subs.forEach(sub => sub.unsubscribe())
        delete this.callbacks[topic];
        delete this.subscriptions[topic];
      });

      return resolve();
    });
  }

  public async reconnect(): Promise<void> {
    this.connection.reconnect();
  }

  public async updateToken(newToken: string): Promise<void> {
    while (true) {
      try {
        if (this.connection) {
          this.connection.end();
          this.connection = null;
        }

        await this.connect({ ...this.options, token: newToken });

        Object.keys(this.subscriptions).forEach(topic => {
          this.subscriptions[topic].forEach(sub => sub.unsubscribe());
          delete this.subscriptions[topic];

          const callbacks = [...this.callbacks[topic]];
          delete this.callbacks[topic];
          callbacks.forEach(cb => this.subscribe(topic, cb));
        })

        const { onConnected = EMPTY } = this.options;
        onConnected();
        return;
      } catch (error) {
        console.error(error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  public subscribe<T>(topic: string, cb: OnMessageCallback<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.callbacks[topic] = this.callbacks[topic] = [];
        this.callbacks[topic].push(cb);

        this.subscriptions[topic] = this.subscriptions[topic] = [];
        this.subscriptions[topic].push(
          this.messagesFrom(topic)
            .subscribe(v => cb(v.value as any)));

        return resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  public unsubscribe(topic: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connection) return reject(new Error('unsubscribe failed: no connection found'));

      return this.connection.unsubscribe(topic, null, (err) => err ? reject() : resolve());
    });
  }

  public sendMessage(topic: string, message: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connection) return reject(new Error('send message failed: no connection found'));

      this.connection.publish(topic, Utils.toBuffer(message), { qos: 1, retain: false });
      return resolve();
    });
  }

  public openCloudMonitor<T>(deviceId: string, cb: OnMessageCallback<T>): Promise<void> {
    return this.subscribe(`/a/d/${deviceId}/s/o`, cb);
  }

  public writeCloudMonitor(deviceId: string, message: ArrayBuffer): Promise<void> {
    return this.sendMessage(`/a/d/${deviceId}/s/i`, message);
  }

  public closeCloudMonitor<T>(deviceId: string): Promise<void> {
    return this.unsubscribe(`/a/d/${deviceId}/s/o`);
  }

  public async sendProperty<T>(thingId: string, name: string, value: T, timestamp: number): Promise<void> {
    if (timestamp && !Number.isInteger(timestamp)) throw new Error('Timestamp must be Integer');
    if (name === undefined || typeof name !== 'string') throw new Error('Name must be a valid string');

    const topic = `/a/t/${thingId}/e/i`;
    if (Utils.isObject(value)) return this.sendObjectProperty(topic, value, timestamp);

    let cborValue = this.CBORFrom(value, name, timestamp);
    if (this.options.useCloudProtocolV2) cborValue = Utils.toCloudProtocolV2(cborValue);
    return this.sendMessage(topic, CBOR.encode([cborValue], true));
  }

  public async onPropertyValue<T>(thingId: string, name: string, cb: OnMessageCallback<T>): Promise<void> {
    if (!name) throw new Error('Invalid property name');
    if (typeof cb !== 'function') throw new Error('Invalid callback');

    const topic = `/a/t/${thingId}/e/o`;

    this.callbacks[topic] = this.callbacks[topic] = [];
    this.subscriptions[topic] = this.subscriptions[topic] = [];

    this.callbacks[topic].push(cb);
    this.subscriptions[topic].push(
      this.messagesFrom(topic)
        .pipe(filter(v => v.propertyName === name))
        .subscribe(v => cb(v.value as any)));
  }

  private messagesFrom(topic: string): Observable<CloudMessage> {
    if (!this.connection) throw new Error('subscription failed: no connection found');

    let subscription: Subscription;
    const subject = new Subject<CloudMessage>();

    this.connection.subscribe(topic, (err) => {
      if (err) throw new Error(`subscription failed: ${err.toString()}`);

      subscription = this.connection.messages
        .pipe(filter(v => v.topic === topic))
        .subscribe(v => subject.next(v));
    });

    const originalMethod = subject.unsubscribe;
    subject.unsubscribe = () => {

      subscription.unsubscribe();
      originalMethod();
    }
    return subject;
  }

  private CBORFrom(value: any, name: string, timestamp: number): CBOR.CBORValue {
    const parsed: CBOR.CBORValue = {
      n: name,
      bt: timestamp !== -1 ? (timestamp || new Date().getTime()) : undefined,
    };

    if (Utils.isNumber(value)) parsed.v = value;
    if (Utils.isString(value)) parsed.vs = value;
    if (Utils.isBoolean(value)) parsed.vb = value;

    return parsed;
  }

  private async sendObjectProperty(topic: string, value: object, timestamp: number) {
    const values: CBOR.CBORValue[] = Object.keys(value)
      .map((key, i) => this.CBORFrom(value[key], `${name}:${key}`, i === 0 ? timestamp : -1))
      .map((cborValue) => this.options.useCloudProtocolV2 ? Utils.toCloudProtocolV2(cborValue) : cborValue);

    return this.sendMessage(topic, CBOR.encode(values, true));
  }


  getSenml(deviceId, name, value, timestamp) {
    if (timestamp && !Number.isInteger(timestamp)) {
      throw new Error('Timestamp must be Integer');
    }

    if (name === undefined || typeof name !== 'string') {
      throw new Error('Name must be a valid string');
    }


    if (typeof value === 'object') {
      const objectKeys = Object.keys(value);
      const senMls: any[] = objectKeys.map((key, i) => {
        const senMl: any = {
          n: `${name}:${key}`,
        };

        if (i === 0) {
          senMl.bt = timestamp || new Date().getTime();

          if (deviceId) {
            senMl.bn = `urn:uuid:${deviceId}`;
          }
        }

        switch (typeof value[key]) {
          case 'string':
            senMl.vs = value[key];
            break;
          case 'number':
            senMl.v = value[key];
            break;
          case 'boolean':
            senMl.vb = value[key];
            break;
          default:
            break;
        }

        return senMl;
      })
        .map((senMl) => {
          if (this.options.useCloudProtocolV2) {
            return Utils.toCloudProtocolV2(senMl);
          }

          return senMl;
        });

      return senMls;
    }

    const senMl: any = {
      bt: timestamp || new Date().getTime(),
      n: name,
    };

    if (deviceId) {
      senMl.bn = `urn:uuid:${deviceId}`;
    }

    switch (typeof value) {
      case 'string':
        senMl.vs = value;
        break;
      case 'number':
        senMl.v = value;
        break;
      case 'boolean':
        senMl.vb = value;
        break;
      default:
        break;
    }

    if (this.options.useCloudProtocolV2) {
      return Utils.toCloudProtocolV2(senMl);
    }

    return senMl;
  };

  getCborValue(senMl) {
    const cborEncoded = CBOR.encode(senMl);
    return this.arrayBufferToBase64(cborEncoded);
  };

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };
}
