"use strict";

const { markAsNotSupported } = require("../new_utils");
/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Polygon(ringPoints) {
  markAsNotSupported("class", "Polygon");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.fromBuffer = function (buffer) {
  markAsNotSupported("function", "Polygon.fromBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.fromString = function (textValue) {
  markAsNotSupported("function", "Polygon.fromString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.prototype.toBuffer = function () {
  markAsNotSupported("function", "Polygon.toBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.prototype.equals = function (other) {
  markAsNotSupported("function", "Polygon.equals");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.prototype.toString = function () {
  markAsNotSupported("function", "Polygon.toString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.prototype.toJSON = function () {
  markAsNotSupported("function", "Polygon.toJSON");
};

module.exports = Polygon;
