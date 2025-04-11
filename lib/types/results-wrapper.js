"use strict";

const rust = require("../../index");
const Uuid = require("./uuid");
const TimeUuid = require("./time-uuid");
const Duration = require("./duration");
const LocalTime = require("./local-time");
const InetAddress = require("./inet-address");
const LocalDate = require("./local-date");
const { bigintToLong } = require("../new-utils");
const Row = require("./row");

/**
 * Checks the type of value wrapper object and gets it from the underlying value
 * @param {rust.CqlValueWrapper} field
 * @returns {any}
 */
function getCqlObject(field) {
    if (field == null) return null;

    if (field instanceof rust.LocalDateWrapper) {
        return LocalDate.fromRust(field);
    }
    if (field instanceof rust.DurationWrapper) {
        return Duration.fromRust(field);
    }
    if (field instanceof rust.TimeUuidWrapper) {
        return TimeUuid.fromRust(field);
    }
    if (field instanceof rust.UuidWrapper) {
        return Uuid.fromRust(field);
    }
    if (field instanceof rust.InetAddressWrapper) {
        return InetAddress.fromRust(field);
    }
    if (field instanceof rust.LocalTimeWrapper) {
        return LocalTime.fromRust(field);
    }
    if (Array.isArray(field)) {
        if (field.length == 2 && field[0] instanceof rust.CqlTypeClass) {
            let res;
            switch (field[0].typ) {
                case rust.CqlType.BigInt:
                    return bigintToLong(field[1]);
                case rust.CqlType.Counter:
                    return field[1];
                case rust.CqlType.Timestamp:
                    // Currently only values inside Date safe range are supported
                    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_epoch_timestamps_and_invalid_date
                    // The same problem exists in Datastax driver. This probably should be fixed at some point,
                    // but it's unlikely someone will need timestamps almost 300.000 years into the future.
                    return new Date(Number(field[1]));
                case rust.CqlType.Map:
                    res = {};
                    for (let i = 0; i < field[1].length; i++)
                        res[getCqlObject(field[1][i][0])] = getCqlObject(
                            field[1][i][1],
                        );
                    return res;
                default:
                    throw new Error("Unexpected type");
            }
        }
        return field.map((value) => getCqlObject(value));
    }
    return field;
}

/**
 * Simple way of getting results from rust driver.
 * Call the driver O(columns * rows) times
 * @param {rust.QueryResultWrapper} result
 * @returns {Array<Row> | undefined} Returns array of rows if ResultWrapper has any, and undefined otherwise
 */
function getRowsFromResultsWrapper(result) {
    let rustRows = result.getRows();
    if (rustRows == null) {
        // Empty results are treated as undefined
        return undefined;
    }

    let colNames = result.getColumnsNames();
    let rows = [];

    for (let i = 0; i < rustRows.length; i++) {
        let cols = rustRows[i].getColumns();
        let collectedRow = new Row(colNames);
        for (let j = 0; j < cols.length; j++) {
            // By default driver returns row as a map:
            //   column name -> column value
            collectedRow[colNames[j]] = getCqlObject(cols[j]);
        }
        rows.push(collectedRow);
    }

    return rows;
}

/**
 *
 * @param {rust.QueryResultWrapper} result
 * @returns {Array.<{name, type}>}
 */
function getColumnsMetadata(result) {
    let res = [];
    let columnsWrapper = result.getColumnsSpecs();
    for (let i = 0; i < columnsWrapper.length; i++) {
        let e = columnsWrapper[i];
        res.push({
            ksname: e.ksname,
            tablename: e.tablename,
            name: e.name,
            // TODO: setup correctly type and info
            type: { code: e.typeCode.valueOf(), type: null, info: null },
        });
    }
    return res;
}

module.exports.getCqlObject = getCqlObject;
module.exports.getRowsFromResultsWrapper = getRowsFromResultsWrapper;
module.exports.getColumnsMetadata = getColumnsMetadata;
