import { IConnection } from '../connection/IConnection';
import { CloudOptions } from '../client/ICloudClient';

export interface IConnectionBuilder {
  canBuild(options: CloudOptions): boolean;
  build(options: CloudOptions): Promise<IConnection>;
}
