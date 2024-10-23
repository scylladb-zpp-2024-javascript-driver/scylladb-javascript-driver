"use strict";
const assert = require("assert");
const helper = require("../../test-helper");
const moduleName = "../../../lib/geometry/point";
const Point = require(moduleName);

describe("Point", function () {
  it("tests not supported error", function () {
    assert.throws(function () {
      new Point(1, 1);
    }, ReferenceError);
  });
});
