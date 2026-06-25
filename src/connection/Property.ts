import { CloudMessageValue } from '../transport/types';
import { Subscription } from './Subscription';

export type PropertyListener<T extends CloudMessageValue> = (value: T) => void;

/**
 * Internal binding handed to a {@link Property} by the connection that created
 * it. It captures the inbound/outbound topics and defers the actual work to the
 * connection's (protected) helpers, so `Property` never touches transport state
 * directly.
 */
export interface PropertyChannel {
  observe<T extends CloudMessageValue>(name: string, listener: PropertyListener<T>): Subscription;
  publish(name: string, value: CloudMessageValue, timestamp?: number): Promise<void>;
}

/**
 * A handle to a single named property on a thing. Obtained via
 * `connection.property(...)`. Holds no state of its own beyond its name and the
 * channel it speaks through, so creating one is cheap and side-effect free.
 */
export class Property {
  constructor(
    private readonly name: string,
    private readonly channel: PropertyChannel
  ) {}

  public subscribe<T extends CloudMessageValue>(listener: PropertyListener<T>): Subscription {
    return this.channel.observe(this.name, listener);
  }

  public publish(value: CloudMessageValue, timestamp?: number): Promise<void> {
    return this.channel.publish(this.name, value, timestamp);
  }
}
