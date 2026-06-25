export type CloudMessageValue = string | number | boolean | object;

export type CloudMessage = {
  topic: string;
  propertyName?: string;
  value: CloudMessageValue;
};

export type MqttOptions = {
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

export const BaseConnectionOptions: Partial<MqttOptions> = {
  clean: true,
  keepalive: 30,
  properties: {},
  protocolVersion: 4,
  connectTimeout: 30000,
};
