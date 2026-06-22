import * as Utils from './utils';
import { CredentialsProvider, MqttConnectFn, MqttCredentials, MqttTransport } from './transport/MqttTransport';
import { UserConnection } from './connection/UserConnection';
import { DeviceConnection } from './connection/DeviceConnection';
import {
  APIOptions,
  CloudOptions,
  ConnectOptions,
  CredentialsOptions,
  TokenOptions,
  TokenProvider,
} from './types/options';

const DEFAULT_AUDIENCE = 'https://api2.arduino.cc/iot';
const DEFAULT_TOKEN_URL = 'https://api2.arduino.cc/iot/v1/clients/token';

const NOOP = (): void => undefined;
const DEFAULTS: CloudOptions = {
  host: 'iot.arduino.cc',
  useCloudProtocolV2: true,
  onOffline: NOOP,
  onConnected: NOOP,
  onDisconnect: NOOP,
};

type FetchFn = typeof fetch;

/** Injected dependencies. `mqttConnect` is required so the library stays
 * transport-agnostic and never bundles `mqtt` (important for React Native). */
export type ArduinoCloudDeps = {
  mqttConnect: MqttConnectFn;
  fetch?: FetchFn;
};

type AccessTokenResponse = { access_token: string };

const isCredentials = (o: ConnectOptions): o is CredentialsOptions & CloudOptions =>
  !!(o as CredentialsOptions).secretKey;
const isToken = (o: ConnectOptions): o is TokenOptions & CloudOptions => !!(o as TokenOptions).token;
const isAPI = (o: ConnectOptions): o is APIOptions & CloudOptions => !!(o as APIOptions).clientId;

/**
 * Build an entry point bound to a set of dependencies. The MQTT client is
 * injected via `mqttConnect` (e.g. `mqtt`'s `connect` on Node/web, or a custom
 * client on React Native) so the library never imports `mqtt` itself.
 */
export function createArduinoCloud(deps: ArduinoCloudDeps) {
  const mqttConnect = deps.mqttConnect;
  const doFetch = deps.fetch ?? fetch;

  function connect(options: CredentialsOptions & CloudOptions): Promise<DeviceConnection>;
  function connect(options: (TokenOptions | APIOptions) & CloudOptions): Promise<UserConnection>;
  async function connect(options: ConnectOptions): Promise<UserConnection | DeviceConnection> {
    const opts = { ...DEFAULTS, ...options };

    if (isCredentials(opts)) return connectDevice(opts);
    if (isToken(opts)) return connectUser(tokenCredentials(opts.token), opts);
    if (isAPI(opts)) return connectUser(apiCredentials(opts), opts);

    throw new Error('connect failed: options not valid');
  }

  async function connectDevice(opts: CredentialsOptions & CloudOptions): Promise<DeviceConnection> {
    const url = `mqtts://mqtts-up.${opts.host}:${opts.port || 8884}`;
    // Device credentials are static — the provider just hands them back.
    const credentials: CredentialsProvider = () =>
      Promise.resolve({ username: opts.deviceId, password: opts.secretKey, clientId: opts.deviceId });
    const transport = new MqttTransport(url, credentials, mqttConnect);
    await transport.connect();
    return DeviceConnection.resolve(transport, opts, opts.deviceId);
  }

  async function connectUser(credentials: CredentialsProvider, opts: CloudOptions): Promise<UserConnection> {
    const url = `wss://wss.${opts.host}:${opts.port || 8443}/mqtt`;
    const transport = new MqttTransport(url, credentials, mqttConnect);
    await transport.connect();
    return new UserConnection(transport, opts);
  }

  /** Wrap a user-supplied token (static or a getter) as a credentials provider. */
  function tokenCredentials(token: string | TokenProvider): CredentialsProvider {
    const getToken: TokenProvider = typeof token === 'function' ? token : () => Promise.resolve(token);
    return async () => credentialsFromToken(await getToken());
  }

  /** Re-runs the OAuth exchange on every (re)connect, yielding a fresh JWT. */
  function apiCredentials(opts: APIOptions & CloudOptions): CredentialsProvider {
    return async () => credentialsFromToken(await exchangeToken(opts));
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
    const { access_token: accessToken } = (await response.json()) as AccessTokenResponse;
    return accessToken;
  }

  return { connect };
}

/** Derive MQTT credentials from a JWT: username is the user id claim, password the token. */
function credentialsFromToken(token: string): MqttCredentials {
  const payload = Utils.decode(token) as { 'http://arduino.cc/id': string };
  const username = payload['http://arduino.cc/id'];
  return { username, password: token, clientId: username };
}
