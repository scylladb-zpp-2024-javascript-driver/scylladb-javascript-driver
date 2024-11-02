"use strict";

const rust = require("../../index");

/**
 * Checks the type of value wrapper object and gets it from the underlying value
 * @param {rust.CqlValueWrapper} field
 * @returns {any}
 */
function getCqlObject(field) {
    let type = field.getType();
    switch (type) {
        case rust.CqlType.Ascii:
            return field.getAscii();
        case rust.CqlType.Blob:
            return field.getBlob();
        case rust.CqlType.Boolean:
            return field.getBoolean();
        case rust.CqlType.Counter:
            return field.getCounter();
        case rust.CqlType.Double:
            return field.getDouble();
        case rust.CqlType.Float:
            return field.getFloat();
        case rust.CqlType.Int:
            return field.getInt();
        case rust.CqlType.Set:
            let res = [];
            let fields = field.getSet();
            for (let i = 0; i < fields.length; i++)
                res.push(getCqlObject(fields[i]));
            return res;
        case rust.CqlType.Text:
            return field.getText();
        case rust.CqlType.SmallInt:
            return field.getSmallInt();
        case rust.CqlType.TinyInt:
            return field.getTinyInt();

        default:
            // Temporarily returning string representation of the field
            return field.stringify();
    }
}

/**
 * Simple way of getting results from rust driver.
 * Call the driver O(columns * rows) times
 * @param {rust.QueryResultWrapper} result
 * @returns {Array<Row> | undefined} Returns array of rows if ResultWrapper has any, and undefined otherwise
 */
function getRowsFromResultsWrapper(result) {
    let rust_rows = result.getRows();
    if (rust_rows == null) {
        // Empty results are treated as undefined
        return undefined;
    }

    let col_names = result.getColumnsNames();
    let rows = [];

    for (let i = 0; i < rust_rows.length; i++) {
        let cols = rust_rows[i].getColumns();
        let collected_row = {};
        for (let j = 0; j < cols.length; j++) {
            // By default driver returns row as a map:
            //   column name -> column value
            collected_row[col_names[j]] = getCqlObject(cols[j]);
        }
        rows.push(collected_row);
    }

    return rows;
}

module.exports.getCqlObject = getCqlObject;
module.exports.getRowsFromResultsWrapper = getRowsFromResultsWrapper;
