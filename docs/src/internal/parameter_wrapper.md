# ParameterWrapper

Parameter wrapper is used to pass parameters for all queries.
It can pass any Cql Value, null and unset values.
On the Rust side, the value is represented by:
``Option<MaybeUnset<CqlValue>>``
and on the JavaScript side it's represented by:
``[ComplexType, Value]`` with the null being: ``[]`` and unset: ``[undefined]``.

The conversion from the user provided values to accepted format is done in ``types/cql-utils.js``.

On the Rust size, ``requests/parameter_wrappers.rs`` is responsible for value conversion
into format recognized by the Rust driver. It's done as a ``FromNapiValue`` trait.
The specific format containing both type and value is nesesery to create a correct Cql Value,
without using [env](https://napi.rs/docs/compat-mode/concepts/env) in function.

Currently if the value can be represented by the user in multiple formats,
it's converted into unified format, but it's possible to do this also on the Rust size
(but it's nesesery to check the performance impact of such change).
