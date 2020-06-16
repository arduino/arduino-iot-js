import jws from 'jws';
import rp from "request-promise";

import { Connection } from "./Connection";
import { IConnection } from "./IConnection";
import { APIOptions } from "../client/IArduinoCloudClient";

type AccessResponse = {
  "access_token": string;
  "expires_in": string;
  "token_type": string;
}

export namespace APIConnection {
  export function From(host: string, port: string | number, options: APIOptions): Promise<IConnection> {
    const data = {
      method: 'POST',
      url: options.apiUrl,
      headers: {
        'content-type': 'application/x-www-form-urlencoded'
      },
      form: {
        grant_type: 'client_credentials',
        client_id: options.clientId,
        client_secret: options.clientSecret,
        audience: options.audience || 'https://api2.arduino.cc/iot',
      }
    };

    return rp(data)
      .then((req: AccessResponse) => {
        const token = req.access_token;
        const userId = jws.decode(token).payload['http://arduino.cc/id'];
        const options = {
          clientId: `${userId}:${new Date().getTime()}`,
          username: userId,
          password: token,
        };
        return Connection.From(`wss://${host}:${port}/mqtt`, options);
      });
  }
}