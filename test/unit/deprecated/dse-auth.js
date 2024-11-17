"use strict";
const assert = require("assert");
const DsePlainTextAuthProvider = require("../../../lib/datastax/deprecated-auth/dse-plain-text-auth-provider");
const DseGssapiAuthProvider = require("../../../lib/datastax/deprecated-auth/dse-gssapi-auth-provider");

describe("DsePlainTextAuthProvider", function () {
    it("tests not supported error", function () {
        assert.throws(
            function () {
                new DsePlainTextAuthProvider();
            },
            {
                name: "ReferenceError",
                message:
                    "DsePlainTextAuthProvider.constructor is not supported by our driver",
            },
        );
    });
});

describe("DseGssapiAuthProvider", function () {
    it("tests not supported error", function () {
        assert.throws(
            function () {
                new DseGssapiAuthProvider();
            },
            {
                name: "ReferenceError",
                message:
                    "DseGssapiAuthProvider.constructor is not supported by our driver",
            },
        );
    });
});
