/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export declare function testConnection(uri: string): Promise<string>
export const enum CqlType {
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
/** Test function returning sample CqlValueWrapper with Ascii type */
export declare function testsGetCqlWrapperAscii(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Boolean type */
export declare function testsGetCqlWrapperBoolean(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Blob type */
export declare function testsGetCqlWrapperBlob(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Counter type */
export declare function testsGetCqlWrapperCounter(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Double type */
export declare function testsGetCqlWrapperDouble(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Float type */
export declare function testsGetCqlWrapperFloat(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Int type */
export declare function testsGetCqlWrapperInt(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Text type */
export declare function testsGetCqlWrapperText(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Set type */
export declare function testsGetCqlWrapperSet(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with SmallInt type */
export declare function testsGetCqlWrapperSmallInt(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with TinyInt type */
export declare function testsGetCqlWrapperTinyInt(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Uuid type */
export declare function testsGetCqlWrapperUuid(): CqlValueWrapper
/** Test function returning sample CqlValueWrapper with Timeuuid type */
export declare function testsGetCqlWrapperTimeUuid(): CqlValueWrapper
export declare function testsBigintToI64(value: bigint, case?: number | undefined | null): void
export declare class PlainTextAuthProvider {
  id: number
  static new(): PlainTextAuthProvider
  test(): number
}
export declare class QueryResultWrapper {
  getRows(): Array<RowWrapper> | null
  /** Get the names of the columns in order */
  getColumnsNames(): Array<string>
}
export declare class RowWrapper {
  /** Get the CQL value wrappers for each column in the given row */
  getColumns(): Array<CqlValueWrapper>
}
export declare class CqlValueWrapper {
  /** This uses rust Debug to return string representation of underlying value */
  stringify(): string
  /** Get type of value in this object */
  getType(): CqlType
  getAscii(): string
  getBoolean(): boolean
  getBlob(): Buffer
  getCounter(): bigint
  getDouble(): number
  getDuration(): DurationWrapper
  getFloat(): number
  getInt(): number
  getText(): string
  getSet(): Array<CqlValueWrapper>
  getSmallInt(): number
  getTinyInt(): number
  getUuid(): UuidWrapper
  getTimeUuid(): TimeUuidWrapper
}
export declare class SessionOptions {
  connectPoints: Array<string>
  static empty(): SessionOptions
}
export declare class SessionWrapper {
  static createSession(options: SessionOptions): Promise<SessionWrapper>
  queryUnpagedNoValues(query: string): Promise<QueryResultWrapper>
}
export declare class DurationWrapper {
  months: number
  days: number
  nanoseconds: number
  static new(months: number, days: number, nsBigint: bigint): DurationWrapper
  getNanoseconds(): bigint
}
export declare class TimeUuidWrapper {
  getBuffer(): Buffer
}
export declare class UuidWrapper {
  static new(buffer: Buffer): UuidWrapper
  getBuffer(): Buffer
}
