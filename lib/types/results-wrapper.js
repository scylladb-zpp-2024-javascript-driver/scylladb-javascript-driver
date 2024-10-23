"use strict";

const rust = require("../../index");
const Row = require("./row");

/**
 * Check the type of value wrapper object and gets it from the underlying value
 * @param {rust.CqlValueWrapper} field
 * @returns {any}
 */
function getCqlObject(field) {
  let type = field.getType();
  switch (type) {
    case rust.CqlTypes.Ascii:
      return field.getAscii();
    case rust.CqlTypes.Blob:
      return field.getBlob();
    case rust.CqlTypes.Boolean:
      return field.getBoolean();
    case rust.CqlTypes.Counter:
      return field.getCounter();
    case rust.CqlTypes.Double:
      return field.getDouble();
    case rust.CqlTypes.Float:
      return field.getFloat();
    case rust.CqlTypes.Int:
      return field.getInt();
    case rust.CqlTypes.Set:
      let res = [];
      let fields = field.getSet();
      for (let i = 0; i < fields.length; i++) res.push(getCqlObject(fields[i]));
      return res;
    case rust.CqlTypes.Text:
      return field.getText();
    case rust.CqlTypes.SmallInt:
      return field.getSmallInt();
    case rust.CqlTypes.TinyInt:
      return field.getTinyInt();

    default:
      return field.stringify();
  }
}

/**
 * Simple way of getting results from rust driver.
 * Call the driver O(columns * rows) times
 * @param {rust.QueryResultWrapper} result
 * @returns {Array<Row> | undefined} Returns array of rows if ResultWrapper has some, and undefined if has None
 */
function getRowsFromResultsWrapper(result) {
  try {
    let rust_rows = result.getRows();
    let col_names = result.getColumnsNames();
    let rows = [];
    for (let i = 0; i < rust_rows.length; i++) {
      let cols = rust_rows[i].getColumns();
      let cols_sum = {};
      for (let j = 0; j < cols.length; j++) {
        cols_sum[col_names[j]] = getCqlObject(cols[j]);
      }
      rows.push(cols_sum);
    }
    return rows;
  } catch (e) {
    if (typeof e === "Error" && e.message === "No rows") return undefined;
    // ToDo maybe add some logging?
    throw new Error(
      `Error wile getting rows from QueryResultWrapper. Internal message:\n${e.message}`,
    );
  }
}

module.exports.getCqlObject = getCqlObject;
module.exports.getRowsFromResultsWrapper = getRowsFromResultsWrapper;
