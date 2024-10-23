"use strict";

const { throwNotSupported } = require("../../new_utils");

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function GraphResultSet(result, rowParser) {
    throwNotSupported("class", "GraphResultSet");
    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    this.first = function first() {
        throwNotSupported("function", "GraphResultSet.first");
    };

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    this.forEach = function forEach(callback, thisArg) {
        throwNotSupported("function", "GraphResultSet.forEach");
    };

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    this.toArray = function toArray() {
        throwNotSupported("function", "GraphResultSet.toArray");
    };

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    this.values = function* values() {
        throwNotSupported("function", "GraphResultSet.values");
    };

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    this.getTraversers = function* () {
        throwNotSupported("function", "GraphResultSet.getTraversers");
    };
}

module.exports = GraphResultSet;
