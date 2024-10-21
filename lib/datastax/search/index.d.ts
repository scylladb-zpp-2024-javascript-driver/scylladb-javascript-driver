export namespace search {
  enum dateRangePrecision {
    year = 0,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
  }

  class DateRange {
    lowerBound: DateRangeBound;
    upperBound: DateRangeBound;

    constructor(lowerBound: DateRangeBound, upperBound: DateRangeBound);

    equals(other: DateRangeBound): boolean;

    toString(): string;

    static fromString(value: string): DateRange;

    static fromBuffer(value: Buffer): DateRange;
  }

  class DateRangeBound {
    date: Date;

    precision: number;

    equals(other: DateRangeBound): boolean;

    toString(): string;

    static fromString(value: string): DateRangeBound;

    static toLowerBound(bound: DateRangeBound): DateRangeBound;

    static toUpperBound(bound: DateRangeBound): DateRangeBound;
  }
}
