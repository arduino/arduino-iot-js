import BaseCBOR, { SenML } from '@arduino/cbor-js';

import * as Utils from '../utils';
import { CloudMessageValue } from '../client/ICloudClient';

export const CBOR = BaseCBOR;

export function isPropertyValue(message: SenML | string[]): message is SenML {
  return !!(message as SenML).n;
}

export function isNil<T>(v: T): boolean {
  return v === null || v === undefined;
}

export function takeFrom(...values: CloudMessageValue[]): CloudMessageValue {
  return values.find((v) => !isNil(v));
}

export function valueFrom(message: SenML | string[]): CloudMessageValue {
  return isPropertyValue(message)
    ? takeFrom(message.v, message.vs, message.vb)
    : takeFrom(message[2], message[3], message[4]);
}

export function nameFrom(property: SenML | string[]): string {
  return isPropertyValue(property) ? property.n : property[0];
}

export function toString(value: SenML[], numericKeys?: boolean): string {
  const encoded = CBOR.encode(value, numericKeys);
  return Utils.arrayBufferToBase64(encoded);
}

export function toCloudProtocolV2(cborValue: SenML): SenML {
  const cloudV2CBORValue = {};
  let cborLabel = null;

  Object.keys(cborValue).forEach((label) => {
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
      default:
        cborLabel = label;
    }

    cloudV2CBORValue[cborLabel] = cborValue[label];
  });

  return cloudV2CBORValue;
}

export function format(value: CloudMessageValue, name: string, timestamp: number, deviceId: string): SenML {
  const parsed: SenML = {};
  if (timestamp !== -1) parsed.bt = timestamp || new Date().getTime();
  parsed.n = name;

  if (deviceId) {
    parsed.bn = `urn:uuid:${deviceId}`;
  }

  if (Utils.isNumber(value)) parsed.v = value;
  if (Utils.isString(value)) parsed.vs = value;
  if (Utils.isBoolean(value)) parsed.vb = value;

  return parsed;
}

export function parse(
  name: string,
  value: CloudMessageValue,
  timestamp: number,
  useCloudProtocolV2: boolean,
  deviceId: string
): SenML | SenML[] {
  if (timestamp && !Number.isInteger(timestamp)) throw new Error('Timestamp must be Integer');
  if (name === undefined || typeof name !== 'string') throw new Error('Name must be a valid string');

  if (Utils.isObject(value))
    return Object.keys(value)
      .map((key, i) => format(value[key], `${name}:${key}`, i === 0 ? timestamp : -1, i === 0 ? deviceId : undefined))
      .map((cborValue) => (useCloudProtocolV2 ? toCloudProtocolV2(cborValue) : cborValue));

  let cborValue = format(value, name, timestamp, deviceId);
  if (useCloudProtocolV2) cborValue = toCloudProtocolV2(cborValue);
  return cborValue;
}
