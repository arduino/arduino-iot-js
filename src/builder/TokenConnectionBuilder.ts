import { Connection } from '../connection/Connection';
import { IConnection } from '../connection/IConnection';
import { IConnectionBuilder } from './IConnectionBuilder';
import { BrowserOptions, CloudOptions, BaseCloudOptions } from '../client/ICloudClient';

export class TokenConnectionBuilder implements IConnectionBuilder {
  canBuild(options: CloudOptions): boolean {
    return !!(options as BrowserOptions).token;
  }

  build({ host, port, token }: BrowserOptions & BaseCloudOptions): Promise<IConnection> {
    return Connection.From(host, port, token);
  }
}
