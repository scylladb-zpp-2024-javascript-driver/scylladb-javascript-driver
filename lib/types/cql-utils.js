"use strict";

const rust = require("../../index");
const {
  PreparedStatementWrapper,
  CqlTypes,
  QueryParameterWrapper,
} = require("../../index");
const { ArgumentError } = require("../errors");

/**
 *
 * @param {CqlTypes} type
 * @param {*} value
 * @returns {QueryParameterWrapper}
 */
function getWrapped(type, value) {
  switch (type) {
    case rust.CqlTypes.Ascii:
      return QueryParameterWrapper.fromAscii(value);
    case rust.CqlTypes.Blob:
      return QueryParameterWrapper.fromBlob(value);
    case rust.CqlTypes.Boolean:
      return QueryParameterWrapper.fromBoolean(value);
    case rust.CqlTypes.Counter:
      return QueryParameterWrapper.fromCounter(value);
    case rust.CqlTypes.Double:
      return QueryParameterWrapper.fromDouble(value);
    case rust.CqlTypes.Float:
      return QueryParameterWrapper.fromFloat(value);
    case rust.CqlTypes.Int:
      return QueryParameterWrapper.fromInt(value);
    case rust.CqlTypes.Set:
      return QueryParameterWrapper.fromSet(value);
    case rust.CqlTypes.Text:
      return QueryParameterWrapper.fromText(value);
    case rust.CqlTypes.SmallInt:
      return QueryParameterWrapper.fromSmallInt(value);
    case rust.CqlTypes.TinyInt:
      return QueryParameterWrapper.fromTinyInt(value);

    default:
      // Or not yet implemented type ;)
      throw new ReferenceError("[INTERNAL DRIVER ERROR??] Unknown type");
  }
}

/**
 *
 * @param {PreparedStatementWrapper} preparedStatement
 * @param {Array<QueryParameterWrapper>} params
 */
function parseParams(preparedStatement, params) {
  let expectedTypes = preparedStatement.getExpectedTypes();
  if (expectedTypes.length == 0 && !params) return [];
  if (params.length != expectedTypes.length)
    throw new ArgumentError(
      "Length of expected and provided parameters don't match",
    );
  let res = [];
  for (let i = 0; i < expectedTypes.length; i++) {
    res.push(getWrapped(expectedTypes[i], params[i]));
  }
  return res;
}

module.exports.parseParams = parseParams;
