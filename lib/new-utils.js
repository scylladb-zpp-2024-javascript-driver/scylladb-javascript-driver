"use strict";

const Long = require("long");
const maxInt = BigInt(0x100000000);
const minuOne = BigInt(-1);

/**
 * Converts from bigint provided by napi into Long type used by the datastax library
 * BigInt is the way napi handles values too big for js Number type,
 * while Long is the way datastax parts of the code handle 64-bit integers.
 * @param {bigint} from
 * @returns {Long}
 */
function bigintToLong(from) {
  let lo = from % maxInt;
  let hi = from / maxInt;
  if (lo < 0) hi += minusOne;
  return Long.fromValue({ low: Number(lo), high: Number(hi), unsigned: false });
}

/**
 * Converts from Long type used by the datastax library into bigint used by napi
 * @param {Long} from
 * @returns {bigint}
 */
function longToBigint(from) {
  let lo = BigInt(from.low);
  let hi = BigInt(from.high);
  let r = lo + maxInt * hi;
  if (lo < 0) r += maxInt;
  return r;
}

exports.bigintToLong = bigintToLong;
exports.longToBigint = longToBigint;
