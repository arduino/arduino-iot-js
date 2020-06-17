import { encode, decode, CBORValue } from '@arduino/cbor-js';

import Utils from "../utils";
import { CloudMessageValue } from "../client/IArduinoCloudClient";

function isPropertyValue(message: CBORValue | string[]): message is CBORValue {
  return !!(message as CBORValue).n;
}

function valueFrom(message: CBORValue | string[]): CloudMessageValue {
  return isPropertyValue(message)
    ? message.v || message.vs || message.vb
    : message[2] || message[3] || message[4];
}

function nameFrom(property: CBORValue | string[]): string {
  return isPropertyValue(property) ? property.n : property[0]
}

function toString(value: CBORValue[]): string {
  const encoded = encode(value);
  return Utils.arrayBufferToBase64(encoded);
};

function toCloudProtocolV2(cborValue: CBORValue): CBORValue {
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

function parse(value: CloudMessageValue, name: string, timestamp: number, deviceId: string): CBORValue {
  const parsed: CBORValue = { n: name };
  if (timestamp !== -1) parsed.bt = timestamp || new Date().getTime()

  if (Utils.isNumber(value)) parsed.v = value;
  if (Utils.isString(value)) parsed.vs = value;
  if (Utils.isBoolean(value)) parsed.vb = value;

  if (deviceId) {
    parsed.bn = `urn:uuid:${deviceId}`;
  }

  return parsed;
}

function getSenML(name: string, value: CloudMessageValue, timestamp: number, useCloudProtocolV2: boolean, deviceId: string): CBORValue | CBORValue[] {
  if (timestamp && !Number.isInteger(timestamp)) throw new Error('Timestamp must be Integer');
  if (name === undefined || typeof name !== 'string') throw new Error('Name must be a valid string');

  if (Utils.isObject(value)) return Object.keys(value)
    .map((key, i) => parse(value[key], `${name}:${key}`, i === 0 ? timestamp : -1, deviceId))
    .map((cborValue) => useCloudProtocolV2 ? toCloudProtocolV2(cborValue) : cborValue);

  let cborValue = parse(value, name, timestamp, deviceId);
  if (useCloudProtocolV2) cborValue = toCloudProtocolV2(cborValue);
  return cborValue;
};

export default {
  encode,
  decode,
  toString,
  getSenML,
  valueFrom,
  nameFrom,
  isPropertyValue,
  toCloudProtocolV2,
}