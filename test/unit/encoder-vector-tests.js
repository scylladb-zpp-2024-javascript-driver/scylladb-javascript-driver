"use strict";
const { assert, util } = require("chai");
const Encoder = require("../../lib/encoder");
const { types } = require("../../main");
const Vector = require("../../lib/types/vector");
const helper = require("../test-helper");

describe("Vector tests", function () {
    const encoder = new Encoder(4, {});

    helper.dataProviderWithCollections.forEach((data) => {
        it(`should encode and decode vector of ${data.subtypeString}`, function () {
            const vector = new Vector(data.value, data.subtypeString);
            // console.log('Guessed type:', guessedType);
            const encoded = encoder.encode(vector, data.typeInfo);
            const decoded = encoder.decode(encoded, data.typeInfo);
            assert.strictEqual(util.inspect(decoded), util.inspect(vector));
        });

        it(`should encode and decode vector of ${data.subtypeString} while guessing data type`, function () {
            if (data.subtypeString === "my_udt") {
                // cannot guess udt type
                return;
            }
            const vector = new Vector(data.value, data.subtypeString);
            const guessedType = Encoder.guessDataType(vector);
            if (!guessedType) {
                throw new Error("Can not guess type");
            }
            const encoded = encoder.encode(vector, guessedType);
            const decoded = encoder.decode(encoded, guessedType);
            assert.strictEqual(util.inspect(decoded), util.inspect(vector));
        });

        it(`should throw when providing less or more elements/bytes when encoding/decoding vector of ${data.subtypeString}`, function () {
            const vector = new Vector(data.value, data.subtypeString);
            const encoded = encoder.encode(vector, data.typeInfo);
            const encodedBuffer = Buffer.from(encoded);
            const encodedBufferShort = encodedBuffer.slice(
                0,
                encodedBuffer.length - 1,
            );
            const encodedBufferLong = Buffer.concat([
                encodedBuffer,
                Buffer.alloc(1),
            ]);
            assert.throws(
                () => encoder.decode(encodedBufferShort, data.typeInfo),
                "Not enough bytes to decode the vector",
            );
            assert.throws(
                () => encoder.decode(encodedBufferLong, data.typeInfo),
                "Extra bytes found after decoding the vector",
            );

            const shortVector = new Vector(
                data.value.slice(0, data.value.length - 1),
                data.subtypeString,
            );
            const longVector = new Vector(
                data.value.concat(data.value),
                data.subtypeString,
            );
            assert.throws(
                () => encoder.encode(shortVector, data.typeInfo),
                "Expected vector with 3 dimensions, observed size of 2",
            );
            assert.throws(
                () => encoder.encode(longVector, data.typeInfo),
                "Expected vector with 3 dimensions, observed size of 6",
            );
        });
    });

    it("should encode and decode vector of float", function () {
        const vector = new Float32Array([1.1, 2.2, 3.3]);
        const typeObj = {
            code: types.dataTypes.custom,
            info: [{ code: types.dataTypes.float }, 3],
            customTypeName: "vector",
        };
        const encoded = encoder.encode(vector, typeObj);
        const decoded = encoder.decode(encoded, typeObj);
        for (let i = 0; i < vector.length; i++) {
            assert.strictEqual(decoded[i], vector[i]);
        }
    });
});
