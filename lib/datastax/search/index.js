"use strict";

const dateRangeModule = require("./date-range");

/**
 * Search module.
 * <p>
 *   Contains the classes to represent the set of  types for search data that come with DSE 5.1+
 * </p>
 * @module datastax/search
 */

exports.DateRange = dateRangeModule.DateRange;
exports.DateRangeBound = dateRangeModule.DateRangeBound;
exports.dateRangePrecision = dateRangeModule.dateRangePrecision;
