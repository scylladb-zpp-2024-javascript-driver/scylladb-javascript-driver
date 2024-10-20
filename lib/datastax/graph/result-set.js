/**
 * @deprecated
 */
function GraphResultSet(result, rowParser) {
  throw new ReferenceError(
    `This class (GraphResultSet) is not supported by our driver`,
  );
  /**
   * @deprecated
   */
  this.first = function first() {
    throw new ReferenceError(
      `This function (GraphResultSet.first) is not supported by our driver`,
    );
  };

  /**
   * @deprecated
   */
  this.forEach = function forEach(callback, thisArg) {
    throw new ReferenceError(
      `This function (GraphResultSet.forEach) is not supported by our driver`,
    );
  };

  /**
   * @deprecated
   */
  this.toArray = function toArray() {
    throw new ReferenceError(
      `This function (GraphResultSet.toArray) is not supported by our driver`,
    );
  };

  /**
   * @deprecated
   */
  this.values = function* values() {
    throw new ReferenceError(
      `This function (GraphResultSet.values) is not supported by our driver`,
    );
  };

  /**
   * @deprecated
   */
  this.getTraversers = function* () {
    throw new ReferenceError(
      `This function (GraphResultSet.first) is not supported by our driver`,
    );
  };
}

module.exports = GraphResultSet;
