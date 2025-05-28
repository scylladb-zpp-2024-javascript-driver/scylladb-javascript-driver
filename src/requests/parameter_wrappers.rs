use napi::{
    bindgen_prelude::{Array, BigInt, Buffer, FromNapiValue, Undefined},
    Status,
};
use scylla::value::{Counter, CqlTimestamp, CqlTimeuuid, CqlValue, MaybeUnset};
use uuid::Uuid;

use crate::{
    types::{
        duration::DurationWrapper,
        inet::InetAddressWrapper,
        local_date::LocalDateWrapper,
        local_time::LocalTimeWrapper,
        type_wrappers::{ComplexType, CqlType},
    },
    utils::{bigint_to_i64, js_error},
};

pub struct ParameterWrapper {
    pub(crate) row: Option<MaybeUnset<CqlValue>>,
}

/// Converts an array of values into Vec of CqlValue based on the provided type.
fn cql_value_vec_from_array(typ: &ComplexType, arr: &Array) -> napi::Result<Vec<CqlValue>> {
    Result::from_iter((0..arr.len()).map(|i| cql_value_from_napi_value(typ, arr, i)))
}
/// Creates a Vec of (key, value) pairs, each of CqlValue type,
/// from provided array and type.
///
/// It requires that each element of the `arr` array is at least two element array itself.
fn cql_value_vec_from_map(
    typ: &ComplexType,
    arr: &Array,
) -> napi::Result<Vec<(CqlValue, CqlValue)>> {
    let mut res = vec![];
    let parsing_error = || {
        napi::Error::new(
            Status::InvalidArg,
            "Unexpected data when parsing parameters row".to_owned(),
        )
    };
    for i in 0..arr.len() {
        let elem = arr.get::<Array>(i)?.ok_or_else(parsing_error)?;

        let key = cql_value_from_napi_value(
            &(typ.get_first_support_type().ok_or_else(parsing_error)?),
            &elem,
            0,
        )?;
        let val = cql_value_from_napi_value(
            &(typ.get_second_support_type().ok_or_else(parsing_error)?),
            &elem,
            1,
        )?;
        res.push((key, val));
    }
    Ok(res)
}

fn cql_value_vec_from_tuple(
    types: &ComplexType,
    arr: &Array,
) -> napi::Result<Vec<Option<CqlValue>>> {
    let mut res = vec![];
    let support_types = types.get_inner_types();

    // JS arrays can hold up to 2^32 - 2 values.
    // Here we assume usize is at least 4 bytes.
    if support_types.len() != arr.len().try_into().unwrap() {
        return Err(napi::Error::new(
            Status::InvalidArg,
            "Tuple has different amount of types and values".to_owned(),
        ));
    }

    // i will be capped at JS array size: an unsigned 32 bit value
    // this allows us to safely convert i to u32
    for (i, typ) in support_types.into_iter().enumerate() {
        if let Ok(Some(_)) = arr.get::<Undefined>(i.try_into().unwrap()) {
            res.push(None);
        } else {
            let value = cql_value_from_napi_value(&typ, arr, i.try_into().unwrap())?;
            res.push(Some(value));
        }
    }

    Ok(res)
}

/// Convert element at pos position in elem Array into CqlValue, based on the provided type
fn cql_value_from_napi_value(typ: &ComplexType, elem: &Array, pos: u32) -> napi::Result<CqlValue> {
    /// Try to covert value at `pos` position in `elem` array into value of `statement_type` type.
    macro_rules! get_element {
        ($statement_type: ty) => {
            elem.get::<$statement_type>(pos)?.ok_or(napi::Error::new(
                Status::InvalidArg,
                "Unexpected data when parsing parameters row".to_owned(),
            ))?
        };
    }
    let value: CqlValue = match typ.base_type {
        CqlType::Ascii => CqlValue::Ascii(get_element!(String)),
        CqlType::Boolean => CqlValue::Boolean(get_element!(bool)),
        CqlType::Blob => CqlValue::Blob(get_element!(Buffer).to_vec()),
        CqlType::Counter => CqlValue::Counter(Counter(bigint_to_i64(
            get_element!(BigInt),
            "Value cast into counter type shouldn't overflow i64",
        )?)),
        CqlType::Decimal => todo!(),
        CqlType::Date => CqlValue::Date(get_element!(&LocalDateWrapper).get_cql_date()),
        CqlType::Double => CqlValue::Double(get_element!(f64)),
        CqlType::Duration => CqlValue::Duration(get_element!(&DurationWrapper).get_cql_duration()),
        CqlType::Float => CqlValue::Float(get_element!(f64) as f32),
        CqlType::Int => CqlValue::Int(get_element!(i32)),
        CqlType::BigInt => CqlValue::BigInt(bigint_to_i64(
            get_element!(BigInt),
            "Cannot fit value in CqlBigInt",
        )?),
        CqlType::Text => CqlValue::Text(get_element!(String)),
        CqlType::Timestamp => CqlValue::Timestamp(CqlTimestamp(bigint_to_i64(
            get_element!(BigInt),
            "timestamp cannot overflow i64",
        )?)),
        CqlType::Inet => CqlValue::Inet(get_element!(&InetAddressWrapper).get_ip_addr()),
        CqlType::List => CqlValue::List(cql_value_vec_from_array(
            typ.support_type_1
                .as_ref()
                .expect("Expected support type for list"),
            &get_element!(Array),
        )?),
        CqlType::Map => CqlValue::Map(cql_value_vec_from_map(typ, &get_element!(Array))?),
        CqlType::Set => CqlValue::Set(cql_value_vec_from_array(
            typ.support_type_1
                .as_ref()
                .expect("Expected support type for list"),
            &get_element!(Array),
        )?),
        CqlType::UserDefinedType => todo!(),
        CqlType::SmallInt => CqlValue::SmallInt(
            get_element!(i32)
                .try_into()
                .map_err(|_| js_error("Value must fit in i16 type to be small int"))?,
        ),
        CqlType::TinyInt => CqlValue::TinyInt(
            get_element!(i32)
                .try_into()
                .map_err(|_| js_error("Value must fit in i8 type to be tiny int"))?,
        ),
        CqlType::Time => CqlValue::Time(get_element!(&LocalTimeWrapper).get_cql_time()),
        CqlType::Timeuuid => CqlValue::Timeuuid(CqlTimeuuid::from_bytes(
            get_element!(Buffer)
                .to_vec()
                .try_into()
                .map_err(|_| js_error("Value must be Buffer with 16 elements to be TimeUuid"))?,
        )),
        CqlType::Tuple => CqlValue::Tuple(cql_value_vec_from_tuple(typ, &get_element!(Array))?),
        CqlType::Uuid => {
            let val = get_element!(Buffer).to_vec();
            CqlValue::Uuid(match val.len() {
                // 0 length buffers represents `Uuid.generateRandom`.
                // This means, we need to generate a new UUID here.
                0 => Uuid::new_v4(),
                _ => val
                    .try_into()
                    .map_err(|_| js_error("Value must be Buffer with 16 elements to be Uuid"))?,
            })
        }
        CqlType::Varint => todo!(),
        CqlType::Unprovided => return Err(js_error("Expected type information for the value")),
        CqlType::Empty => unreachable!("Should not receive Empty type here."),
        CqlType::Custom => unreachable!("Should not receive Custom type here."),
    };
    Ok(value)
}

impl FromNapiValue for ParameterWrapper {
    /// # Safety
    ///
    /// Valid pointer to napi env must be provided
    unsafe fn from_napi_value(
        env: napi::sys::napi_env,
        napi_val: napi::sys::napi_value,
    ) -> napi::Result<Self> {
        let parsing_error = || {
            napi::Error::new(
                Status::InvalidArg,
                "Unexpected data when parsing parameters row".to_owned(),
            )
        };

        // Caller of this function ensures a valid pointer to napi env is provided
        let elem = unsafe { Array::from_napi_value(env, napi_val)? };
        // If we received:
        //   - 0 element array - null value was provided
        //   - 1 element array - unset value was provided
        //   - 2 element array - [type, value] was provided
        let val = match elem.len() {
            0 => None,
            1 => Some(MaybeUnset::Unset),
            2 => {
                let typ = elem.get::<&ComplexType>(0)?.ok_or_else(parsing_error)?;
                Some(MaybeUnset::Set(cql_value_from_napi_value(typ, &elem, 1)?))
            }
            _ => {
                return Err(parsing_error());
            }
        };

        Ok(ParameterWrapper { row: val })
    }
}
