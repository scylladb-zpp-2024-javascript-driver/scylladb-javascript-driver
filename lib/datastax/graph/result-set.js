"use strict";

const utils = require("../utils");

/**
 * @deprecated
 */
function GraphResultSet(result, rowParser) {
    throw new ReferenceError(
        utils.markAsNotSupported("class", "GraphResultSet"),
    );
    /**
     * @deprecated
     */
    this.first = function first() {
        throw new ReferenceError(
            utils.markAsNotSupported("function", "GraphResultSet.first"),
        );
    };

    /**
     * @deprecated
     */
    this.forEach = function forEach(callback, thisArg) {
        throw new ReferenceError(
            utils.markAsNotSupported("function", "GraphResultSet.forEach"),
        );
    };

    /**
     * @deprecated
     */
    this.toArray = function toArray() {
        throw new ReferenceError(
            utils.markAsNotSupported("function", "GraphResultSet.toArray"),
        );
    };

    /**
     * @deprecated
     */
    this.values = function* values() {
        throw new ReferenceError(
            utils.markAsNotSupported("function", "GraphResultSet.values"),
        );
    };

    /**
     * @deprecated
     */
    this.getTraversers = function* () {
        throw new ReferenceError(
            utils.markAsNotSupported(
                "function",
                "GraphResultSet.getTraversers",
            ),
        );
    };
}

module.exports = GraphResultSet;
