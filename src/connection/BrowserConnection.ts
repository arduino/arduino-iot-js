import jws from 'jws';

import { Connection } from "./Connection";
import { IConnection } from "./IConnection";
import { BrowserOptions } from "../client/IArduinoCloudClient";

export namespace BrowserConnection {
  export async function From(host: string, port: string | number, { token }: BrowserOptions): Promise<IConnection> {
    if (!token) throw new Error('connection failed: you need to provide a valid token');
    if (!host) throw new Error('connection failed: you need to provide a valid host (broker)');

    const userId = jws.decode(token).payload['http://arduino.cc/id'];
    const options = {
      clientId: `${userId}:${new Date().getTime()}`,
      username: userId,
      password: token,
    };

    return Connection.From(`wss://${host}:${port}/mqtt`, options);
  }
}
