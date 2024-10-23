"use strict";

const {markAsNotSupported} = require("../new_utils")

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Point(x, y) {
  markAsNotSupported("class", "Point");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.fromBuffer = function (buffer) {
  markAsNotSupported("function", "Point.fromBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.fromString = function (textValue) {
  markAsNotSupported("function", "Point.fromString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.prototype.toBuffer = function () {
  markAsNotSupported("function", "Point.toBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.prototype.equals = function (other) {
  markAsNotSupported("function", "Point.equals");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.prototype.toString = function () {
  markAsNotSupported("function", "Point.toString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Point.prototype.toJSON = function () {
  markAsNotSupported("function", "Point.toJSON");
};

module.exports = Point;
