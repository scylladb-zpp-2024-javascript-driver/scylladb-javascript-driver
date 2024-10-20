"use strict";

const util = require("util");

/**
 * @deprecated
 */
function Element(id, label) {
  throw new ReferenceError(`This class (Element) is not supported by our driver`);
}

/**
 * @deprecated
 */
function Vertex(id, label, properties) {
  throw new ReferenceError(`This class (Vertex) is not supported by our driver`);
}

/**
 * @deprecated
 */
function Edge(id, outV, outVLabel, label, inV, inVLabel, properties) {
  throw new ReferenceError(`This class (Edge) is not supported by our driver`);
}

/**
 * @deprecated
 */
function VertexProperty(id, label, value, properties) {
  throw new ReferenceError(`This class (VertexProperty) is not supported by our driver`);
}

/**
 * @deprecated
 */
function Property(key, value) {
  throw new ReferenceError(`This class (Property) is not supported by our driver`);
}

/**
 * @deprecated
 */
function Path(labels, objects) {
  throw new ReferenceError(`This class (Path) is not supported by our driver`);
}

module.exports = {
  Edge,
  Element,
  Path,
  Property,
  Vertex,
  VertexProperty,
};
