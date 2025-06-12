import { CloudMessageValue } from '../client/ICloudClient';

export class ArduinoCloudError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = this.constructor.name;

    try {
      Error.captureStackTrace(this, this.constructor);
    } catch (error) {}
  }
}

export function isNil(value: unknown): value is undefined | null {
  return value === undefined || value == null;
}

export function isObject(value: CloudMessageValue): value is object {
  return !isNil(value) && typeof value === 'object';
}

export function isNumber(value: CloudMessageValue): value is number {
  return !isNil(value) && typeof value === 'number';
}

export function isString(value: CloudMessageValue): value is string {
  return !isNil(value) && typeof value === 'string';
}

export function isBoolean(value: CloudMessageValue): value is boolean {
  return !isNil(value) && typeof value === 'boolean';
}

export function isArray<T>(value: CloudMessageValue): value is T[] {
  return !isNil(value) && Array.isArray(value);
}

export function isNotAnEmptyObject(value: any): boolean {
  return !(value && typeof value === 'object' && Object.keys(value).length == 0);
}

export function toArrayBuffer(buf: { length: number }): ArrayBuffer {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}

export function toBuffer(ab: ArrayBuffer): Buffer {
  const buffer = Buffer.alloc(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}

export function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export interface Newable<T> {
  new (...args: any[]): T;
}

export function isValidObject(obj: unknown): obj is object {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export function safeJsonParse(obj: unknown): object {
  if (isValidObject(obj)) return obj;
  try {
    return JSON.parse(obj as string);
  } catch (e) {
    return undefined;
  }
}

export function headerFromJWS(signature: string): object {
  const encodedHeader = signature.split('.', 1)[0];
  return safeJsonParse(Buffer.from(encodedHeader, 'base64').toString('binary'));
}

export function toString(object: unknown): string {
  if (typeof object === 'string') return object;
  if (typeof object === 'number' || Buffer.isBuffer(object)) return object.toString();
  return JSON.stringify(object);
}

export function isValidJws(signature: string): boolean {
  const JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
  return JWS_REGEX.test(signature) && !!headerFromJWS(signature);
}

export function payloadFromJWS(signature: string): string {
  const [_, payload] = signature.split('.');
  return Buffer.from(payload, 'base64').toString('utf8');
}

export function decode(token: string): string | object {
  token = toString(token);

  if (!isValidJws(token)) return null;

  const header = headerFromJWS(token);
  if (!header) return null;

  let payload = payloadFromJWS(token);
  if (header['typ'] === 'JWT') payload = JSON.parse(payload);

  return payload;
}
