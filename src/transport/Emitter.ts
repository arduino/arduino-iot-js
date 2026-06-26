export type Listener<T> = (value: T) => void;

/**
 * Handle returned when a listener is registered. Calling `unsubscribe` detaches
 * the listener; it is safe to call more than once. This is the same handle the
 * public `Property.subscribe` hands back.
 */
export interface Subscription {
  unsubscribe(): void;
}

/**
 * Read-only view of an {@link Emitter}: lets consumers attach listeners but not
 * emit. Exposed by the transport so the message stream can't be driven from the
 * outside — the mirror of rxjs's `Observable`/`Subject` split this replaced.
 */
export interface Subscribable<T> {
  subscribe(listener: Listener<T>): Subscription;
}

/**
 * Minimal synchronous multicast emitter — the small slice of rxjs's `Subject`
 * this library actually used. Listeners fire in registration order; a listener
 * that subscribes or unsubscribes during a dispatch does not disturb the
 * in-flight one, because each `emit` iterates a snapshot of the listener set.
 */
export class Emitter<T> implements Subscribable<T> {
  private readonly listeners = new Set<Listener<T>>();

  public subscribe(listener: Listener<T>): Subscription {
    this.listeners.add(listener);
    let closed = false;
    return {
      unsubscribe: () => {
        if (closed) return;
        closed = true;
        this.listeners.delete(listener);
      },
    };
  }

  public emit(value: T): void {
    [...this.listeners].forEach((listener) => listener(value));
  }
}
