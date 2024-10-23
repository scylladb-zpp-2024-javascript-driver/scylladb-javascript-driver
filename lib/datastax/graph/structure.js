"use strict";

const { throwNotSupported } = require("../../new_utils");

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Element(id, label) {
    throwNotSupported("class", "Element");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Vertex(id, label, properties) {
    throwNotSupported("class", "Vertex");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Edge(id, outV, outVLabel, label, inV, inVLabel, properties) {
    throwNotSupported("class", "Edge");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function VertexProperty(id, label, value, properties) {
    throwNotSupported("class", "VertexProperty");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Property(key, value) {
    throwNotSupported("class", "Property");
}

/**
 * @deprecated Not supported by the driver. Usage will throw an error.
 */
function Path(labels, objects) {
    throwNotSupported("class", "Path");
}

module.exports = {
    Edge,
    Element,
    Path,
    Property,
    Vertex,
    VertexProperty,
};
