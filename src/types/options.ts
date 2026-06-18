/**
 * Options common to every connection, regardless of the credentials used.
 * The credential-specific shapes and the discriminated `ConnectOptions` union
 * live alongside `connect()` (added in a later step).
 */
export type CloudOptions = {
  host?: string;
  port?: string | number;
  useCloudProtocolV2?: boolean;
  ssl?: boolean;
  onOffline?: () => void;
  onConnected?: () => void;
  onDisconnect?: (message?: unknown) => void;
};

/** Connect as a user with a pre-obtained JWT. */
export type TokenOptions = { token: string };

/** Connect as a single device using its credentials. */
export type CredentialsOptions = { deviceId: string; secretKey: string };

/** Connect as a user via API credentials; exchanged for a JWT at connect time. */
export type APIOptions = {
  clientId: string;
  clientSecret: string;
  apiUrl?: string;
  audience?: string;
};

/** Everything `connect()` accepts: shared options plus exactly one credential set. */
export type ConnectOptions = CloudOptions & (TokenOptions | CredentialsOptions | APIOptions);

const NOOP = (): void => undefined;

export const DEFAULTS: CloudOptions = {
  host: 'iot.arduino.cc',
  useCloudProtocolV2: true,
  onOffline: NOOP,
  onConnected: NOOP,
  onDisconnect: NOOP,
};
