"use strict";
const customErrors = require("./errors");

/**
 * @param {String} entity
 * @param {String} name
 */
function throwNotSupported(name) {
    throw new ReferenceError(`${name} is not supported by our driver`);
}

const errorTypeMap = {
    ...customErrors,
    Error,
    RangeError,
    ReferenceError,
    SyntaxError,
    TypeError,
};

const concatenationMark = "#";

/**
 * A wrapper function to map napi errors to Node.js errors or custom errors.
 * Because NAPI-RS does not support throwing errors different that Error, for example
 * TypeError, RangeError, etc. or custom, driver-specific errors, this function is used
 * to catch the original error and throw a new one with the appropriate type.
 * This should be used to wrap all NAPI-RS functions that may throw errors.
 *
 * @param {Function} fn The original function to be wrapped.
 * @returns {Function} A wrapped function with error handling logic.
 */
function napiErrorHandler(fn) {
    return function (...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            // Check if message is of format errorType#errorMessage, if so map it to
            // appropriate error, otherwise throw the original error.
            const [errorType, ...messageParts] =
                error.message.split(concatenationMark);
            const message = messageParts.join(concatenationMark);

            if (errorTypeMap[errorType]) {
                const newError = new errorTypeMap[errorType](message);
                newError.stack = error.stack;
                throw newError;
            }
            throw error;
        }
    };
}

exports.throwNotSupported = throwNotSupported;
exports.napiErrorHandler = napiErrorHandler;
