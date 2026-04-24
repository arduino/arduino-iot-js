import { CloudMessageValue } from '../client/ICloudClient';

// Polyfill btoa/atob for Node.js
const globalBtoa = typeof btoa !== 'undefined' ? btoa : (str: string) => Buffer.from(str, 'binary').toString('base64');
const globalAtob = typeof atob !== 'undefined' ? atob : (str: string) => Buffer.from(str, 'base64').toString('binary');

// Universal helper to convert base64 to UTF-8 (no TextDecoder for RN compatibility)
function base64ToUtf8(base64: string): string {
  // Use atob as primary (works with RN polyfill)
  const binaryStr = globalAtob(base64);

  // Try to decode properly with TextDecoder if available
  try {
    if (typeof TextDecoder !== 'undefined') {
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return new TextDecoder().decode(bytes);
    }
  } catch (e) {
    // Fall through
  }
  // Fallback: return decoded binary string
  return binaryStr;
}

// Universal helper to convert UTF-8 to base64 (no TextEncoder for RN compatibility)
function utf8ToBase64(utf8: string): string {
  // Use btoa as primary (works with RN polyfill)
  // Convert UTF-8 string to binary without using deprecated unescape
  const encoded = encodeURIComponent(utf8);
  let binary = '';
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '%') {
      binary += String.fromCharCode(parseInt(encoded.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      binary += encoded[i];
    }
  }
  const base64 = globalBtoa(binary);

  // Try to encode properly with TextEncoder if available for better accuracy
  try {
    if (typeof TextEncoder !== 'undefined') {
      const bytes = new TextEncoder().encode(utf8);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return globalBtoa(binary);
    }
  } catch (e) {
    // Fall through
  }
  // Fallback: return result from primary btoa approach
  return base64;
}

// Universal fallback for Buffer.isBuffer
function isBufferLike(obj: unknown): boolean {
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) return true;
  return obj instanceof ArrayBuffer || obj instanceof Uint8Array;
}

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
  // Node.js only - use Uint8Array in React Native
  if (typeof Buffer === 'undefined') {
    throw new Error('toBuffer() requires Node.js environment. Use Uint8Array instead.');
  }
  const buffer = Buffer.alloc(ab.byteLength);
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
  return globalBtoa(binary);
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
  return safeJsonParse(base64ToUtf8(encodedHeader));
}

function toString(object: unknown): string {
  if (typeof object === 'string') return object;
  if (typeof object === 'number' || isBufferLike(object)) return object.toString();
  return JSON.stringify(object);
}

function isValidJws(signature: string): boolean {
  const JWS_REGEX = /^[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?$/;
  return JWS_REGEX.test(signature) && !!headerFromJWS(signature);
}

function payloadFromJWS(signature: string): string {
  const [_, payload] = signature.split('.');
  return base64ToUtf8(payload);
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
  base64ToUtf8,
  utf8ToBase64,
  isBufferLike,
};
