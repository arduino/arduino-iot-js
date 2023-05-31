import { CloudOptions } from '../CloudOptions';
import { IHttpClient } from '../http/IHttpClient';
import { Connection } from '../connection/Connection';
import { ITokenConnection } from '../connection/IConnection';
import { IMultiPropertiesCloudClient } from '../client/ICloudClient';
import { ICloudClientBuilder, MqttConnection } from './ICloudClientBuilder';
import { MultiPropertiesCloudClient } from '../client/MultiPropertiesCloudClient';

type AccessResponse = {
  access_token: string;
  expires_in: string;
  token_type: string;
};

type APIOptions = {
  apiUrl?: string;
  clientId: string;
  audience?: string;
  clientSecret: string;
};

const DEFAULT_AUDIENCE = 'https://api2.arduino.cc/iot';
const DEFAULT_URL = 'https://api2.arduino.cc/iot/v1/clients/token';

export class APIClientBuilder implements ICloudClientBuilder {
  constructor(private client: IHttpClient, protected mqttConnect: MqttConnection) {}

  public canBuild(options: APIOptions & CloudOptions): boolean {
    return !!(options as APIOptions).clientId;
  }

  public async build(options: APIOptions & CloudOptions): Promise<IMultiPropertiesCloudClient> {
    const connection = await this.connection(options);
    return new MultiPropertiesCloudClient(connection, options);
  }

  private async connection(options: APIOptions & CloudOptions): Promise<ITokenConnection> {
    const { apiUrl = DEFAULT_URL } = options;
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };

    const body = new URLSearchParams();
    body.append('client_id', options.clientId);
    body.append('grant_type', 'client_credentials');
    body.append('client_secret', options.clientSecret);
    body.append('audience', options.audience || DEFAULT_AUDIENCE);

    const { access_token: accessToken } = await this.client.post<AccessResponse>(apiUrl, body, headers);
    const host = `wss://wss.${options.host}:${options.port || 8443}/mqtt`;
    const connection = new Connection.WithToken(host, accessToken, this.mqttConnect);
    await connection.connect();
    return connection;
  }
}
declare global {
  interface IArduinoIoTCloudFactory {
    connect(options: APIOptions & Partial<CloudOptions>): Promise<IMultiPropertiesCloudClient>;
  }
}
