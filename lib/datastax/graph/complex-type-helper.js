"use strict";

const { GraphTypeWrapper, UdtGraphWrapper } = require("./wrappers");
const types = require("../../types");
const Encoder = require("../../encoder");
const { dataTypes } = types;

function getTypeDefinitionByValue(value) {
  if (value instanceof types.Tuple) {
    return {
      cqlType: "tuple",
      definition: value.elements.map(getTypeDefinitionByValue),
    };
  }

  if (value instanceof Map) {
    // Try to guess the types of the key and value based on the first element
    const result = { cqlType: "map" };
    if (value.size > 0) {
      const first = value.entries().next().value;
      result["definition"] = first.map(getTypeDefinitionByValue);
    }

    return result;
  }

  if (value instanceof UdtGraphWrapper) {
    return getUdtTypeDefinitionByValue(value);
  }

  let type;
  if (value instanceof GraphTypeWrapper) {
    type = value.typeInfo;
  } else {
    type = Encoder.guessDataType(value);
  }

  if (!type) {
    return null;
  }

  return getDefinitionByType(type);
}

function getDefinitionByType(type) {
  if (type.code === dataTypes.udt) {
    return getUdtTypeDefinition(type.info);
  }

  if (type.code === dataTypes.tuple || type.code === dataTypes.map) {
    return {
      cqlType: types.getDataTypeNameByCode(type),
      definition: type.info.map(getDefinitionByType),
    };
  }

  if (type.code === dataTypes.list || type.code === dataTypes.set) {
    return {
      cqlType: type.code === dataTypes.list ? "list" : "set",
      definition: [getDefinitionByType(type.info)],
    };
  }

  return { cqlType: types.getDataTypeNameByCode(type) };
}

function getUdtTypeDefinition(udtInfo) {
  return {
    cqlType: "udt",
    keyspace: udtInfo.keyspace,
    name: udtInfo.name,
    definition: udtInfo.fields.map((field) =>
      // fieldName should be the first property serialized
      Object.assign({ fieldName: field.name }, getDefinitionByType(field.type)),
    ),
  };
}

function getUdtTypeDefinitionByValue(wrappedValue) {
  return getUdtTypeDefinition(wrappedValue.udtInfo);
}

module.exports = { getTypeDefinitionByValue, getUdtTypeDefinitionByValue };
