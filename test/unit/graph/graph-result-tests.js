"use strict";

const assert = require("assert");
const GraphResultSet = require("../../../lib/datastax/graph/result-set");

describe("GraphResultSet", function () {
    it("tests not supported error", function () {
        assert.throws(function () {
            new GraphResultSet();
        }, ReferenceError);
    });
    it("tests the not supported error message", function () {
        assert.throws(
            function () {
                new GraphResultSet();
            },
            {
                name: "ReferenceError",
                message:
                    "The class (GraphResultSet) is not supported by our driver",
            },
        );
    });
});
