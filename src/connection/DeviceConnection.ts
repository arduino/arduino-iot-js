import { CloudOptions } from '../options';
import { MqttTransport } from '../transport/MqttTransport';
import { ActiveConnection } from './ActiveConnection';
import { Property } from './Property';

const THING_RESOLUTION_TIMEOUT = 10000;

/**
 * Connection authenticated as a single device. The device is bound to exactly
 * one thing, whose id the broker announces on `/a/d/{deviceId}/e/i` shortly
 * after connecting — so `property` takes only a name.
 *
 * Directions are mirrored relative to {@link UserConnection}: the device writes
 * its values to the *output* topic (`/e/o`) and listens for commands on the
 * *input* topic (`/e/i`).
 */
export class DeviceConnection extends ActiveConnection {
  private thingId?: string;

  private constructor(transport: MqttTransport, options: CloudOptions, private readonly deviceId: string) {
    super(transport, options);
  }

  /** Connect-time factory: resolves the associated thing before returning. */
  public static async resolve(
    transport: MqttTransport,
    options: CloudOptions,
    deviceId: string
  ): Promise<DeviceConnection> {
    const connection = new DeviceConnection(transport, options, deviceId);
    await connection.resolveThing();
    return connection;
  }

  public property(name: string): Property {
    if (!this.thingId) throw new Error('property failed: no thing associated with this device');
    if (!name) throw new Error('property failed: invalid property name');

    return new Property(name, this.channel(`/a/t/${this.thingId}/e/i`, `/a/t/${this.thingId}/e/o`));
  }

  private resolveThing(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const subscription = this.observe<string>(`/a/d/${this.deviceId}/e/i`, () => true, (thingId) => {
        if (!thingId) return;
        clearTimeout(timer);
        subscription.unsubscribe();
        this.thingId = thingId;
        resolve();
      });

      const timer = setTimeout(() => {
        subscription.unsubscribe();
        reject(new Error('connection failed: no thing associated with this device'));
      }, THING_RESOLUTION_TIMEOUT);
    });
  }
}
