import { Observable } from 'rxjs';
import {
  IClientOptions,
  OnConnectCallback,
  OnMessageCallback,
  OnPacketCallback,
  OnErrorCallback,
  CloseCallback,
  IClientReconnectOptions,
  PacketCallback,
  IClientPublishOptions,
} from 'mqtt';

import { CloudMessageValue } from '../client/ICloudClient';

export type ConnectionOptions = IClientOptions;
export type CloudMessage = {
  topic: string;
  propertyName?: string;
  value: CloudMessageValue;
};

export interface IConnection {
  token?: string;
  messages?: Observable<CloudMessage>;

  on(event: 'connect', cb: OnConnectCallback): IConnection;
  on(event: 'message', cb: OnMessageCallback): IConnection;
  on(event: 'packetsend' | 'packetreceive', cb: OnPacketCallback): IConnection;
  on(event: 'error', cb: OnErrorCallback): IConnection;
  on(event: string, cb: Function): IConnection;
  on(event: any, cb: any): IConnection;

  end(force?: boolean, opts?: Record<string, any>, cb?: CloseCallback): IConnection;

  reconnect(opts?: IClientReconnectOptions): IConnection;

  unsubscribe(topic: string | string[], opts?: Record<string, any>, callback?: PacketCallback): IConnection;

  publish(topic: string, message: string | Buffer, opts: IClientPublishOptions, callback?: PacketCallback): IConnection;
  publish(topic: string, message: string | Buffer, callback?: PacketCallback): IConnection;
  publish(topic: any, message: any, opts?: any, callback?: any): IConnection;

  subscribe(topic: any, callback?: any): IConnection;
}
