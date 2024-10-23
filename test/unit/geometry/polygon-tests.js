"use strict";
const assert = require("assert");
const Polygon = require("../../../lib/geometry/polygon");

describe("Polygon", function () {
    it("tests not supported error", function () {
        assert.throws(function () {
            new Polygon();
        }, ReferenceError);
    });
});
