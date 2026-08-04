import BaseCBOR, { type CborValue } from '@arduino/cbor-js';

import * as Utils from '../utils';
import { CloudMessageValue } from '../transport/types';
import { SenML } from '../types/senML';

export const CBOR = BaseCBOR;

export function isPropertyValue(message: SenML | string[]): message is SenML {
  return !!(message as SenML).n;
}

export function isNil<T>(v: T): boolean {
  return v === null || v === undefined;
}

export function takeFrom(...values: (CloudMessageValue | undefined)[]): CloudMessageValue | undefined {
  return values.find((v) => !isNil(v));
}

/** The value of a record, or `undefined` when it carries none of `v`/`vs`/`vb`. */
export function valueFrom(message: SenML | string[]): CloudMessageValue | undefined {
  return isPropertyValue(message)
    ? takeFrom(message.v, message.vs, message.vb)
    : takeFrom(message[2], message[3], message[4]);
}

export function nameFrom(property: SenML | string[]): string {
  return isPropertyValue(property) ? (property.n ?? '') : property[0];
}

export function toString(value: CborValue, numericKeys?: boolean): string {
  const encoded = CBOR.encode(value, numericKeys);
  return Utils.arrayBufferToBase64(encoded);
}

/**
 * Decode a CBOR payload into the SenML records it carries. Payloads arrive
 * untyped from the broker, so anything that is not a collection of records
 * decodes to nothing rather than throwing.
 */
export function fromCBOR(data: ArrayBuffer): (SenML | string[])[] {
  const decoded = CBOR.decode(data);
  if (!Array.isArray(decoded)) return [];
  return decoded.filter((record): record is SenML | string[] => typeof record === 'object' && record !== null);
}

export function toCloudProtocolV2(cborValue: SenML): SenML {
  const cloudV2CBORValue: SenML = {};

  Object.keys(cborValue).forEach((label) => {
    // Labels outside the SenML table are passed through unchanged.
    let cborLabel: string | number = label;

    switch (label) {
      case 'bn':
        cborLabel = -2;
        break;
      case 'bt':
        cborLabel = -3;
        break;
      case 'bu':
        cborLabel = -4;
        break;
      case 'bv':
        cborLabel = -5;
        break;
      case 'bs':
        cborLabel = -6;
        break;
      case 'bver':
        cborLabel = -1;
        break;
      case 'n':
        cborLabel = 0;
        break;
      case 'u':
        cborLabel = 1;
        break;
      case 'v':
        cborLabel = 2;
        break;
      case 'vs':
        cborLabel = 3;
        break;
      case 'vb':
        cborLabel = 4;
        break;
      case 'vd':
        cborLabel = 8;
        break;
      case 's':
        cborLabel = 5;
        break;
      case 't':
        cborLabel = 6;
        break;
      case 'ut':
        cborLabel = 7;
        break;
    }

    cloudV2CBORValue[cborLabel] = cborValue[label];
  });

  return cloudV2CBORValue;
}

export function format(value: CloudMessageValue, name: string, timestamp: number, deviceId: string | null): SenML {
  const parsed: SenML = {};
  if (timestamp !== -1) parsed.bt = timestamp || new Date().getTime();
  parsed.n = name;

  if (deviceId) {
    parsed.bn = `urn:uuid:${deviceId}`;
  }

  if (Utils.isNumber(value)) parsed.v = Number(value);
  if (Utils.isString(value)) parsed.vs = String(value);
  if (Utils.isBoolean(value)) parsed.vb = Boolean(value);

  return parsed;
}

export function parse(
  name: string,
  value: CloudMessageValue,
  timestamp: number,
  useCloudProtocolV2: boolean,
  deviceId: string | null
): SenML | SenML[] {
  if (timestamp && !Number.isInteger(timestamp)) throw new Error('Timestamp must be Integer');
  if (!Utils.isString(name)) throw new Error('Name must be a valid string');

  if (Utils.isObject(value))
    return Object.keys(value)
      .map((key, i) => format(value[key], `${name}:${key}`, i === 0 ? timestamp : -1, i === 0 ? deviceId : null))
      .map((cborValue) => (useCloudProtocolV2 ? toCloudProtocolV2(cborValue) : cborValue));

  let cborValue = format(value, name, timestamp, deviceId);
  if (useCloudProtocolV2) cborValue = toCloudProtocolV2(cborValue);
  return cborValue;
}
