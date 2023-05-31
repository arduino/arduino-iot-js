import { CloudOptions } from '../CloudOptions';
import { Connection } from '../connection/Connection';
import { ITokenConnection } from '../connection/IConnection';
import { IMultiPropertiesCloudClient } from '../client/ICloudClient';
import { ICloudClientBuilder, MqttConnection } from './ICloudClientBuilder';
import { MultiPropertiesCloudClient } from '../client/MultiPropertiesCloudClient';

export type BrowserOptions = { token: string };

export class TokenClientBuilder implements ICloudClientBuilder {
  constructor(private mqttConnect: MqttConnection) {}

  public canBuild(options: BrowserOptions & CloudOptions): boolean {
    return !!(options as BrowserOptions).token;
  }

  public async build(options: BrowserOptions & CloudOptions): Promise<IMultiPropertiesCloudClient> {
    const connection = await this.connection(options);
    return new MultiPropertiesCloudClient(connection, options);
  }

  private async connection({ host, port, token }: BrowserOptions & CloudOptions): Promise<ITokenConnection> {
    const connection = new Connection.WithToken(`wss://wss.${host}:${port || 8443}/mqtt`, token, this.mqttConnect);
    await connection.connect();
    return connection;
  }
}

declare global {
  interface IArduinoIoTCloudFactory {
    connect(options: BrowserOptions & Partial<CloudOptions>): Promise<IMultiPropertiesCloudClient>;
  }
}
