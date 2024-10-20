"use strict";
/**
 * @deprecated
 */
function Polygon(ringPoints) {
  throw new ReferenceError(`This class (Polygon) is not supported by our driver`);
}

/**
 * @deprecated
 */
Polygon.fromBuffer = function (buffer) {
  throw new ReferenceError(`This function (Polygon.fromBuffer) is not supported by our driver`);
};

/**
 * @deprecated
 */
Polygon.fromString = function (textValue) {
  throw new ReferenceError(`This function (Polygon.fromString) is not supported by our driver`);
};

/**
 * @deprecated
 */
Polygon.prototype.toBuffer = function () {
  throw new ReferenceError(`This function (Polygon.toBuffer) is not supported by our driver`);
};

/**
 * @deprecated
 */
Polygon.prototype.equals = function (other) {
  throw new ReferenceError(`This function (Polygon.equals) is not supported by our driver`);
};

Polygon.prototype.useBESerialization = function () {
  return false;
};

/**
 * @deprecated
 */
Polygon.prototype.toString = function () {
  throw new ReferenceError(`This function (Polygon.toString) is not supported by our driver`);
};

/**
 * @deprecated
 */
Polygon.prototype.toJSON = function () {
  throw new ReferenceError(`This function (Polygon.toJSON) is not supported by our driver`);
};

module.exports = Polygon;
