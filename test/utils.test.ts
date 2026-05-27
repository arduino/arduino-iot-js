import { describe, expect, it } from 'vitest';

import {
  arrayBufferToBase64,
  base64ToUtf8,
  decode,
  isArray,
  isBoolean,
  isNil,
  isNumber,
  isObject,
  isString,
  safeJsonParse,
  utf8ToBase64,
} from '../src/utils';

describe('utils type guards', () => {
  it.each([
    [undefined, true],
    [null, true],
    [0, false],
    ['', false],
    [false, false],
    [{}, false],
  ])('isNil(%s) === %s', (value, expected) => {
    expect(isNil(value as any)).toBe(expected);
  });

  it('discriminates primitive types', () => {
    expect(isNumber(42)).toBe(true);
    expect(isNumber('42' as any)).toBe(false);

    expect(isString('hello')).toBe(true);
    expect(isString(42 as any)).toBe(false);

    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(0 as any)).toBe(false);

    expect(isObject({ a: 1 } as any)).toBe(true);
    expect(isObject(null as any)).toBe(false);

    expect(isArray([1, 2, 3] as any)).toBe(true);
    expect(isArray('not array' as any)).toBe(false);
  });
});

describe('utils base64/utf8 round-trip', () => {
  it('round-trips ASCII strings', () => {
    const original = 'Arduino IoT Cloud';
    const encoded = utf8ToBase64(original);
    expect(base64ToUtf8(encoded)).toBe(original);
  });

  it('round-trips multi-byte UTF-8 strings', () => {
    const original = 'naïve café — 日本語 — 🚀';
    const encoded = utf8ToBase64(original);
    expect(base64ToUtf8(encoded)).toBe(original);
  });

  it('encodes ArrayBuffer to base64', () => {
    const buf = new Uint8Array([72, 101, 108, 108, 111]).buffer;
    expect(arrayBufferToBase64(buf)).toBe('SGVsbG8=');
  });
});

describe('utils safeJsonParse', () => {
  it('returns object as-is when already a plain object', () => {
    const obj = { a: 1, b: 'two' };
    expect(safeJsonParse(obj)).toBe(obj);
  });

  it('parses valid JSON strings', () => {
    expect(safeJsonParse('{"a":1}')).toStrictEqual({ a: 1 });
  });

  it('returns undefined for invalid JSON', () => {
    expect(safeJsonParse('not json')).toBeUndefined();
  });
});

describe('utils JWT decode', () => {
  it('decodes a valid JWT payload', () => {
    // header { "typ":"JWT","alg":"HS256" } + payload { "sub":"42","name":"Ada" } (unsigned)
    const header = utf8ToBase64(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).replace(/=+$/, '');
    const payload = utf8ToBase64(JSON.stringify({ sub: '42', name: 'Ada' })).replace(/=+$/, '');
    const token = `${header}.${payload}.signature`;

    expect(decode(token)).toStrictEqual({ sub: '42', name: 'Ada' });
  });

  it('returns null on malformed token', () => {
    expect(decode('not-a-jwt')).toBeNull();
  });
});
