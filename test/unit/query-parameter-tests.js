"use strict";
const rust = require("../../index");
const { getWrapped } = require("../../lib/types/cql-utils");
const Duration = require("../../lib/types/duration");

const testCases = [
    ["Duration", new Duration(21, 3, 7)],
    ["List", ["Test value", "Some other funny value"]],
    ["Map", { Text: 0.1, Text2: 0.2 }],
    ["Set", [4, 7, 15]],
];

describe("Should correctly convert values into QueryParameterWrapper", function () {
    testCases.forEach((test) => {
        it(test[0], function () {
            let value = test[1];
            let expectedType = rust.testsFromValueGetType(test[0]);
            let converted = getWrapped(expectedType, value);
            // Assertion appears in rust code
            rust.testsFromValue(test[0], converted);
        });
    });
});
