"use strict";

const { throwNotSupported } = require("../new_utils");
/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Polygon(ringPoints) {
    throwNotSupported("class", "Polygon");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.fromBuffer = function (buffer) {
    throwNotSupported("function", "Polygon.fromBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.fromString = function (textValue) {
    throwNotSupported("function", "Polygon.fromString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.prototype.toBuffer = function () {
    throwNotSupported("function", "Polygon.toBuffer");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.prototype.equals = function (other) {
    throwNotSupported("function", "Polygon.equals");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.prototype.toString = function () {
    throwNotSupported("function", "Polygon.toString");
};

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
Polygon.prototype.toJSON = function () {
    throwNotSupported("function", "Polygon.toJSON");
};

module.exports = Polygon;
