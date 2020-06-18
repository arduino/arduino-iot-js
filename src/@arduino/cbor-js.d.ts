/*
    SenML labels
    https://tools.ietf.org/html/draft-ietf-core-senml-16#section-4.3

    +---------------+-------+------------+------------+------------+
    |          Name | Label | CBOR Label | JSON Type  | XML Type   |
    +---------------+-------+------------+------------+------------+
    |     Base Name | bn    |         -2 | String     | string     |
    |     Base Time | bt    |         -3 | Number     | double     |
    |     Base Unit | bu    |         -4 | String     | string     |
    |    Base Value | bv    |         -5 | Number     | double     |
    |      Base Sum | bs    |         -6 | Number     | double     |
    |       Version | bver  |         -1 | Number     | int        |
    |          Name | n     |          0 | String     | string     |
    |          Unit | u     |          1 | String     | string     |
    |         Value | v     |          2 | Number     | double     |
    |  String Value | vs    |          3 | String     | string     |
    | Boolean Value | vb    |          4 | Boolean    | boolean    |
    |    Data Value | vd    |          8 | String (*) | string (*) |
    |     Value Sum | s     |          5 | Number     | double     |
    |          Time | t     |          6 | Number     | double     |
    |   Update Time | ut    |          7 | Number     | double     |
    +---------------+-------+------------+------------+------------+
*/

declare module '@arduino/cbor-js' {
  export function encode(value: SenML[], numericKeys?: boolean): ArrayBuffer;
  export function decode(data: ArrayBuffer, tagger?: (value: SenML) => SenML, simpleValue?: SenML): SenML[];

  export type SenML = {
    bn?: string;
    bt?: number;
    bu?: string;
    bv?: number;
    bs?: number;
    bver?: number;
    n?: string;
    u?: string;
    v?: number;
    vs?: string;
    vb?: boolean;
    vd?: string;
    s?: number;
    t?: number;
    ut?: number;
    [key: string]: any;
  };
}
