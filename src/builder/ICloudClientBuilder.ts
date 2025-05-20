import mqtt from 'mqtt';

import { CloudOptions } from '../CloudOptions';
import { ICloudClient } from '../client/ICloudClient';

export type MqttConnection = typeof mqtt.connect;

export interface ICloudClientBuilder<T extends CloudOptions = CloudOptions, P extends ICloudClient = ICloudClient> {
  canBuild(options: T): boolean;
  build(options: T): Promise<P>;
}
