type SenML = import('../senML').SenML;

declare module '@arduino/cbor-js' {
  export function encode(value: SenML[], numericKeys?: boolean): ArrayBuffer;
  export function decode(data: ArrayBuffer, tagger?: (value: SenML) => SenML, simpleValue?: SenML): SenML[];
}
