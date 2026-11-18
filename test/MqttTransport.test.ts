import { describe, expect, it, vi } from 'vitest';

import { MqttCallback, MqttClient, MqttPublishCallback } from '../src/mqtt/MqttClient';
import { MqttTransport } from '../src/transport/MqttTransport';

type PublishCall = { topic: string; message: Buffer; opts: object; callback?: MqttPublishCallback };

/**
 * Minimal fake client that records publishes and lets the test settle them.
 * Like mqtt with `reconnectPeriod: 0` and a clean session, `end(true)` fails
 * the publishes still waiting for their ack.
 */
function fakeClient() {
  const calls: PublishCall[] = [];
  const handlers = new Map<string, MqttCallback[]>();
  const listen = (event: string, cb: MqttCallback) => handlers.set(event, [...(handlers.get(event) ?? []), cb]);
  const client = {
    connected: true,
    on: (event: string, cb: MqttCallback) => {
      listen(event, cb);
      return client;
    },
    once: (event: string, cb: MqttCallback) => {
      listen(event, cb);
      return client;
    },
    publish: (topic: string, message: Buffer, opts: object, callback?: MqttPublishCallback) => {
      calls.push({ topic, message, opts, callback });
      return client;
    },
    end: () => {
      calls.splice(0).forEach((call) => call.callback?.(new Error('Connection closed')));
      return client;
    },
    subscribe: () => client,
    unsubscribe: () => client,
  };
  /** Simulate a socket drop. */
  const drop = () => {
    client.connected = false;
    handlers.get('close')?.forEach((cb) => cb());
  };
  return { client: client as unknown as MqttClient, calls, drop };
}

async function connected() {
  const { client, calls } = fakeClient();
  const transport = new MqttTransport(
    'wss://example',
    () => Promise.resolve({ username: 'u', password: 'p' }),
    () => client
  );
  await transport.connect();
  return { transport, calls };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('MqttTransport.publish', () => {
  it('publishes at QoS 1 and resolves on the broker ack', async () => {
    const { transport, calls } = await connected();
    const payload = Buffer.from('x');

    const result = transport.publish('topic', payload);
    expect(calls).toHaveLength(1);
    expect(calls[0].topic).toBe('topic');
    expect(calls[0].message).toBe(payload);
    expect(calls[0].opts).toEqual({ qos: 1, retain: false });

    calls[0].callback?.();
    await expect(result).resolves.toBeUndefined();
  });

  it('rejects with the client error', async () => {
    const { transport, calls } = await connected();
    const result = transport.publish('topic', Buffer.from('x'));

    const error = new Error('boom');
    calls[0].callback?.(error);
    await expect(result).rejects.toBe(error);
  });

  it('rejects when there is no client', async () => {
    const transport = new MqttTransport(
      'wss://example',
      () => Promise.resolve({ username: 'u', password: 'p' }),
      () => fakeClient().client
    );
    await expect(transport.publish('topic', Buffer.from('x'))).rejects.toThrow('no connection found');
  });

  it('rejects when the client is not connected', async () => {
    const { client, calls } = fakeClient();
    const transport = new MqttTransport(
      'wss://example',
      () => Promise.resolve({ username: 'u', password: 'p' }),
      () => client
    );
    await transport.connect();
    (client as { connected: boolean }).connected = false;

    await expect(transport.publish('topic', Buffer.from('x'))).rejects.toThrow('no connection found');
    expect(calls).toHaveLength(0);
  });

  it('rejects a publish in flight when the socket drops, without waiting for the reconnect', async () => {
    const { client, calls, drop } = fakeClient();
    const credentials = vi
      .fn()
      .mockResolvedValueOnce({ username: 'u', password: 'p' })
      .mockRejectedValue(new Error('token fetch failed'));
    const transport = new MqttTransport('wss://example', credentials, () => client, vi.fn());
    await transport.connect();

    const result = transport.publish('topic', Buffer.from('x'));
    expect(calls).toHaveLength(1);
    drop();

    await expect(result).rejects.toThrow('Connection closed');
    expect(credentials).toHaveBeenCalledTimes(1);
    transport.end();
  });

  it('stays pending until the client calls back', async () => {
    const { transport, calls } = await connected();
    const onSettled = vi.fn();

    void transport.publish('topic', Buffer.from('x')).then(onSettled, onSettled);
    await flush();
    expect(onSettled).not.toHaveBeenCalled();

    calls[0].callback?.();
    await flush();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });
});
