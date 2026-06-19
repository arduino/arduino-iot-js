import { ActiveConnection } from './ActiveConnection';
import { Property } from './Property';

/**
 * Connection authenticated as a user (via JWT token or API credentials). A user
 * can address any thing they own, so `property` requires an explicit `thingId`.
 *
 * From the user's perspective a thing's *output* topic (`/e/o`) carries the
 * values reported by the device, while its *input* topic (`/e/i`) is where the
 * user writes — the mirror image of {@link DeviceConnection}.
 *
 * Token refresh is handled by the transport: the credentials provider supplied
 * at connect time is re-run on every reconnect, so there's no `updateToken`.
 */
export class UserConnection extends ActiveConnection {
  public property(thingId: string, name: string): Property {
    if (!thingId) throw new Error('property failed: invalid thingId');
    if (!name) throw new Error('property failed: invalid property name');

    return new Property(name, this.channel(`/a/t/${thingId}/e/o`, `/a/t/${thingId}/e/i`));
  }
}
