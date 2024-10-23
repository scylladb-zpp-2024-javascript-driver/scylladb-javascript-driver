"use strict";

/**
 * @param {String} entity
 * @param {String} name
 */
function throwNotSupported(entity, name) {
    throw new ReferenceError(
        `The ${entity} (${name}) is not supported by our driver`,
    );
}

exports.throwNotSupported = throwNotSupported;
