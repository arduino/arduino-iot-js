import { Subscription } from 'rxjs';

import { CloudOptions } from '../CloudOptions';
import { BaseCloudClient } from './BaseCloudClient';
import { IConnection } from '../connection/IConnection';
import { OnMessageCallback, CloudMessageValue, ISinglePropertyCloudClient } from './ICloudClient';

export class SinglePropertyCloudClient extends BaseCloudClient implements ISinglePropertyCloudClient {
  private thingId: string;
  private subscription: Subscription;
  private propertiesCbs: { [key: string]: OnMessageCallback<any>[] } = {};

  private onThingRejection: (reason: any) => void;
  private onThingResponse: (value: string | PromiseLike<string>) => void;

  constructor(connection: IConnection, options: CloudOptions, private deviceTopic: string) {
    super(connection, options);
    this.observe(this.deviceTopic).subscribe(({ value }) => this.onThingIdReceived(value as string));
  }

  public async disconnect(): Promise<void> {
    await super.disconnect();

    this.propertiesCbs = {};
    this.subscription.unsubscribe();
  }

  private onThingIdReceived(thingId: string): void {
    if (!thingId) {
      if (this.onThingRejection) this.onThingRejection(new Error('Error: no thing associated'));
      return;
    }

    console.log('found association to thing:', thingId);
    this.thingId = thingId;
    if (this.onThingResponse) this.onThingResponse(thingId);
    this.subscription = this.observe(`/a/t/${this.thingId}/e/i`).subscribe((v) => {
      (this.propertiesCbs[v.propertyName] || []).forEach((cb) => cb(v.value));
    });
  }

  public async sendProperty(name: string, value: CloudMessageValue, tmp?: number): Promise<void> {
    if (!this.thingId) throw new Error('sendProperty failed: no thing associated');

    return super._sendProperty(`/a/t/${this.thingId}/e/o`, name, value, tmp);
  }

  public onPropertyValue<T extends CloudMessageValue>(name: string, cb: OnMessageCallback<T>): void {
    if (!name) throw new Error('onPropertyValue failed: invalid property name');
    if (typeof cb !== 'function') throw new Error('onPropertyValue failed: invalid callback');

    this.propertiesCbs[name] = this.propertiesCbs[name] || [];
    this.propertiesCbs[name].push(cb);
  }

  public async getThing(): Promise<string> {
    if (this.thingId) return this.thingId;

    return new Promise<string>((res, rej) => {
      this.onThingResponse = res;
      this.onThingRejection = rej;
      setTimeout(() => rej(new Error('Error: no thing associated')), 10000);
    });
  }
}
