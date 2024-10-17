"use strict";

const Long = require("long");

/**
 * Converts from bigint provided by napi into Long type used by the datastax library
 * @param {bigint} from
 * @returns {Long}
 */
function bigint_to_long(from) {
  return Long.fromString(from.toString());
}

/**
 * Converts from Long type used by the datastax library into bigint used by napi
 * @param {Long} from
 * @returns {bigint}
 */
function long_to_bigint(from) {
  return BigInt(from.toString());
}

exports.bigint_to_long = bigint_to_long;
exports.long_to_bigint = long_to_bigint;
