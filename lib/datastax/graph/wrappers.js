"use strict";

const utils = require("../utils");

/**
 * @deprecated
 */
function asInt(value) {
    throw new ReferenceError(utils.markAsNotSupported("function", "asInt"));
}

/**
 * @deprecated
 */
function asDouble(value) {
    throw new ReferenceError(utils.markAsNotSupported("function", "asDouble"));
}

/**
 * @deprecated
 */
function asFloat(value) {
    throw new ReferenceError(utils.markAsNotSupported("function", "asFloat"));
}

/**
 * @deprecated
 */
function asTimestamp(value) {
    throw new ReferenceError(
        utils.markAsNotSupported("function", "asTimestamp"),
    );
}

/**
 * @deprecated
 */
function asUdt(value, udtInfo) {
    throw new ReferenceError(utils.markAsNotSupported("function", "asUdt"));
}

module.exports = {
    asInt,
    asDouble,
    asFloat,
    asTimestamp,
    asUdt,
};
