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
const Tuple = require("./tuple");

/**
 * Maps the value returned from the Rust driver into expected JS object.
 *
 * This function accepts the following kinds of arguments:
 *   1. `Value` ->  When can correctly handle the value based on the type;
 *   2. `[Type, Value]` ->  In case of ambiguity, rust side provides tuple of (CqlType, Value);
 *   3. `Array` -> Tuple in JS is represented as an array so we need to distinguish between the previous case
 *      and a case where the array is provided as value. We determine it based on the type of the first value.
 *
 * See rust.CqlValueWrapper, for more information
 * @param {rust.CqlValueWrapper} field
 * @returns {any}
 */
function getCqlObject(field) {
    switch (true) {
        case field === null:
            return null;
        case field instanceof rust.LocalDateWrapper:
            return LocalDate.fromRust(field);
        case field instanceof rust.DurationWrapper:
            return Duration.fromRust(field);
        case field instanceof rust.InetAddressWrapper:
            return InetAddress.fromRust(field);
        case field instanceof rust.LocalTimeWrapper:
            return LocalTime.fromRust(field);
    }

    if (Array.isArray(field)) {
        // Check if the returned value is in (Type, Value) format
        if (!(field.length === 2 && field[0] instanceof rust.CqlTypeClass)) {
            // If not, returned value represents array. We need to map each element of the array
            return field.map((value) => getCqlObject(value));
        }

        let res;
        let value = field[1];
        switch (field[0].typ) {
            case rust.CqlType.BigInt:
                return bigintToLong(value);
            case rust.CqlType.Counter:
                return value;
            case rust.CqlType.Timestamp:
                // Currently only values inside Date safe range are supported
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_epoch_timestamps_and_invalid_date
                // The same problem exists in Datastax driver. This probably should be fixed at some point,
                // but it's unlikely someone will need timestamps almost 300.000 years into the future.
                return new Date(Number(value));
            case rust.CqlType.Map:
                res = {};
                for (const keyValuePair of value) {
                    res[getCqlObject(keyValuePair[0])] = getCqlObject(
                        keyValuePair[1],
                    );
                }
                return res;
            case rust.CqlType.Timeuuid:
                return TimeUuid.fromRust(value);
            case rust.CqlType.Tuple:
                return Tuple.fromArray(
                    value.map((e) =>
                        e === null ? undefined : getCqlObject(e),
                    ),
                );
            case rust.CqlType.Uuid:
                return Uuid.fromRust(value);
            default:
                throw new Error("Unexpected type");
        }
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
        let cols = rustRows[i];
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
