import { CloudOptions } from '../CloudOptions';
import { APIOptions } from './APIClientBuilder';
import { BrowserOptions } from './TokenClientBuilder';
import { CredentialsOptions } from './CredentialsClientBuilder';
import { IMultiPropertiesCloudClient, ISinglePropertyCloudClient } from '../client/ICloudClient';

export type CloudFactoryOptions = (APIOptions | CredentialsOptions | BrowserOptions) & Partial<CloudOptions>;

export interface IArduinoIoTCloudFactory {
  connect(options: APIOptions & Partial<CloudOptions>): Promise<IMultiPropertiesCloudClient>;
  connect(options: BrowserOptions & Partial<CloudOptions>): Promise<IMultiPropertiesCloudClient>;
  connect(options: CredentialsOptions & Partial<CloudOptions>): Promise<ISinglePropertyCloudClient>;
}
