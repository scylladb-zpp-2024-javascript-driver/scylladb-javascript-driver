"use strict";

const types = require("../../types");
const { dataTypes } = types;

/**
 * Internal representation of a value with additional type information.
 * @internal
 * @ignore
 */
class GraphTypeWrapper {
  constructor(value, typeInfo) {
    this.value = value;
    this.typeInfo =
      typeof typeInfo === "number" ? { code: typeInfo } : typeInfo;
  }
}

/**
 * Internal representation of user-defined type with the metadata.
 * @internal
 * @ignore
 */
class UdtGraphWrapper {
  constructor(value, udtInfo) {
    this.value = value;

    if (!udtInfo || !udtInfo.name || !udtInfo.keyspace || !udtInfo.fields) {
      throw new TypeError(
        `udtInfo must be an object with name, keyspace and field properties defined`,
      );
    }

    this.udtInfo = udtInfo;
  }
}

/**
 * Wraps a number or null value to hint the client driver that the data type of the value is an int
 * @memberOf module:datastax/graph
 */
function asInt(value) {
  return new GraphTypeWrapper(value, dataTypes.int);
}

/**
 * Wraps a number or null value to hint the client driver that the data type of the value is a double
 * @memberOf module:datastax/graph
 */
function asDouble(value) {
  return new GraphTypeWrapper(value, dataTypes.double);
}

/**
 * Wraps a number or null value to hint the client driver that the data type of the value is a double
 * @memberOf module:datastax/graph
 */
function asFloat(value) {
  return new GraphTypeWrapper(value, dataTypes.float);
}

/**
 * Wraps a Date or null value to hint the client driver that the data type of the value is a timestamp
 * @memberOf module:datastax/graph
 */
function asTimestamp(value) {
  return new GraphTypeWrapper(value, dataTypes.timestamp);
}

/**
 * Wraps an Object or null value to hint the client driver that the data type of the value is a user-defined type.
 * @memberOf module:datastax/graph
 * @param {object} value The object representing the UDT.
 * @param {{name: string, keyspace: string, fields: Array}} udtInfo The UDT metadata as defined by the driver.
 */
function asUdt(value, udtInfo) {
  return new UdtGraphWrapper(value, udtInfo);
}

module.exports = {
  asInt,
  asDouble,
  asFloat,
  asTimestamp,
  asUdt,
  UdtGraphWrapper,
  GraphTypeWrapper,
};
