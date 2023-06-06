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

export function isObject(value: CloudMessageValue): value is object {
  return value && typeof value === 'object';
}

export function isNumber(value: CloudMessageValue): value is number {
  return value && typeof value === 'number';
}

export function isString(value: CloudMessageValue): value is string {
  return value && typeof value === 'string';
}

export function isBoolean(value: CloudMessageValue): value is boolean {
  return value && typeof value === 'boolean';
}

export function isArray<T>(value: CloudMessageValue): value is T[] {
  return value && Array.isArray(value);
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
