"use strict";

const { throwNotSupported } = require("../new_utils");

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function LineString(point) {
    throwNotSupported("class", "LineString");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.fromBuffer = function (buffer) {
    throwNotSupported("function", "LineString.fromBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.fromString = function (textValue) {
    throwNotSupported("function", "LineString.fromString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.prototype.toBuffer = function () {
    throwNotSupported("function", "LineString.toBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.prototype.equals = function (other) {
    throwNotSupported("function", "LineString.equals");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.prototype.toString = function () {
    throwNotSupported("function", "LineString.toString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.prototype.toJSON = function () {
    throwNotSupported("function", "LineString.toJSON");
};

module.exports = LineString;
