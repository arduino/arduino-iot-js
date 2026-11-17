import { describe, expect, it, vi } from 'vitest';

import { MqttCallback, MqttClient } from '../src/mqtt/MqttClient';
import { MqttTransport } from '../src/transport/MqttTransport';

type PublishCall = { topic: string; message: Buffer; opts: object; callback?: MqttCallback };

/** Minimal fake client that records publishes and lets the test settle them. */
function fakeClient() {
  const calls: PublishCall[] = [];
  const client = {
    connected: true,
    on: () => client,
    once: () => client,
    publish: (topic: string, message: Buffer, opts: object, callback?: MqttCallback) => {
      calls.push({ topic, message, opts, callback });
      return client;
    },
    end: () => client,
    subscribe: () => client,
    unsubscribe: () => client,
  };
  return { client: client as unknown as MqttClient, calls };
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

    calls[0].callback?.(undefined, {});
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
