"use strict";
const utils = require("../utils");
const rust = require("../../index");
/** @module types */

/**
 * 2^31 days before unix epoch is -5877641-06-23. This is the first day that can be represented by this class.
 * @const
 */
const dateCenter = Math.pow(2, 31);

/**
 * Maximum number of days from 01.01.1970 supported by the class (i32::MAX in Rust).
 * @const
 */
const maxDay = 2147483647;

/**
 * Minimum number of days from 01.01.1970 supported by the class (i32::MIN in Rust).
 * @const
 */
const minDay = -2147483648;

/**
 * @const
 */
const millisecondsPerDay = 86400000;
/**
 * A date without a time-zone in the ISO-8601 calendar system, such as 2010-08-05.
 *
 * LocalDate is an immutable object that represents a date, often viewed as year-month-day. For example, the value "1st October 2014" can be stored in a LocalDate.
 *
 * This class does not store or represent a time or time-zone. Instead, it is a description of the date, as used for birthdays.
 * It cannot represent an instant on the time-line without additional information such as an offset or time-zone.
 *
 * Note that this type can represent dates in the range [-5877641-06-23; 5881580-07-17]
 * while the ES5 date type can only represent values in the range of [-271821-04-20; 275760-09-13].
 * In the event that year, month, day parameters do not fall within the ES5 date range an Error will be thrown.
 * If you wish to represent a date outside of this range, pass a single
 * parameter indicating the days since epoch. For example, -1 represents 1969-12-31.
 * @property {Date} date The date representation if falls within a range of an ES5 data type, otherwise an invalid date.
 */
class LocalDate {
    /**
     * @type {rust.LocalTimeWrapper}
     * @private
     */
    #inner;

    /**
     * Creates a new instance of LocalDate.
     * @param {Number} year The year or days since epoch.  If days since epoch, month and day should not be provided.
     * @param {Number} month Between 1 and 12 inclusive.
     * @param {Number} day Between 1 and the number of days in the given month of the given year.
     */
    constructor(year, month, day) {
        // implementation detail: internally uses a UTC based date
        if (
            typeof year === "number" &&
            typeof month === "number" &&
            typeof day === "number"
        ) {
            // It will throw an error if the values are wrong.
            this.#inner = rust.LocalDateWrapper.new(day, month, year);
            if (!this.#inner.inDate) {
                throw new Error("You must provide a valid year, month and day");
            }
        } else if (
            typeof year === "number" &&
            typeof month === "undefined" &&
            typeof day === "undefined"
        ) {
            // In days since epoch.
            if (year < minDay || year > maxDay) {
                throw new Error(
                    `You must provide a valid value for days since epoch (${minDay} <= value <= ${maxDay}).`,
                );
            }
            this.#inner = rust.LocalDateWrapper.newDay(year);
        } else {
            throw new Error("You must provide a valid year, month and day");
        }
    }

    /**
     * A number representing the year. May return NaN if cannot be represented as a Date.
     * @readonly
     * @type {Number}
     */
    get year() {
        return this.#inner.inDate ? this.#inner.getDate().year : NaN;
    }

    set year(_) {
        throw new SyntaxError("LocalDate year is read-only");
    }

    /**
     * A number between 1 and 12 inclusive representing the month.
     * May return NaN if cannot be represented as a Date.
     * @readonly
     * @type {Number}
     */
    get month() {
        return this.#inner.inDate ? this.#inner.getDate().month : NaN;
    }

    set month(_) {
        throw new SyntaxError("LocalDate month is read-only");
    }

    /**
     * A number between 1 and the number of days in the given month of the given year (value up to 31).
     * May return NaN if cannot be represented as a Date.
     * @readonly
     * @type {Number}
     */
    get day() {
        return this.#inner.inDate ? this.#inner.getDate().day : NaN;
    }

    set day(_) {
        throw new SyntaxError("LocalDate day is read-only");
    }

    /**
     * If date cannot be represented yet given a valid days since epoch, track it internally.
     * @readonly
     * @deprecated This member is in Datastax documentation, but it seems to not be exposed in the API.
     * Additionally we added a new class member: `value` that always returns days since epoch regardless of the date.
     * @type {Number}
     */
    get _value() {
        return this.#inner.inDate ? null : this.#inner.value;
    }

    set _value(_) {
        throw new SyntaxError("LocalDate _value is read-only");
    }

    /**
     * Always valid amount of days since epoch.
     * @readonly
     * @type {Number}
     */
    get value() {
        return this.#inner.value;
    }

    set value(_) {
        throw new SyntaxError("LocalDate value is read-only");
    }

    /**
     * Date object represent this date.
     * @readonly
     * @type {Date}
     */
    get date() {
        return new Date(this.#inner.value * millisecondsPerDay);
    }

    set date(_) {
        throw new SyntaxError("LocalDate date is read-only");
    }

    /**
     * Creates a new instance of LocalDate using the current year, month and day from the system clock in the default time-zone.
     */
    static now() {
        return LocalDate.fromDate(new Date());
    }

    /**
     * Creates a new instance of LocalDate using the current date from the system clock at UTC.
     */
    static utcNow() {
        return LocalDate.fromDate(Date.now());
    }

    /**
     * Creates a new instance of LocalDate using the year, month and day from the provided local date time.
     * @param {Date} date
     * @returns {LocalDate}
     */
    static fromDate(date) {
        if (isNaN(date.getTime())) {
            throw new TypeError(`Invalid date: ${date}`);
        }
        return new LocalDate(
            date.getFullYear(),
            date.getMonth() + 1, // getMonth() returns the month index 0..11, and the need for a number 1..12
            date.getDate(),
        );
    }

    /**
     * Creates a new instance of LocalDate using the year, month and day provided in the form: yyyy-mm-dd or
     * days since epoch (i.e. -1 for Dec 31, 1969).
     * @param {string} value
     * @returns {LocalDate}
     */
    static fromString(value) {
        let days = rust.LocalDateWrapper.fromString(value);
        return new LocalDate(days);
    }

    /**
     * Creates a new instance of LocalDate using the bytes representation.
     * @param {Buffer} buffer
     * @returns {LocalDate}
     */
    static fromBuffer(buffer) {
        // move to unix epoch: 0.
        return new LocalDate(buffer.readUInt32BE(0) - dateCenter);
    }

    /**
     * Compares this LocalDate with the given one.
     * @param {LocalDate} other date to compare against.
     * @return {number} 0 if they are the same, 1 if the this is greater, and -1
     * if the given one is greater.
     */
    compare(other) {
        if (this.value == other.value) {
            return 0;
        } else if (this.value > other.value) {
            return 1;
        }
        return -1;
    }

    /**
     * Returns true if the value of the LocalDate instance and other are the same
     * @param {LocalDate} other
     * @returns {Boolean}
     */
    equals(other) {
        return other instanceof LocalDate && this.compare(other) === 0;
    }

    /**
     * Provide the name of the constructor and the string representation
     * @returns {string}
     */
    inspect() {
        return `${this.constructor.name} : ${this.toString()}`;
    }

    /**
     * Gets the bytes representation of the instance.
     * @returns {Buffer}
     */
    toBuffer() {
        // days since unix epoch
        const value = this.#inner.value + dateCenter;
        const buf = utils.allocBufferUnsafe(4);
        buf.writeUInt32BE(value, 0);
        return buf;
    }

    /**
     * Gets the string representation of the instance in the form: yyyy-mm-dd if
     * the value can be parsed as a Date, otherwise days since epoch.
     * @returns {string}
     */
    toString() {
        return this.#inner.toString();
    }

    /**
     * Gets the string representation of the instance in the form: yyyy-mm-dd, valid for JSON.
     * @returns {string}
     */
    toJSON() {
        return this.toString();
    }

    /**
     * Get LocalDate from rust object.
     * @package
     * @param {rust.LocalDateWrapper} arg
     * @returns {LocalDate}
     */
    static fromRust(arg) {
        return new LocalDate(arg.value);
    }

    /**
     * @package
     * @returns {rust.LocalDateWrapper}
     */
    getInternal() {
        return this.#inner;
    }
}
module.exports = LocalDate;
