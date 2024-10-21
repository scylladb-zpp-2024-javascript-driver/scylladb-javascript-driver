"use strict";

const { assert } = require("chai");
const sinon = require("sinon");

const ResultMapper = require("../../../lib/mapping/result-mapper");

describe("ResultMapper", function () {
  describe("getSelectAdapter()", function () {
    it("should return a function that maps row values into object values", () => {
      const suffix = "Prop";
      const rs = { columns: [{ name: "col1" }, { name: "col2" }] };
      const info = sinon.spy({
        newInstance: () => ({}),
        getPropertyName: (name) => name + suffix,
        getToModelFn: () => null,
      });

      const fn = ResultMapper.getSelectAdapter(info, rs);
      assert.isFunction(fn);
      assert.equal(info.newInstance.callCount, 0);
      assert.equal(info.getPropertyName.callCount, rs.columns.length);

      // Two parameters: function rowAdapter(row, info) {}
      assert.equal(fn.length, 2);
      const row = { col1: "a", col2: {} };

      // It should changed the name of the columns into props
      const obj = fn(row, info);
      assert.strictEqual(obj["col1" + suffix], row.col1);
      assert.strictEqual(obj["col2" + suffix], row.col2);
      // Should have called newInstance()
      assert.equal(info.newInstance.callCount, 1);
    });

    it("should use user defined mapping functions ", () => {
      const suffixProperty = "Prop";
      const suffixValue = "_value";
      const rs = { columns: [{ name: "col1" }, { name: "col2" }] };
      const info = sinon.spy({
        newInstance: () => ({}),
        getPropertyName: (name) => name + suffixProperty,
        getToModelFn: (columnName) =>
          columnName === "col2" ? (v) => v + suffixValue : null,
      });

      const fn = ResultMapper.getSelectAdapter(info, rs);
      const row = { col1: "a", col2: "b" };

      const obj = fn(row, info);
      // Mapping function adds a suffix
      assert.strictEqual(obj["col2" + suffixProperty], row.col2 + suffixValue);
      // No mapping function
      assert.strictEqual(obj["col1" + suffixProperty], row.col1);
    });
  });
});
