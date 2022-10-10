import { IConnection } from '../connection/IConnection';

export type BaseCloudOptions = {
  host?: string;
  port?: string | number;
  ssl?: boolean;
  onOffline?: () => void;
  onConnected?: () => void;
  onDisconnect?: (message?: any) => void;
  useCloudProtocolV2?: boolean;
};

export type BrowserOptions = {
  token: string;
};

export type APIOptions = {
  apiUrl?: string;
  clientId: string;
  audience?: string;
  clientSecret: string;
};

export type CloudOptions = (BrowserOptions | APIOptions) & BaseCloudOptions;

export function isBrowserOptions(options: CloudOptions): options is BrowserOptions {
  return !!(options as BrowserOptions).token;
}

export type CloudMessageValue = string | number | boolean | object;
export type OnMessageCallback<T extends CloudMessageValue> = (message: T) => void;

export interface ICloudClient {
  connect(options: CloudOptions): Promise<IConnection>;
  reconnect(): Promise<void>;
  disconnect(): Promise<void>;

  getToken(): string;
  updateToken(newToken: string): Promise<void>;

  sendMessage(topic: string, message: string): Promise<void>;
  sendMessage(topic: string, message: ArrayBuffer): Promise<void>;

  sendProperty<T extends CloudMessageValue>(thingId: string, name: string, value: T, timestamp?: number): Promise<void>;
  onPropertyValue<T extends CloudMessageValue>(thingId: string, name: string, cb: OnMessageCallback<T>): Promise<void>;
}
