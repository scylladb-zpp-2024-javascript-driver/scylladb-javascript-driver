"use strict";

const utils = require("../utils");

/**
 * @deprecated
 */
function Element(id, label) {
  throw new ReferenceError(
    utils.markAsNotSupported("class", "Element")
  );
}

/**
 * @deprecated
 */
function Vertex(id, label, properties) {
  throw new ReferenceError(
    utils.markAsNotSupported("class", "Vertex")
  );
}

/**
 * @deprecated
 */
function Edge(id, outV, outVLabel, label, inV, inVLabel, properties) {
  throw new ReferenceError(
    utils.markAsNotSupported("class", "Edge")
);
}

/**
 * @deprecated
 */
function VertexProperty(id, label, value, properties) {
  throw new ReferenceError(
    utils.markAsNotSupported("class", "VertexProperty")
  );
}

/**
 * @deprecated
 */
function Property(key, value) {
  throw new ReferenceError(
    utils.markAsNotSupported("class", "Property")
  );
}

/**
 * @deprecated
 */
function Path(labels, objects) {
  utils.markAsNotSupported("class", "Path")
}

module.exports = {
  Edge,
  Element,
  Path,
  Property,
  Vertex,
  VertexProperty,
};
