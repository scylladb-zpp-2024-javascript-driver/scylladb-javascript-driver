"use strict";

const { throwNotSupported } = require("../../new_utils");

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
class GraphResultSet {
    constructor(result, rowParser) {
        throwNotSupported("GraphResultSet");
    }
    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    first() {
        throwNotSupported("GraphResultSet.first");
    }

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    forEach(callback, thisArg) {
        throwNotSupported("GraphResultSet.forEach");
    }

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    toArray() {
        throwNotSupported("GraphResultSet.toArray");
    }

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    *values() {
        throwNotSupported("GraphResultSet.values");
    }

    /**
     * @deprecated Not supported by the driver. Usage will throw an error.
     */
    *getTraversers() {
        throwNotSupported("GraphResultSet.getTraversers");
    }
}

module.exports = GraphResultSet;
