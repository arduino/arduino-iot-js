import { CloudOptions } from '../options';
import { MqttTransport } from '../transport/MqttTransport';
import { ActiveConnection } from './ActiveConnection';
import { Property } from './Property';

/**
 * Connection authenticated as a user (via JWT token or API credentials). A user
 * can address any thing they own, so `property` requires an explicit `thingId`.
 *
 * From the user's perspective a thing's *output* topic (`/e/o`) carries the
 * values reported by the device, while its *input* topic (`/e/i`) is where the
 * user writes — the mirror image of {@link DeviceConnection}.
 */
export class UserConnection extends ActiveConnection {
  constructor(
    transport: MqttTransport,
    options: CloudOptions,
    private token: string
  ) {
    super(transport, options);
  }

  public property(thingId: string, name: string): Property {
    if (!thingId) throw new Error('property failed: invalid thingId');
    if (!name) throw new Error('property failed: invalid property name');

    return new Property(name, this.channel(`/a/t/${thingId}/e/o`, `/a/t/${thingId}/e/i`));
  }

  public getToken(): string {
    return this.token;
  }

  /**
   * Reconnect the transport using a fresh JWT. Retries on failure and returns
   * once reconnected with the new token.
   */
  public async updateToken(newToken: string): Promise<void> {
    while (true) {
      try {
        this.endTransport();
        await this.transport.connect({ password: newToken });
        this.token = newToken;
        return;
      } catch (error) {
        console.error(error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }
}
