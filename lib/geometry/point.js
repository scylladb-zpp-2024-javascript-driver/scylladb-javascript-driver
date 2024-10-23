"use strict";

const { throwNotSupported } = require("../new_utils");

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Point(x, y) {
    throwNotSupported("class", "Point");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.fromBuffer = function (buffer) {
    throwNotSupported("function", "Point.fromBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.fromString = function (textValue) {
    throwNotSupported("function", "Point.fromString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.prototype.toBuffer = function () {
    throwNotSupported("function", "Point.toBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.prototype.equals = function (other) {
    throwNotSupported("function", "Point.equals");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.prototype.toString = function () {
    throwNotSupported("function", "Point.toString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.prototype.toJSON = function () {
    throwNotSupported("function", "Point.toJSON");
};

module.exports = Point;
