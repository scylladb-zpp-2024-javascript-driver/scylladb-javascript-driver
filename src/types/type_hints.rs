use crate::utils::js_error;

use super::type_wrappers::{ComplexType, CqlType};

// When converting from JS object, if a field is not provided (ex: {code: 3}),
// then the field becomes None.
// When a field is set to null (ex: {code: 3, info: null}),
// then the field becomes Some(None).
// As we want to support both absence of `info` field and `info` field set to null,
// we need to have nested Option in this object.
#[napi(object)]
pub struct TypeHint {
    pub code: i32,
    pub info: Option<Option<Vec<TypeHint>>>,
}

/// Convert the number representing CQL type to the internal type, representing CQL type
fn type_code_to_cql_type(value: i32) -> Result<CqlType, napi::Error> {
    Ok(match value {
        0x0000 => CqlType::Custom,
        0x0001 => CqlType::Ascii,
        0x0002 => CqlType::BigInt,
        0x0003 => CqlType::Blob,
        0x0004 => CqlType::Boolean,
        0x0005 => CqlType::Counter,
        0x0006 => CqlType::Decimal,
        0x0007 => CqlType::Double,
        0x0008 => CqlType::Float,
        0x0009 => CqlType::Int,
        0x000A => CqlType::Text,
        0x000B => CqlType::Timestamp,
        0x000C => CqlType::Uuid,
        0x000D => CqlType::Text,
        0x000E => CqlType::Varint,
        0x000F => CqlType::Timeuuid,
        0x0010 => CqlType::Inet,
        0x0011 => CqlType::Date,
        0x0012 => CqlType::Time,
        0x0013 => CqlType::SmallInt,
        0x0014 => CqlType::TinyInt,
        0x0015 => CqlType::Duration,
        0x0020 => CqlType::List,
        0x0021 => CqlType::Map,
        0x0022 => CqlType::Set,
        0x0030 => CqlType::UserDefinedType,
        0x0031 => CqlType::Tuple,
        _ => {
            return Err(js_error(format!(
                "Number {} does not represent a known CQL type",
                value
            )))
        }
    })
}

/// Convert single hint from the format expected by API of the driver
/// to the ``ComplexType`` that is used internally in the rust part of the code
#[napi]
pub fn convert_hint(hint: TypeHint) -> napi::Result<ComplexType> {
    let base_type = type_code_to_cql_type(hint.code)?;
    let support_types = hint.info.flatten();

    Ok(match base_type {
        CqlType::List | CqlType::Set => {
            // Ensure there is no value in info field, or there is exactly one support type
            let mut support_types = support_types.unwrap_or_default();
            if support_types.len() > 1 {
                return Err(js_error(format!(
                    "Invalid number of support types. Got {}, expected no more than one.",
                    support_types.len()
                )));
            }
            let support_type = convert_hint(support_types.pop().unwrap())?;
            ComplexType::one_support(base_type, Some(support_type))
        }
        CqlType::Map | CqlType::Tuple => {
            let support_types: Vec<TypeHint> = support_types.unwrap_or_default();

            let support_types: Vec<Result<ComplexType, napi::Error>> =
                support_types.into_iter().map(convert_hint).collect();

            if support_types.iter().any(|e| e.is_err()) {
                return Err(js_error("Failed to convert one of the subtypes"));
            }
            let mut support_types: Vec<ComplexType> =
                support_types.into_iter().filter_map(|e| e.ok()).collect();

            match base_type {
                CqlType::Map => {
                    if support_types.len() != 2 {
                        return Err(js_error(format!(
                            "Invalid number of support types. Got {}, expected 2",
                            support_types.len()
                        )));
                    }

                    // With the length check we assume, this values will always be Some,
                    // but we keep it as Option, as used Complex type constructor assumes Option
                    let second_support = support_types.pop();
                    let first_support = support_types.pop();
                    ComplexType::two_support(base_type, first_support, second_support)
                }
                // TODO: update it with tuple implementations
                CqlType::Tuple => todo!(),
                _ => unreachable!(),
            }
        }
        CqlType::UserDefinedType => {
            // TODO: update it with UDT implementation
            todo!()
        }
        _ => ComplexType::simple_type(base_type),
    })
}
