"use strict";

const {markAsNotSupported} = require("../../new_utils")

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asInt(value) {
  markAsNotSupported("function", "asInt");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asDouble(value) {
  markAsNotSupported("function", "asDouble");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asFloat(value) {
  markAsNotSupported("function", "asFloat");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asTimestamp(value) {
  markAsNotSupported("function", "asTimestamp");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asUdt(value, udtInfo) {
  markAsNotSupported("function", "asUdt");
}

module.exports = {
  asInt,
  asDouble,
  asFloat,
  asTimestamp,
  asUdt,
};
