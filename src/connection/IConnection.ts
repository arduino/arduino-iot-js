import * as mqtt from 'mqtt';
import { Observable } from 'rxjs';
import { CloudMessageValue } from '../client/ICloudClient';

export type ConnectionOptions = mqtt.IClientOptions;
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
  reconnect(opts?: mqtt.IClientReconnectOptions): IConnection;
  connect(options?: Partial<ConnectionOptions>): Promise<boolean>;
  end(force?: boolean, opts?: Record<string, any>, cb?: mqtt.CloseCallback): IConnection;
  unsubscribe(topic: string | string[], opts?: Record<string, any>, callback?: mqtt.PacketCallback): IConnection;

  publish(
    topic: string,
    message: string | Buffer,
    opts: mqtt.IClientPublishOptions,
    callback?: mqtt.PacketCallback
  ): IConnection;
  publish(topic: string, message: string | Buffer, callback?: mqtt.PacketCallback): IConnection;
  publish(topic: any, message: any, opts?: any, callback?: any): IConnection;
}

export interface ITokenConnection extends IConnection {
  getToken(): string;
  updateToken(newToken: string): Promise<void>;
}
