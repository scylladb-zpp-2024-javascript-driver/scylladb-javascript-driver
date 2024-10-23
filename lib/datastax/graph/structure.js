"use strict";

const {markAsNotSupported} = require("../../new_utils")

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Element(id, label) {
  markAsNotSupported("class", "Element");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Vertex(id, label, properties) {
  markAsNotSupported("class", "Vertex");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Edge(id, outV, outVLabel, label, inV, inVLabel, properties) {
  markAsNotSupported("class", "Edge");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function VertexProperty(id, label, value, properties) {
  markAsNotSupported("class", "VertexProperty");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Property(key, value) {
  markAsNotSupported("class", "Property");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Path(labels, objects) {
  markAsNotSupported("class", "Path");
}

module.exports = {
  Edge,
  Element,
  Path,
  Property,
  Vertex,
  VertexProperty,
};
