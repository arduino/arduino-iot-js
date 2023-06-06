export type CloudOptions = {
  host?: string;
  port?: string | number;
  useCloudProtocolV2?: boolean;
  onOffline?: () => void;
  onConnected?: () => void;
  onDisconnect?: (message?: any) => void;
};

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace CloudOptions {
  const NOOP = () => null;

  export const DEFAULT: CloudOptions = {
    host: 'iot.arduino.cc',
    useCloudProtocolV2: true,
    onOffline: NOOP,
    onConnected: NOOP,
    onDisconnect: NOOP,
  };
}
