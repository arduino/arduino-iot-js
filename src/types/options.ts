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
  /** Called with the error of each failed (re)connect attempt — including
   * credential/token-exchange failures, which emit no socket event. The
   * transport keeps retrying; react here (e.g. `close()` on a permanent error). */
  onError?: (error: unknown) => void;
};

/** Supplies a JWT on demand. Called on connect and again on every reconnect,
 * so an expiring token can be refreshed and the connection re-authenticated. */
export type TokenProvider = () => Promise<string>;

/**
 * Connect as a user with a JWT. Pass a {@link TokenProvider} (recommended) so the
 * library can refresh the token on reconnect; a static string also works but
 * will not be refreshed, so the session ends when that token expires.
 */
export type TokenOptions = { token: string | TokenProvider };

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
