"use strict";

const utils = require("../utils");
/**
 * @deprecated
 */
function Polygon(ringPoints) {
  throw new ReferenceError(utils.markAsNotSupported("class", "Polygon"));
}

/**
 * @deprecated
 */
Polygon.fromBuffer = function (buffer) {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "Polygon.fromBuffer"),
  );
};

/**
 * @deprecated
 */
Polygon.fromString = function (textValue) {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "Polygon.fromString"),
  );
};

/**
 * @deprecated
 */
Polygon.prototype.toBuffer = function () {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "Polygon.toBuffer"),
  );
};

/**
 * @deprecated
 */
Polygon.prototype.equals = function (other) {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "Polygon.equals"),
  );
};

/**
 * @deprecated
 */
Polygon.prototype.toString = function () {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "Polygon.toString"),
  );
};

/**
 * @deprecated
 */
Polygon.prototype.toJSON = function () {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "Polygon.toJSON"),
  );
};

module.exports = Polygon;
