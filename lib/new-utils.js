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

/**
 * A wrapper function to map napi errors to Node.js errors or custom errors.
 *
 * @param {Function} fn - The original function to be wrapped.
 * @returns {Function} A wrapped function with error handling logic.
 */
function napiErrorHandler(fn) {
    return function (...args) {
        try {
            return fn.apply(this, args);
        } catch (error) {
            // Check if message is of format errorType#errorMessage, if so throw a correct error,
            // otherwise throw the original error.
            const [errorType, ...messageParts] = error.message.split("#");
            const message = messageParts.join("#");

            if (errorTypeMap[errorType]) {
                const errorClass = errorTypeMap[errorType];
                const newError = new errorClass(message);
                newError.stack = error.stack;
                throw newError;
            }
            throw error;
        }
    };
}

exports.throwNotSupported = throwNotSupported;
exports.napiErrorHandler = napiErrorHandler;
