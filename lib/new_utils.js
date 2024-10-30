"use strict";

/**
 * @param {String} entity
 * @param {String} name
 */
function throwNotSupported(name) {
    throw new ReferenceError(`${name} is not supported by our driver`);
}

exports.throwNotSupported = throwNotSupported;
