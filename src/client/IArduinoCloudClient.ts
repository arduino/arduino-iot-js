import { Connection } from "../connection/Connection";

export type ConnectionOptions = {
  host?: string;
  port?: string | number;
  ssl?: boolean;
  token: string;
  apiUrl?: string;
  onOffline?: () => void;
  onConnected?: () => void;
  useCloudProtocolV2?: boolean;
  onDisconnect?: (message?: any) => void;
};

export type OnMessageCallback<T> = (message: T) => void;

export interface IArduinoCloudClient {
  connect(options: ConnectionOptions): Promise<Connection>;
  reconnect(): Promise<void>;
  disconnect(): Promise<void>;
  updateToken(newToken: string): Promise<void>;

  subscribe<T>(topic: string, cb: OnMessageCallback<T>): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  sendMessage(topic: string, message: ArrayBuffer): Promise<void>;

  openCloudMonitor<T>(deviceId: string, cb: OnMessageCallback<T>): Promise<void>;
  writeCloudMonitor(deviceId: string, message: ArrayBuffer): Promise<void>;
  closeCloudMonitor(deviceId: string): Promise<void>;

  sendProperty<T>(thingId: string, name: string, value: T, timestamp: number): Promise<void>;
  onPropertyValue<T>(thingId: string, name: string, cb: OnMessageCallback<T>): Promise<void>;
}