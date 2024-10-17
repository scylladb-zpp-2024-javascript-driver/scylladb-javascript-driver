/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export declare function testConnection(uri: string): Promise<string>
export const enum CqlTypes {
  Ascii = 0,
  Boolean = 1,
  Blob = 2,
  Counter = 3,
  Decimal = 4,
  Date = 5,
  Double = 6,
  Duration = 7,
  Empty = 8,
  Float = 9,
  Int = 10,
  BigInt = 11,
  Text = 12,
  Timestamp = 13,
  Inet = 14,
  List = 15,
  Map = 16,
  Set = 17,
  UserDefinedType = 18,
  SmallInt = 19,
  TinyInt = 20,
  Time = 21,
  Timeuuid = 22,
  Tuple = 23,
  Uuid = 24,
  Varint = 25
}

export declare class Duration {
  static new(months: number, days: number, nanoseconds: number): Duration
  toBuffer(): Buffer
  toString(): string
  static fromBuffer(buffer: Buffer): Duration
  static fromString(input: string): Duration
}
export declare class PlainTextAuthProvider {
  id: number
  static new(): PlainTextAuthProvider
  static test(): number
}
export declare class QueryResultWrapper {
  getRows(): Array<RowWrapper>
  getColumnsNames(): Array<string>
}
export declare class RowWrapper {
  getColumns(): Array<CqlValueWrapper>
}
export declare class CqlValueWrapper {
  stringify(): string
  getType(): CqlTypes
  getAscii(): string
  getBoolean(): boolean
  getBlob(): Buffer
  getCounter(): bigint
  getDouble(): number
  getFloat(): number
  getInt(): number
  getText(): string
  getSet(): Array<CqlValueWrapper>
  getSmallInt(): number
  getTinyInt(): number
}
export declare class SessionOptions {
  connectPoints: Array<string>
  static empty(): SessionOptions
}
export declare class SessionWrapper {
  static createSession(options: SessionOptions): Promise<SessionWrapper>
  queryUnpagedNoValues(query: string): Promise<QueryResultWrapper>
}
