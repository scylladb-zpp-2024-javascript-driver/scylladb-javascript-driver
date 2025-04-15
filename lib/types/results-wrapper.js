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
 * Checks the type of value wrapper object and gets it from the underlying value
 * @param {rust.CqlValueWrapper} field
 * @returns {any}
 */
function getCqlObject(field) {
    if (field == null) return null;
    let type = field.getType();
    let res, fields;
    switch (type) {
        case rust.CqlType.Ascii:
            return field.getAscii();
        case rust.CqlType.BigInt:
            return bigintToLong(field.getBigint());
        case rust.CqlType.Blob:
            return field.getBlob();
        case rust.CqlType.Boolean:
            return field.getBoolean();
        case rust.CqlType.Counter:
            return field.getCounter();
        case rust.CqlType.Date:
            return LocalDate.fromRust(field.getLocalDate());
        case rust.CqlType.Double:
            return field.getDouble();
        case rust.CqlType.Duration:
            return Duration.fromRust(field.getDuration());
        case rust.CqlType.Empty:
            return null;
        case rust.CqlType.Float:
            return field.getFloat();
        case rust.CqlType.Int:
            return field.getInt();
        case rust.CqlType.Set:
            res = [];
            fields = field.getSet();
            for (let i = 0; i < fields.length; i++)
                res.push(getCqlObject(fields[i]));
            return res;
        case rust.CqlType.Text:
            return field.getText();
        case rust.CqlType.Timestamp:
            // Currently only values inside Date safe range are supported
            // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date#the_epoch_timestamps_and_invalid_date
            // The same problem exists in Datastax driver. This probably should be fixed at some point,
            // but it's unlikely someone will need timestamps almost 300.000 years into the future.
            return new Date(Number(field.getTimestamp()));
        case rust.CqlType.List:
            fields = field.getList();
            return fields.map((value) => getCqlObject(value));
        case rust.CqlType.Map:
            fields = field.getMap();
            res = {};
            for (let i = 0; i < fields.length; i++)
                res[getCqlObject(fields[i][0])] = getCqlObject(fields[i][1]);
            return res;
        case rust.CqlType.SmallInt:
            return field.getSmallInt();
        case rust.CqlType.TinyInt:
            return field.getTinyInt();
        case rust.CqlType.Uuid:
            return Uuid.fromRust(field.getUuid());
        case rust.CqlType.Timeuuid:
            return TimeUuid.fromRust(field.getTimeUuid());
        case rust.CqlType.Time:
            return LocalTime.fromRust(field.getLocalTime());
        case rust.CqlType.Inet:
            return InetAddress.fromRust(field.getInet());
        case rust.CqlType.Tuple:
            return Tuple.fromRust(field.getTuple());
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
