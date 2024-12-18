"use strict";
const { assert } = require("chai");
const { napiErrorHandler } = require("../../lib/new-utils");
const { throwTestError } = require("../../index");
const {
    ArgumentError,
    AuthenticationError,
    BusyConnectionError,
    DriverError,
    DriverInternalError,
    NoHostAvailableError,
    NotSupportedError,
    OperationTimedOutError,
    ResponseError,
} = require("../../lib/errors");

class SomeJsClass {
    // throws an error with the given type and "Test error" as the message
    throwError = napiErrorHandler(function (errorType) {
        return throwTestError(errorType);
    });
    // throws JS Error with the given message
    throwMessage = napiErrorHandler(function (message) {
        return throwTestError("Error", message);
    });
    // throws an error not through napi
    throwSimple = napiErrorHandler(function () {
        throw new Error("Simple error");
    });
}
describe("napiErrorHandler", function () {
    const classInstance = new SomeJsClass();

    it("should throw ArgumentError", function () {
        assert.throws(
            () => classInstance.throwError("ArgumentError"),
            ArgumentError,
            "Test error",
        );
    });

    it("should throw AuthenticationError", function () {
        assert.throws(
            () => classInstance.throwError("AuthenticationError"),
            AuthenticationError,
            "Test error",
        );
    });

    // TODO: Fix after adding support for fields in errors
    // it("should throw BusyConnectionError", function () {
    //     assert.throws(
    //         () => classInstance.throwError("BusyConnectionError"),
    //         BusyConnectionError,
    //         "Test error",
    //     );
    // });

    it("should throw DriverError", function () {
        assert.throws(
            () => classInstance.throwError("DriverError"),
            DriverError,
            "Test error",
        );
    });

    it("should throw DriverInternalError", function () {
        assert.throws(
            () => classInstance.throwError("DriverInternalError"),
            DriverInternalError,
            "Test error",
        );
    });

    // TODO: Fix after adding support for fields in errors
    // it("should throw NoHostAvailableError", function () {
    //     assert.throws(
    //         () => classInstance.throwError("NoHostAvailableError"),
    //         NoHostAvailableError,
    //         "Test error",
    //     );
    // });

    it("should throw NotSupportedError", function () {
        assert.throws(
            () => classInstance.throwError("NotSupportedError"),
            NotSupportedError,
            "Test error",
        );
    });

    // TODO: Fix after adding support for fields in errors
    // it("should throw OperationTimedOutError", function () {
    //     assert.throws(
    //         () => classInstance.throwError("OperationTimedOutError"),
    //         OperationTimedOutError,
    //         "Test error",
    //     );
    // });

    // TODO: Fix after adding support for fields in errors
    // it("should throw ResponseError", function () {
    //     assert.throws(
    //         () => classInstance.throwError("ResponseError"),
    //         ResponseError,
    //         "Test error",
    //     );
    // });

    it("should throw Error", function () {
        assert.throws(
            () => classInstance.throwError("Error"),
            Error,
            "Test error",
        );
    });

    it("should throw RangeError", function () {
        assert.throws(
            () => classInstance.throwError("RangeError"),
            RangeError,
            "Test error",
        );
    });

    it("should throw ReferenceError", function () {
        assert.throws(
            () => classInstance.throwError("ReferenceError"),
            ReferenceError,
            "Test error",
        );
    });

    it("should throw SyntaxError", function () {
        assert.throws(
            () => classInstance.throwError("SyntaxError"),
            SyntaxError,
            "Test error",
        );
    });

    it("should throw TypeError", function () {
        assert.throws(
            () => classInstance.throwError("TypeError"),
            TypeError,
            "Test error",
        );
    });

    it("should throw Error with custom message", function () {
        assert.throws(
            () => classInstance.throwMessage("Example message"),
            Error,
            "Example message",
        );
    });

    it("should throw Error with special characters", function () {
        assert.throws(
            () => classInstance.throwMessage("##Example # message # ##"),
            Error,
            "##Example # message # ##",
        );
    });

    it("should rethrow simple error", function () {
        assert.throws(() => classInstance.throwSimple(), Error, "Simple error");
    });
});
