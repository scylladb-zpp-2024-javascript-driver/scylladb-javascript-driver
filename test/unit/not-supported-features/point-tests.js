"use strict";
const assert = require("assert");
const Point = require("../../../lib/geometry/point");

describe("Point", function () {
    it("tests not supported error", function () {
        assert.throws(function () {
            new Point(1, 1);
        }, ReferenceError);
    });
});
