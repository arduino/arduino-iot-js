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

export const BaseConnectionOptions: Partial<ConnectionOptions> = {
  clean: true,
  keepalive: 30,
  properties: {},
  protocolVersion: 4,
  connectTimeout: 30000,
};

export interface IConnection {
  readonly messages?: Observable<CloudMessage>;

  subscribe(topic: any, callback?: any): IConnection;
  reconnect(opts?: object): IConnection;
  connect(options?: Partial<ConnectionOptions>): Promise<boolean>;
  end(force?: boolean, opts?: Record<string, any>, cb?: Function): IConnection;
  unsubscribe(topic: string | string[], opts?: Record<string, any>, callback?: Function): IConnection;

  publish(topic: string, message: string | Buffer, opts: object, callback?: Function): IConnection;
  publish(topic: string, message: string | Buffer, callback?: Function): IConnection;
  publish(topic: any, message: any, opts?: any, callback?: any): IConnection;
}

export interface ITokenConnection extends IConnection {
  getToken(): string;
  updateToken(newToken: string): Promise<void>;
}
