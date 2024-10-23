"use strict";

const {markAsNotSupported} = require("../../new_utils")

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function GraphResultSet(result, rowParser) {
  markAsNotSupported("class", "GraphResultSet");
  /**
   * @deprecated Not supported by the driver. Usage will throw an error.
   */
  this.first = function first() {
    markAsNotSupported("function", "GraphResultSet.first");
  };

  /**
   * @deprecated Not supported by the driver. Usage will throw an error.
   */
  this.forEach = function forEach(callback, thisArg) {
    markAsNotSupported("function", "GraphResultSet.forEach");
  };

  /**
   * @deprecated Not supported by the driver. Usage will throw an error.
   */
  this.toArray = function toArray() {
    markAsNotSupported("function", "GraphResultSet.toArray");
  };

  /**
   * @deprecated Not supported by the driver. Usage will throw an error.
   */
  this.values = function* values() {
    markAsNotSupported("function", "GraphResultSet.values");
  };

  /**
   * @deprecated Not supported by the driver. Usage will throw an error.
   */
  this.getTraversers = function* () {
    markAsNotSupported("function", "GraphResultSet.getTraversers");
  };
}

module.exports = GraphResultSet;
