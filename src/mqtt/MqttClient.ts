/** A generic MQTT client callback (event handler or operation completion). */
export type MqttCallback = (...args: unknown[]) => void;

/** Completion callback of `publish`: called with the error when the publish failed. */
export type MqttPublishCallback = (error?: Error) => void;

/**
 * Minimal contract the transport needs from an MQTT client. The standard
 * `mqtt` library satisfies it; provide your own (e.g. for React Native) via
 * `createArduinoCloud({ mqttConnect })`.
 */
export interface MqttClient {
  /** Whether the client is currently connected. Read to avoid missing an
   * already-fired `connect` event when `mqttConnect` resolves post-connection. */
  readonly connected: boolean;

  on(event: 'message', cb: (topic: string, payload: Buffer) => void): MqttClient;
  on(event: 'error', cb: (error: Error) => void): MqttClient;
  on(event: string, cb: MqttCallback): MqttClient;

  once(event: string, cb: MqttCallback): MqttClient;

  /** `callback` must be called once the publish settles (the broker's ack at QoS 1), with the error if it failed. */
  publish(topic: string, message: string | Buffer, opts: object, callback?: MqttPublishCallback): MqttClient;
  publish(topic: string, message: string | Buffer, callback?: MqttPublishCallback): MqttClient;

  end(force?: boolean, opts?: object, cb?: MqttCallback): MqttClient;

  subscribe(topic: string | string[], opts?: object, callback?: MqttCallback): MqttClient;

  unsubscribe(topic: string | string[], opts?: object, callback?: MqttCallback): MqttClient;
}
