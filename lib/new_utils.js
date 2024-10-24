"use strict";

/**
 * @param {String} entity
 * @param {String} name
 */
function markAsNotSupported(entity, name) {
  throw new ReferenceError(
    `The ${entity} (${name}) is not supported by our driver`,
  );
}

exports.markAsNotSupported = markAsNotSupported;
