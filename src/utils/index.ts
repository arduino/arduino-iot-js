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
};
