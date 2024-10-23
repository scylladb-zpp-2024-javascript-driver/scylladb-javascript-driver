"use strict";
const assert = require("assert");
const helper = require("../../test-helper");
const moduleName = "../../../lib/geometry/line-string";
const LineString = require(moduleName);

describe("LineString", function () {
  it("tests not supported error", function () {
    assert.throws(function () {
      new LineString();
    }, ReferenceError);
  });
});
