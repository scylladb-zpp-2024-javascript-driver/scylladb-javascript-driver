"use strict";
const assert = require("assert");
const { DateRange, DateRangeBound } = require("../../../lib/datastax/search");

describe("DateRange", function () {
    it("tests not supported error", function () {
        assert.throws(function () {
            new DateRange();
        }, ReferenceError);
    });
});

describe("DateRangeBound", function () {
    it("tests not supported error", function () {
        assert.throws(function () {
            new DateRangeBound();
        }, ReferenceError);
    });
});
