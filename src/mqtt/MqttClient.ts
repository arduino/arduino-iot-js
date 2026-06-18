/** A generic MQTT client callback (event handler or operation completion). */
export type MqttCallback = (...args: unknown[]) => void;

/**
 * Minimal contract the transport needs from an MQTT client. The standard
 * `mqtt` library satisfies it; provide your own (e.g. for React Native) via
 * `createArduinoCloud({ mqttConnect })`.
 */
export interface MqttClient {
  on(event: 'error', cb: (error: Error) => void): MqttClient;
  on(event: string, cb: MqttCallback): MqttClient;

  once(event: string, cb: MqttCallback): MqttClient;

  publish(topic: string, message: string | Buffer, opts: object, callback?: MqttCallback): MqttClient;
  publish(topic: string, message: string | Buffer, callback?: MqttCallback): MqttClient;

  end(force?: boolean, opts?: object, cb?: MqttCallback): MqttClient;

  subscribe(topic: string | string[], opts?: object, callback?: MqttCallback): MqttClient;

  unsubscribe(topic: string | string[], opts?: object, callback?: MqttCallback): MqttClient;

  reconnect(opts?: object): MqttClient;
}
