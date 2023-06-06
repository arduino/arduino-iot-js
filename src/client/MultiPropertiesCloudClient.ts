import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import { BaseCloudClient } from './BaseCloudClient';
import { ITokenConnection } from '../connection/IConnection';
import { OnMessageCallback, CloudMessageValue, IMultiPropertiesCloudClient, ITokenCloudClient } from './ICloudClient';

export type PropertyCallbacks = { cb: OnMessageCallback<any>; name: string; thingId: string };

// eslint-disable-next-line prettier/prettier
export class MultiPropertiesCloudClient
  extends BaseCloudClient<ITokenConnection>
  implements IMultiPropertiesCloudClient, ITokenCloudClient {
  private subscriptions: { [key: string]: Subscription[] } = {};
  private propertiesCbs: { [key: string]: PropertyCallbacks[] } = {};
  private callbacks: { [key: string]: OnMessageCallback<any>[] } = {};

  public async disconnect(): Promise<void> {
    await super.disconnect();

    Object.values(this.subscriptions).forEach((subs, topic) => {
      subs.forEach((sub) => sub.unsubscribe());
      delete this.callbacks[topic];
      delete this.propertiesCbs[topic];
      delete this.subscriptions[topic];
    });
  }

  public getToken(): string {
    return this.connection.getToken();
  }

  public updateToken(newToken: string): Promise<void> {
    return this.connection.updateToken(newToken);
  }

  public sendProperty(thingId: string, name: string, value: CloudMessageValue, tmp?: number): Promise<void> {
    return super._sendProperty(`/a/t/${thingId}/e/i`, name, value, tmp);
  }

  public onPropertyValue<T extends CloudMessageValue>(thingId: string, name: string, cb: OnMessageCallback<T>): void {
    if (!name) throw new Error('Invalid property name');
    if (typeof cb !== 'function') throw new Error('Invalid callback');

    const topic = `/a/t/${thingId}/e/o`;

    this.propertiesCbs[topic] = this.propertiesCbs[topic] || [];
    this.subscriptions[topic] = this.subscriptions[topic] || [];

    this.propertiesCbs[topic].push({ thingId, name, cb });
    this.subscriptions[topic].push(
      this.observe(topic)
        .pipe(filter((v) => v.propertyName === name))
        .subscribe((v) => cb(v.value as T))
    );
  }
}
