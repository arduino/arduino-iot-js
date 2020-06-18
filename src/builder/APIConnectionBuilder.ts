import { IHttpClient } from '../http/IHttpClient';
import { Connection } from '../connection/Connection';
import { IConnection } from '../connection/IConnection';
import { IConnectionBuilder } from './IConnectionBuilder';
import { APIOptions, CloudOptions, BaseCloudOptions } from '../client/ICloudClient';

type AccessResponse = {
  access_token: string;
  expires_in: string;
  token_type: string;
};

export class APIConnectionBuilder implements IConnectionBuilder {
  constructor(private client: IHttpClient) {}

  public canBuild(options: CloudOptions): boolean {
    return isApiOptions(options);
  }

  public async build(options: APIOptions & BaseCloudOptions): Promise<IConnection> {
    const { apiUrl = 'https://api2.arduino.cc/iot/v1/clients/token' } = options;
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };

    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', options.clientId);
    body.append('client_secret', options.clientSecret);
    body.append('audience', options.audience || 'https://api2.arduino.cc/iot');

    const { access_token } = await this.client.post<AccessResponse>(apiUrl, body, headers);
    return Connection.From(options.host, options.port, access_token);
  }
}

function isApiOptions(options: CloudOptions): options is APIOptions {
  return !!(options as APIOptions).clientId;
}
