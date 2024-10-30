"use strict";
const { assert } = require("chai");
const main = require("../../main");

describe("Version", function () {
    it("should be able to get driver version", function () {
        // Although the driver doesn't mention exposing own version anywhere,
        // there exist integration test that checks existence of version in exposed api.
        assert.isNotEmpty(main.version, "Driver version is not available");
    });
});
