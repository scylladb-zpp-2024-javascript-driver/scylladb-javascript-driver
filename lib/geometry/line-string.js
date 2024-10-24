"use strict";

const { markAsNotSupported } = require("../new_utils");

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function LineString(point) {
  markAsNotSupported("class", "LineString");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.fromBuffer = function (buffer) {
  markAsNotSupported("function", "LineString.fromBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.fromString = function (textValue) {
  markAsNotSupported("function", "LineString.fromString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.prototype.toBuffer = function () {
  markAsNotSupported("function", "LineString.toBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.prototype.equals = function (other) {
  markAsNotSupported("function", "LineString.equals");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.prototype.toString = function () {
  markAsNotSupported("function", "LineString.toString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
LineString.prototype.toJSON = function () {
  markAsNotSupported("function", "LineString.toJSON");
};

module.exports = LineString;
