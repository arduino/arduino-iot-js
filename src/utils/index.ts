import { CloudMessageValue } from '../client/ICloudClient';

class ArduinoCloudError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = this.constructor.name;

    try {
      Error.captureStackTrace(this, this.constructor);
    } catch (error) {}
  }
}

function isObject(value: CloudMessageValue): value is object {
  return typeof value === 'object';
}

function isNumber(value: CloudMessageValue): value is number {
  return typeof value === 'number';
}

function isString(value: CloudMessageValue): value is string {
  return typeof value === 'string';
}

function isBoolean(value: CloudMessageValue): value is boolean {
  return typeof value === 'boolean';
}

function isArray<T>(value: CloudMessageValue): value is T[] {
  return Array.isArray(value);
}

function isNotAnEmptyObject(value): boolean {
  return !(typeof value === 'object' && Object.keys(value).length == 0);
}

function toArrayBuffer(buf: { length: number }): ArrayBuffer {
  const ab = new ArrayBuffer(buf.length);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buf.length; ++i) {
    view[i] = buf[i];
  }
  return ab;
}

function toBuffer(ab: ArrayBuffer): Buffer {
  const buffer = new Buffer(ab.byteLength);
  const view = new Uint8Array(ab);
  for (let i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function isValidObject(obj: unknown): obj is object {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

function safeJsonParse(obj: unknown): object {
  if (isValidObject(obj)) return obj;
  try {
    return JSON.parse(obj as string);
  } catch (e) {
    return undefined;
  }
}

function headerFromJWS(signature: string): object {
  const encodedHeader = signature.split('.', 1)[0];
  return safeJsonParse(Buffer.from(encodedHeader, 'base64').toString('binary'));
}

function toString(object: unknown): string {
  if (typeof object === 'string') return object;
  if (typeof object === 'number' || Buffer.isBuffer(object)) return object.toString();
  return JSON.stringify(object);
}

function isValidJws(signature: string): boolean {
  const JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
  return JWS_REGEX.test(signature) && !!headerFromJWS(signature);
}

function payloadFromJWS(signature: string): string {
  const [_, payload] = signature.split('.');
  return Buffer.from(payload, 'base64').toString('utf8');
}

function decode(token: string): string | object {
  token = toString(token);

  if (!isValidJws(token)) return null;

  const header = headerFromJWS(token);
  if (!header) return null;

  let payload = payloadFromJWS(token);
  if (header['typ'] === 'JWT') payload = JSON.parse(payload);

  return payload;
}

export default {
  ArduinoCloudError,
  isObject,
  isNumber,
  isString,
  isBoolean,
  isArray,
  toArrayBuffer,
  toBuffer,
  arrayBufferToBase64,
  isNotAnEmptyObject,
  decode,
};
