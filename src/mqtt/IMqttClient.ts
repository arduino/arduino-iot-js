import { ConnectionOptions } from '../connection/IConnection';

export interface IMqttClient {
  on(event: 'error', cb: (error: Error) => void): IMqttClient;
  on(event: string, cb: Function): IMqttClient;

  publish(topic: string, message: string | Buffer, opts: object, callback?: Function): IMqttClient;
  publish(topic: string, message: string | Buffer, callback?: Function): IMqttClient;

  end(force?: boolean, opts?: object, cb?: Function): IMqttClient;

  subscribe(topic: string | string[], opts?: object, callback?: Function): IMqttClient;

  reconnect(opts?: object): IMqttClient;
}

export type MqttConnect = (url: string, options: ConnectionOptions) => IMqttClient | Promise<IMqttClient>;
