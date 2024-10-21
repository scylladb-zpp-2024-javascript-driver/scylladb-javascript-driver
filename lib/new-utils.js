"use strict";

const Long = require("long");
const maxInt = BigInt(0x100000000);
const minuOne = BigInt(-1);

/**
 * Converts from bigint provided by napi into Long type used by the datastax library
 * @param {bigint} from
 * @returns {Long}
 */
function bigint_to_long(from) {
  let lo = from % maxInt;
  let hi = from / maxInt;
  if (lo < 0) hi += minuOne;
  return Long.fromValue({ low: Number(lo), high: Number(hi), unsigned: false });
}

/**
 * Converts from Long type used by the datastax library into bigint used by napi
 * @param {Long} from
 * @returns {bigint}
 */
function long_to_bigint(from) {
  let lo = BigInt(from.low);
  let hi = BigInt(from.high);
  let r = lo + maxInt * hi;
  if (lo < 0) r += maxInt;
  return r;
}

exports.bigint_to_long = bigint_to_long;
exports.long_to_bigint = long_to_bigint;
