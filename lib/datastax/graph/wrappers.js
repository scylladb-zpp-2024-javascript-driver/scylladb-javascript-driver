"use strict";

const { throwNotSupported } = require("../../new_utils");

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asInt(value) {
    throwNotSupported("function", "asInt");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asDouble(value) {
    throwNotSupported("function", "asDouble");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asFloat(value) {
    throwNotSupported("function", "asFloat");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asTimestamp(value) {
    throwNotSupported("function", "asTimestamp");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function asUdt(value, udtInfo) {
    throwNotSupported("function", "asUdt");
}

module.exports = {
    asInt,
    asDouble,
    asFloat,
    asTimestamp,
    asUdt,
};
