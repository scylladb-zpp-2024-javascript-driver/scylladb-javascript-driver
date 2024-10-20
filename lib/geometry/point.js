/**
 * @deprecated
 */
function Point(x, y) {
  throw new ReferenceError(`This class (Point) is not supported by our driver`);
}

/**
 * @deprecated
 */
Point.fromBuffer = function (buffer) {
  throw new ReferenceError(
    `This function (Point.fromBuffer) is not supported by our driver`,
  );
};

/**
 * @deprecated
 */
Point.fromString = function (textValue) {
  throw new ReferenceError(
    `This function (Point.fromString) is not supported by our driver`,
  );
};

/**
 * @deprecated
 */
Point.prototype.toBuffer = function () {
  throw new ReferenceError(
    `This function (Point.toBuffer) is not supported by our driver`,
  );
};

/**
 * @deprecated
 */
Point.prototype.equals = function (other) {
  throw new ReferenceError(
    `This function (Point.equals) is not supported by our driver`,
  );
};

/**
 * @deprecated
 */
Point.prototype.toString = function () {
  throw new ReferenceError(
    `This function (Point.toString) is not supported by our driver`,
  );
};

/**
 * @deprecated
 */
Point.prototype.toJSON = function () {
  throw new ReferenceError(
    `This function (Point.toJSON) is not supported by our driver`,
  );
};

module.exports = Point;
