"use strict";
const assert = require("assert");
const LineString = require("../../../lib/geometry/line-string");

describe("LineString", function () {
    it("tests not supported error", function () {
        assert.throws(function () {
            new LineString();
        }, ReferenceError);
    });
});
