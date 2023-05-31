export type CloudMessageValue = string | number | boolean | object;
export type OnMessageCallback<T extends CloudMessageValue> = (message: T) => void;

export interface ICloudClient {
  reconnect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(topic: string, message: string | ArrayBuffer): Promise<void>;
}

export interface ISinglePropertyCloudClient extends ICloudClient {
  sendProperty<T extends CloudMessageValue>(name: string, value: T, tmp?: number): Promise<void>;
  onPropertyValue<T extends CloudMessageValue>(name: string, cb: OnMessageCallback<T>): void;
}

export interface IMultiPropertiesCloudClient extends ICloudClient {
  sendProperty<T extends CloudMessageValue>(thingId: string, name: string, value: T, tmp?: number): Promise<void>;
  onPropertyValue<T extends CloudMessageValue>(thingId: string, name: string, cb: OnMessageCallback<T>): void;
}

export interface ITokenCloudClient {
  getToken(): string;
  updateToken(newToken: string): Promise<void>;
}
