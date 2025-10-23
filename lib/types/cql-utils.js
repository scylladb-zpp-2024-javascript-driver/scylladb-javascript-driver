"use strict";

const rust = require("../../index");
const _Encoder = require("../encoder");

/**
 * @param {Array<rust.ComplexType | null>} expectedTypes List of expected types.
 * @param {Array<any>} params
 * @param {_Encoder} encoder
 * @returns {Array<rust.ComplexType|any>} Returns: [] for null values, [undefined] for unset values
 * and [rust.ComplexType, any] for all other values.
 * @throws ResponseError when received different amount of parameters than expected
 */
function encodeParams(expectedTypes, params, encoder) {
    if (expectedTypes.length == 0 && !params) return [];
    let res = [];
    for (let i = 0; i < params.length; i++) {
        let tmp = encoder.encode(params[i], expectedTypes[i]);
        res.push(tmp);
    }
    return res;
}

/**
 * Convert rust ComplexType into type representation used in the driver encoder
 * @param {rust.ComplexType} type
 */
function convertComplexType(type) {
    let data = {
        code: type.baseType.valueOf(),
    };
    let firstSupport = type.getFirstSupportType();
    let secondSupport = type.getSecondSupportType();
    let innerTypes = type.getInnerTypes();
    if (firstSupport != null) {
        data.info = convertComplexType(firstSupport);
        if (secondSupport != null) {
            data.info = [data.info, convertComplexType(secondSupport)];
        }
    } else if (innerTypes.length > 0) {
        if (data.code == rust.CqlType.UserDefinedType) {
            let names = type.getUdtFieldNames();
            data.info = {
                fields: innerTypes.map((typ, index) => {
                    let obj = { type: convertComplexType(typ) };
                    obj.name = names[index];
                    return obj;
                }),
            };
        } else {
            data.info = innerTypes.map((t) => convertComplexType(t));
        }
    }
    return data;
}

module.exports.encodeParams = encodeParams;
module.exports.convertComplexType = convertComplexType;
