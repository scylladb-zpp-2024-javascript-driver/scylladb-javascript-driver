"use strict";

const utils = require("../utils");

/**
 * @deprecated
 */
function LineString(point) {
  throw new ReferenceError(
    utils.markAsNotSupported("class", "LineString")
  );
}

/**
 * @deprecated
 */
LineString.fromBuffer = function (buffer) {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "LineString.fromBuffer")
  );
};

/**
 * @deprecated
 */
LineString.fromString = function (textValue) {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "LineString.fromString")
  );
};

/**
 * @deprecated
 */
LineString.prototype.toBuffer = function () {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "LineString.toBuffer")
  );
};

/**
 * @deprecated
 */
LineString.prototype.equals = function (other) {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "LineString.equals")
  );
};

/**
 * @deprecated
 */
LineString.prototype.toString = function () {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "LineString.toString")
  );
};

/**
 * @deprecated
 */
LineString.prototype.toJSON = function () {
  throw new ReferenceError(
    utils.markAsNotSupported("function", "LineString.toJSON")
  );
};

module.exports = LineString;
