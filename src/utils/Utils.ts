import CBOR from "@arduino/cbor-js";

export class ArduinoCloudError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = this.constructor.name;

    try {
      Error.captureStackTrace(this, this.constructor);
    } catch (error) {
      // noop
    }
  }
}

export function toCloudProtocolV2(cborValue: CBOR.CBORValue): CBOR.CBORValue {
  const cloudV2CBORValue = {};
  let cborLabel = null;

  Object.keys(cborValue).forEach((label) => {
    switch (label) {
      case 'bn': cborLabel = -2; break;
      case 'bt': cborLabel = -3; break;
      case 'bu': cborLabel = -4; break;
      case 'bv': cborLabel = -5; break;
      case 'bs': cborLabel = -6; break;
      case 'bver': cborLabel = -1; break;
      case 'n': cborLabel = 0; break;
      case 'u': cborLabel = 1; break;
      case 'v': cborLabel = 2; break;
      case 'vs': cborLabel = 3; break;
      case 'vb': cborLabel = 4; break;
      case 'vd': cborLabel = 8; break;
      case 's': cborLabel = 5; break;
      case 't': cborLabel = 6; break;
      case 'ut': cborLabel = 7; break;
      default: cborLabel = label;
    }

    cloudV2CBORValue[cborLabel] = cborValue[label];
  });

  return cloudV2CBORValue;
}

export function isObject(value: any): value is object {
  return typeof (value) === "object";
}

export function isNumber(value: any): value is number {
  return typeof (value) === "number";
}

export function isString(value: any): value is string {
  return typeof (value) === "string";
}

export function isBoolean(value: any): value is boolean {
  return typeof (value) === "boolean";
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
  var buffer = new Buffer(ab.byteLength);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buffer.length; ++i) {
    buffer[i] = view[i];
  }
  return buffer;
}
