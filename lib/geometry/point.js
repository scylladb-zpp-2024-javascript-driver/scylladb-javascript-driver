"use strict";

const utils = require("../utils");

/**
 * @deprecated
 */
function Point(x, y) {
    throw new ReferenceError(utils.markAsNotSupported("class", "Point"));
}

/**
 * @deprecated
 */
Point.fromBuffer = function (buffer) {
    throw new ReferenceError(
        utils.markAsNotSupported("function", "Point.fromBuffer"),
    );
};

/**
 * @deprecated
 */
Point.fromString = function (textValue) {
    throw new ReferenceError(
        utils.markAsNotSupported("function", "Point.fromString"),
    );
};

/**
 * @deprecated
 */
Point.prototype.toBuffer = function () {
    throw new ReferenceError(
        utils.markAsNotSupported("function", "Point.toBuffer"),
    );
};

/**
 * @deprecated
 */
Point.prototype.equals = function (other) {
    throw new ReferenceError(
        utils.markAsNotSupported("function", "Point.equals"),
    );
};

/**
 * @deprecated
 */
Point.prototype.toString = function () {
    throw new ReferenceError(
        utils.markAsNotSupported("function", "Point.toString"),
    );
};

/**
 * @deprecated
 */
Point.prototype.toJSON = function () {
    throw new ReferenceError(
        utils.markAsNotSupported("function", "Point.toJSON"),
    );
};

module.exports = Point;
