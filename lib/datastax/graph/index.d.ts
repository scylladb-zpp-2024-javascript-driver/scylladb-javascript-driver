import { types } from "../../types";

export namespace graph {
  interface Edge extends Element {
    outV?: Vertex;
    outVLabel?: string;
    inV?: Vertex;
    inVLabel?: string;
    properties?: object;
  }

  interface Element {
    id: any;
    label: string;
  }

  class GraphResultSet implements Iterator<any> {
    constructor(rs: types.ResultSet);

    first(): any;

    toArray(): any[];

    values(): Iterator<any>;

    next(value?: any): IteratorResult<any>;
  }

  interface Path {
    labels: any[];
    objects: any[];
  }

  interface Property {
    value: any;
    key: any;
  }

  interface Vertex extends Element {
    properties?: { [key: string]: any[] };
  }

  interface VertexProperty extends Element {
    value: any;
    key: string;
    properties?: any;
  }

  function asDouble(value: number): object;

  function asFloat(value: number): object;

  function asInt(value: number): object;

  function asTimestamp(value: Date): object;

  function asUdt(value: object): object;

  interface EnumValue {
    toString(): string;
  }

  namespace t {
    const id: EnumValue;
    const key: EnumValue;
    const label: EnumValue;
    const value: EnumValue;
  }

  namespace direction {
    // `in` is a reserved word
    const in_: EnumValue;
    const out: EnumValue;
    const both: EnumValue;
  }
}
