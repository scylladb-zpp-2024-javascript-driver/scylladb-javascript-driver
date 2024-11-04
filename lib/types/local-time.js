"use strict";
const Long = require("long");
const util = require("util");
const utils = require("../utils");
const rust = require("../../index");
const { bigintToLong, longToBigint } = require("../new-utils");
/** @module types */

/**
 * @const
 * @private
 * */
const maxNanos = Long.fromString("86399999999999");
/**
 * Nanoseconds in a millisecond
 * @const
 * @private
 * */
const nanoSecInMillis = Long.fromNumber(1000000);
/**
 * Milliseconds in day
 * @const
 * @private
 * */
const millisInDay = 86400000;

/**
 * A time without a time-zone in the ISO-8601 calendar system, such as 10:30:05.
 * LocalTime is an immutable date-time object that represents a time,
 * often viewed as hour-minute-second. Time is represented to nanosecond precision.
 * For example, the value "13:45.30.123456789" can be stored in a LocalTime.
 */
class LocalTime {
    /**
     * @type {rust.LocalTimeWrapper}
     * @private
     */
    #internal;

    /**
     * Creates a new instance of LocalTime.
     * @param {Long} totalNanoseconds Total nanoseconds since midnight.
     */
    constructor(totalNanoseconds) {
        if (!(totalNanoseconds instanceof Long)) {
            throw new TypeError(
                "You must specify a Long value as totalNanoseconds",
            );
        }
        if (
            totalNanoseconds.lessThan(Long.ZERO) ||
            totalNanoseconds.greaterThan(maxNanos)
        ) {
            throw new TypeError("Total nanoseconds out of range");
        }

        this.#internal = rust.LocalTimeWrapper.new(
            longToBigint(totalNanoseconds),
        );
    }

    /**
     * Gets the nanoseconds, a number from 0 to 999 999 999.
     * @readonly
     * @type {Number}
     */
    get nanosecond() {
        return this.#internal.nanosecond;
    }

    set nanosecond(_) {
        throw new SyntaxError("LocalTime nanosecond is read-only");
    }

    /**
     * Gets the seconds, a number from 0 to 59.
     * @readonly
     * @type {Number}
     */
    get second() {
        return this.#internal.second;
    }

    set second(_) {
        throw new SyntaxError("LocalTime second is read-only");
    }

    /**
     * Gets the minutes, a number from 0 to 59.
     * @readonly
     * @type {Number}
     */
    get minute() {
        return this.#internal.minute;
    }

    set minute(_) {
        throw new SyntaxError("LocalTime minute is read-only");
    }

    /**
     * Gets the hours, a number from 0 to 24.
     * @readonly
     * @type {Number}
     */
    get hour() {
        return this.#internal.hour;
    }

    set hour(_) {
        throw new SyntaxError("LocalTime hour is read-only");
    }

    /**
     * Parses an string representation and returns a new LocalDate.
     * @param {string} value
     * @returns {LocalTime}
     */
    static fromString(value) {
        if (typeof value !== "string") {
            throw new TypeError(
                `Argument type invalid: ${util.inspect(value)}, expected string type`,
            );
        }

        const parts = value.split(":");
        let millis =
            parseInt(parts[0], 10) * 3600000 + parseInt(parts[1], 10) * 60000;
        let nanos;
        if (parts.length === 3) {
            const secParts = parts[2].split(".");
            millis += parseInt(secParts[0], 10) * 1000;
            if (secParts.length === 2) {
                nanos = secParts[1];
                // add zeros at the end
                nanos = nanos + utils.stringRepeat("0", 9 - nanos.length);
            }
        }
        return LocalTime.fromMilliseconds(millis, parseInt(nanos, 10) || 0);
    }

    /**
     * Uses the current local time (in milliseconds) and the nanoseconds to create a new instance of LocalTime
     * @param {Number} [nanoseconds=0] A Number from 0 to 999 999 999 representing the time nanosecond portion.
     * @returns {LocalTime}
     */
    static now(nanoseconds) {
        return LocalTime.fromDate(new Date(), nanoseconds);
    }

    /**
     * Uses the provided local time (in milliseconds) and the nanoseconds to create a new instance of LocalTime
     * @param {Date} date Local date portion to extract the time passed since midnight.
     * @param {Number} [nanoseconds=0] A Number from 0 to 999 999 999 representing the nanosecond time portion.
     * @returns {LocalTime}
     */
    static fromDate(date, nanoseconds) {
        if (!(date instanceof Date)) {
            throw new TypeError("Not a valid date");
        }
        // Uses the local date with the time zone, takes the number of milliseconds from midnight.
        const millis =
            (date.getTime() + date.getTimezoneOffset() * -60000) % millisInDay;
        return LocalTime.fromMilliseconds(millis, nanoseconds);
    }

    /**
     * Uses the provided local time (in milliseconds) and the nanoseconds to create a new instance of LocalTime
     * @param {Number} milliseconds A Number from 0 to 86 399 999.
     * @param {Number} [nanoseconds=0] A Number from 0 to 999 999 999 representing the time nanosecond portion.
     * @returns {LocalTime}
     */
    static fromMilliseconds(milliseconds, nanoseconds) {
        if (typeof nanoseconds !== "number") {
            nanoseconds = 0;
        }
        return new LocalTime(
            Long.fromNumber(milliseconds)
                .multiply(nanoSecInMillis)
                .add(Long.fromNumber(nanoseconds)),
        );
    }

    /**
     * Creates a new instance of LocalTime from the bytes representation.
     * @param {Buffer} value
     * @returns {LocalTime}
     */
    static fromBuffer(value) {
        if (!(value instanceof Buffer)) {
            throw new TypeError(
                `Expected Buffer, obtained ${utils.util.inspect(value)}`,
            );
        }
        return new LocalTime(
            new Long(value.readInt32BE(4), value.readInt32BE(0)),
        );
    }

    /**
     * Compares this LocalTime with the given one.
     * @param {LocalTime} other time to compare against.
     * @return {number} 0 if they are the same, 1 if this object is larger,
     * -1 if the given object is larger.
     */
    compare(other) {
        return this.getTotalNanoseconds().compare(other.getTotalNanoseconds());
    }

    /**
     * Returns true if the objects are the same, false otherwise.
     * @param {LocalTime} other
     * @returns {Boolean}
     */
    equals(other) {
        return other instanceof LocalTime && this.compare(other) === 0;
    }

    /**
     * Gets the total amount of nanoseconds since midnight for this instance.
     * @return {Long}
     */
    getTotalNanoseconds() {
        return bigintToLong(this.#internal.value);
    }

    /**
     * Provide the name of the constructor and the string representation
     * @returns {string}
     */
    inspect() {
        return `${this.constructor.name}: ${this.toString()}`;
    }

    /**
     * Returns a big-endian bytes representation of the instance
     * @returns {Buffer}
     */
    toBuffer() {
        const buffer = utils.allocBufferUnsafe(8);
        buffer.writeUInt32BE(
            this.getTotalNanoseconds().getHighBitsUnsigned(),
            0,
        );
        buffer.writeUInt32BE(
            this.getTotalNanoseconds().getLowBitsUnsigned(),
            4,
        );
        return buffer;
    }

    /**
     * Returns the string representation of the instance in the form of hh:MM:ss.ns
     * @returns {string}
     */
    toString() {
        let result;
        if (this.#internal.hour < 10) {
            result = "0" + this.#internal.hour + ":";
        } else {
            result = this.#internal.hour + ":";
        }
        if (this.#internal.minute < 10) {
            result += "0" + this.#internal.minute + ":";
        } else {
            result += this.#internal.minute + ":";
        }
        if (this.#internal.second < 10) {
            result += "0" + this.#internal.second;
        } else {
            result += this.#internal.second;
        }
        if (this.#internal.nanosecond > 0) {
            let nanos = this.#internal.nanosecond.toString();
            // nine digits
            if (nanos.length < 9) {
                nanos = utils.stringRepeat("0", 9 - nanos.length) + nanos;
            }
            let lastPosition;
            for (let i = nanos.length - 1; i > 0; i--) {
                if (nanos[i] !== "0") {
                    break;
                }
                lastPosition = i;
            }
            if (lastPosition) {
                nanos = nanos.substring(0, lastPosition);
            }
            result += "." + nanos;
        }
        return result;
    }

    /**
     * Gets the string representation of the instance in the form: hh:MM:ss.ns
     * @returns {string}
     */
    toJSON() {
        return this.toString();
    }
}
module.exports = LocalTime;
