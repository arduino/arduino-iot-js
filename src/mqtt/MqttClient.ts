/**
 * Minimal contract the transport needs from an MQTT client. The standard
 * `mqtt` library satisfies it; provide your own (e.g. for React Native) via
 * `createArduinoCloud({ mqttConnect })`.
 */
export interface MqttClient {
  on(event: 'error', cb: (error: Error) => void): MqttClient;
  on(event: string, cb: Function): MqttClient;

  once(event: 'error', cb: (error: Error) => void): MqttClient;
  once(event: string, cb: Function): MqttClient;

  publish(topic: string, message: string | Buffer, opts: object, callback?: Function): MqttClient;
  publish(topic: string, message: string | Buffer, callback?: Function): MqttClient;

  end(force?: boolean, opts?: object, cb?: Function): MqttClient;

  subscribe(topic: string | string[], opts?: object, callback?: Function): MqttClient;

  unsubscribe(topic: string | string[], opts?: object, callback?: Function): MqttClient;

  reconnect(opts?: object): MqttClient;
}
