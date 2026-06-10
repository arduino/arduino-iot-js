import mqtt from 'mqtt';

import * as Utils from './utils';
import { MqttOptions } from './transport/types';
import { MqttConnectFn, MqttTransport } from './transport/MqttTransport';
import { UserConnection } from './connection/UserConnection';
import { DeviceConnection } from './connection/DeviceConnection';
import {
  APIOptions,
  CloudOptions,
  ConnectOptions,
  CredentialsOptions,
  DEFAULTS,
  TokenOptions,
} from './options';

const DEFAULT_AUDIENCE = 'https://api2.arduino.cc/iot';
const DEFAULT_TOKEN_URL = 'https://api2.arduino.cc/iot/v1/clients/token';

type FetchFn = typeof fetch;

/** Pluggable dependencies, e.g. a custom MQTT client for React Native. */
export type ArduinoCloudDeps = {
  mqttConnect?: MqttConnectFn;
  fetch?: FetchFn;
};

type AccessTokenResponse = { access_token: string };

const isCredentials = (o: ConnectOptions): o is CredentialsOptions & CloudOptions =>
  !!(o as CredentialsOptions).secretKey;
const isToken = (o: ConnectOptions): o is TokenOptions & CloudOptions => !!(o as TokenOptions).token;
const isAPI = (o: ConnectOptions): o is APIOptions & CloudOptions => !!(o as APIOptions).clientId;

/**
 * Build an entry point bound to a set of dependencies. The default
 * `ArduinoIoTCloud` export is `createArduinoCloud()`; pass `{ mqttConnect }` (or
 * `{ fetch }`) to swap the underlying implementations.
 */
export function createArduinoCloud(deps: ArduinoCloudDeps = {}) {
  const mqttConnect = deps.mqttConnect ?? (mqtt.connect as unknown as MqttConnectFn);
  const doFetch = deps.fetch ?? fetch;

  function connect(options: CredentialsOptions & CloudOptions): Promise<DeviceConnection>;
  function connect(options: (TokenOptions | APIOptions) & CloudOptions): Promise<UserConnection>;
  async function connect(options: ConnectOptions): Promise<UserConnection | DeviceConnection> {
    const opts = { ...DEFAULTS, ...options };

    if (isCredentials(opts)) return connectDevice(opts);
    if (isToken(opts)) return connectUser(opts.token, opts);
    if (isAPI(opts)) return connectUser(await exchangeToken(opts), opts);

    throw new Error('connect failed: options not valid');
  }

  async function connectDevice(opts: CredentialsOptions & CloudOptions): Promise<DeviceConnection> {
    const url = `mqtts://mqtts-up.${opts.host}:${opts.port || 8884}`;
    const transport = new MqttTransport(url, credentials(opts.deviceId, opts.secretKey), mqttConnect);
    await transport.connect();
    return DeviceConnection.resolve(transport, opts, opts.deviceId);
  }

  async function connectUser(token: string, opts: CloudOptions): Promise<UserConnection> {
    const url = `wss://wss.${opts.host}:${opts.port || 8443}/mqtt`;
    const username = Utils.decode(token)['http://arduino.cc/id'];
    const transport = new MqttTransport(url, credentials(username, token), mqttConnect);
    await transport.connect();
    return new UserConnection(transport, opts, token);
  }

  async function exchangeToken(opts: APIOptions & CloudOptions): Promise<string> {
    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', opts.clientId);
    body.append('client_secret', opts.clientSecret);
    body.append('audience', opts.audience || DEFAULT_AUDIENCE);

    const response = await doFetch(opts.apiUrl || DEFAULT_TOKEN_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) throw new Error(`connect failed: token exchange returned ${response.status}`);
    const { access_token: accessToken }: AccessTokenResponse = await response.json();
    return accessToken;
  }

  return { connect };
}

function credentials(username: string, password: string): MqttOptions {
  return { username, password, clientId: username };
}
