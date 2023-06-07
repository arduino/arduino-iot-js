import { CloudOptions } from '../CloudOptions';
import { Connection } from '../connection/Connection';
import { IConnection } from '../connection/IConnection';
import { ISinglePropertyCloudClient } from '../client/ICloudClient';
import { ICloudClientBuilder, MqttConnection } from './ICloudClientBuilder';
import { SinglePropertyCloudClient } from '../client/SinglePropertyCloudClient';

export type CredentialsOptions = { deviceId: string; secretKey: string };

export class CredentialsClientBuilder implements ICloudClientBuilder {
  constructor(private mqttConnect: MqttConnection) {}

  public canBuild(options: CredentialsOptions & CloudOptions): boolean {
    return !!(options as CredentialsOptions).secretKey;
  }

  public async build(options: CredentialsOptions & CloudOptions): Promise<ISinglePropertyCloudClient> {
    const connection = await this.connection(options);
    const client = new SinglePropertyCloudClient(connection, options, `/a/d/${options.deviceId}/e/i`);
    return client.getThing().then(() => client);
  }

  private async connection(options: CredentialsOptions & CloudOptions): Promise<IConnection> {
    const host = `mqtts://mqtts-up.${options.host}:${options.port || 8884}`;
    const connection = new Connection(host, options.deviceId, options.secretKey, this.mqttConnect);
    await connection.connect();
    return connection;
  }
}

declare global {
  interface IArduinoIoTCloudFactory {
    connect(options: CredentialsOptions & Partial<CloudOptions>): Promise<ISinglePropertyCloudClient>;
  }
}
