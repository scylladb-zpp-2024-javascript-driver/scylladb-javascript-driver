"use strict";
const assert = require("assert");
const helper = require("../../test-helper");
const moduleName = "../../../lib/geometry/polygon";
const Polygon = require(moduleName);

describe("Polygon", function () {
  it("tests not supported error", function () {
    assert.throws(function () {
      new Polygon();
    }, ReferenceError);
  });
});
