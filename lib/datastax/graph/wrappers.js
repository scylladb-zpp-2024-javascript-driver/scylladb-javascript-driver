"use strict";

const types = require("../../types");
const { dataTypes } = types;


/**
 * @deprecated
 */
function asInt(value) {
  throw new ReferenceError(`This function (asInt) is not supported by our driver`);
}

/**
 * @deprecated
 */
function asDouble(value) {
  throw new ReferenceError(`This function (asDouble) is not supported by our driver`);
}

/**
 * @deprecated
 */
function asFloat(value) {
  throw new ReferenceError(`This function (asFloat) is not supported by our driver`);
}

/**
 * @deprecated
 */
function asTimestamp(value) {
  throw new ReferenceError(`This function (asTimestamp) is not supported by our driver`);
}

/**
 * @deprecated
 */
function asUdt(value, udtInfo) {
  throw new ReferenceError(`This function (asUdt) is not supported by our driver`);
}

module.exports = {
  asInt,
  asDouble,
  asFloat,
  asTimestamp,
  asUdt,
};
