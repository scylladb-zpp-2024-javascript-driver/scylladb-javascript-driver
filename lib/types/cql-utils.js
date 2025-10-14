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
        info: null,
    };
    let fistSupport = type.getFirstSupportType();
    let secondSupport = type.getSecondSupportType();
    let otherTypes = type.getInnerTypes();
    if (fistSupport != null) {
        data.info = convertComplexType(fistSupport);
        if (secondSupport != null) {
            data.info = [data.info, convertComplexType(secondSupport)];
        }
    } else if (otherTypes.length > 0) {
        data.info = otherTypes.map((t) => convertComplexType(t));
    }
    return data;
}

/**
 *
 * @param {null | object | Array<object>} object
 * @returns {rust.ComplexType | null}
 */
function rustConvertHint(object) {
    if (object.info && !Array.isArray(object.info)) {
        object.info = [object.info];
    }
    return rust.convertHint(object);
}

module.exports.encodeParams = encodeParams;
module.exports.rustConvertHint = rustConvertHint;
module.exports.convertComplexType = convertComplexType;
