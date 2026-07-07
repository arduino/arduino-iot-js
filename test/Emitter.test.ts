import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Emitter } from '../src/transport/Emitter';

describe('Emitter delivery', () => {
  it('multicasts a value to every listener in registration order', () => {
    const emitter = new Emitter<number>();
    const calls: string[] = [];

    emitter.subscribe((v) => calls.push(`a:${v}`));
    emitter.subscribe((v) => calls.push(`b:${v}`));
    emitter.emit(1);

    expect(calls).toEqual(['a:1', 'b:1']);
  });

  it('delivers to the same listener again on each emit', () => {
    const emitter = new Emitter<number>();
    const listener = vi.fn();

    emitter.subscribe(listener);
    emitter.emit(1);
    emitter.emit(2);

    expect(listener.mock.calls).toEqual([[1], [2]]);
  });

  it('does not deliver to a listener after it unsubscribes', () => {
    const emitter = new Emitter<number>();
    const listener = vi.fn();

    const subscription = emitter.subscribe(listener);
    emitter.emit(1);
    subscription.unsubscribe();
    emitter.emit(2);

    expect(listener.mock.calls).toEqual([[1]]);
  });

  it('is safe to unsubscribe more than once', () => {
    const emitter = new Emitter<number>();
    const listener = vi.fn();

    const subscription = emitter.subscribe(listener);
    subscription.unsubscribe();
    expect(() => subscription.unsubscribe()).not.toThrow();

    emitter.emit(1);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Emitter mid-dispatch mutation', () => {
  it('still notifies a listener that was unsubscribed during the same dispatch', () => {
    const emitter = new Emitter<number>();
    const calls: string[] = [];

    const subs: { second?: { unsubscribe(): void } } = {};
    emitter.subscribe(() => {
      calls.push('first');
      subs.second?.unsubscribe();
    });
    subs.second = emitter.subscribe(() => calls.push('second'));

    emitter.emit(1);
    // The snapshot was taken before dispatch, so `second` still runs this round.
    expect(calls).toEqual(['first', 'second']);

    calls.length = 0;
    emitter.emit(2);
    // ...but not on the next one.
    expect(calls).toEqual(['first']);
  });

  it('does not notify a listener that subscribes during the same dispatch', () => {
    const emitter = new Emitter<number>();
    const calls: string[] = [];
    const late = (): void => void calls.push('late');

    emitter.subscribe(() => {
      calls.push('first');
      emitter.subscribe(late);
    });

    emitter.emit(1);
    // `late` joined after the snapshot was taken, so it waits for the next emit.
    expect(calls).toEqual(['first']);

    calls.length = 0;
    emitter.emit(2);
    expect(calls).toEqual(['first', 'late']);
  });

  it('reuses the snapshot across stable emits and rebuilds it after a change', () => {
    const emitter = new Emitter<number>();
    const a = vi.fn();
    const b = vi.fn();

    const subA = emitter.subscribe(a);
    emitter.subscribe(b);
    emitter.emit(1);
    emitter.emit(2);
    subA.unsubscribe();
    emitter.emit(3);

    expect(a.mock.calls).toEqual([[1], [2]]);
    expect(b.mock.calls).toEqual([[1], [2], [3]]);
  });
});

describe('Emitter error isolation', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps notifying the remaining listeners when one throws', () => {
    const emitter = new Emitter<number>();
    const calls: string[] = [];
    const boom = new Error('boom');

    emitter.subscribe(() => {
      calls.push('a');
      throw boom;
    });
    emitter.subscribe(() => calls.push('b'));

    expect(() => emitter.emit(1)).not.toThrow();
    expect(calls).toEqual(['a', 'b']);
  });

  it('re-raises a listener error on a fresh task', () => {
    const emitter = new Emitter<number>();
    const boom = new Error('boom');

    emitter.subscribe(() => {
      throw boom;
    });

    emitter.emit(1);
    // Swallowed synchronously, then rethrown when the scheduled task runs.
    expect(() => vi.runAllTimers()).toThrow(boom);
  });
});
