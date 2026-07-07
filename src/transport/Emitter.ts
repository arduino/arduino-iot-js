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
 * in-flight one, because `emit` iterates a snapshot of the listener set.
 */
export class Emitter<T> implements Subscribable<T> {
  private readonly listeners = new Set<Listener<T>>();
  // Cached listener snapshot for `emit`, rebuilt lazily. Nulled on every
  // (un)subscribe so a stale set is never dispatched; reused across emits while
  // the set is stable to avoid reallocating on this per-message hot path.
  private snapshot: Listener<T>[] | null = null;

  public subscribe(listener: Listener<T>): Subscription {
    this.listeners.add(listener);
    this.snapshot = null;
    let closed = false;
    return {
      unsubscribe: () => {
        if (closed) return;
        closed = true;
        this.listeners.delete(listener);
        this.snapshot = null;
      },
    };
  }

  public emit(value: T): void {
    // Dispatch over a snapshot so a listener that (un)subscribes mid-dispatch
    // doesn't disturb this loop (the mutation only replaces the cached array,
    // never the one we hold here). Isolate each call so one throwing listener
    // can't stop delivery to the rest; a thrown error is re-raised on a fresh
    // task — the way rxjs's Subject reported unhandled subscriber errors — so it
    // still reaches the host's global error handler instead of being swallowed.
    const listeners = (this.snapshot ??= [...this.listeners]);
    listeners.forEach((listener) => {
      try {
        listener(value);
      } catch (error) {
        setTimeout(() => {
          throw error;
        });
      }
    });
  }
}
