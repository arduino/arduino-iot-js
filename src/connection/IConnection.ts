import { Observable } from 'rxjs';

import { CloudMessageValue } from '../client/ICloudClient';

export type ConnectionOptions = {
  port?: number;
  host?: string;
  hostname?: string;
  path?: string;
  protocol?: 'wss' | 'ws' | 'mqtt' | 'mqtts' | 'tcp' | 'ssl' | 'wx' | 'wxs';
  wsOptions?: object;
  keepalive?: number;
  clientId?: string;
  protocolId?: string;
  protocolVersion?: number;
  clean?: boolean;
  reconnectPeriod?: number;
  connectTimeout?: number;
  username?: string;
  password?: string;
  queueQoSZero?: boolean;
  reschedulePings?: boolean;
  resubscribe?: boolean;
  properties?: object;
  servers?: object;
  will?: object;
};

export type CloudMessage = {
  topic: string;
  propertyName?: string;
  value: CloudMessageValue;
};

export interface IConnection {
  token?: string;
  messages?: Observable<CloudMessage>;

  on(event: 'error', cb: (error: Error) => void): IConnection;
  on(event: string, cb: Function): IConnection;

  end(force?: boolean, opts?: Record<string, any>, cb?: Function): IConnection;

  reconnect(opts?: object): IConnection;

  unsubscribe(topic: string | string[], opts?: Record<string, any>, callback?: Function): IConnection;

  publish(topic: string, message: string | Buffer, opts: object, callback?: Function): IConnection;
  publish(topic: string, message: string | Buffer, callback?: Function): IConnection;
  publish(topic: any, message: any, opts?: any, callback?: any): IConnection;

  subscribe(topic: any, callback?: any): IConnection;
}
