use napi::{
    bindgen_prelude::{Array, BigInt, Buffer, FromNapiValue},
    Status,
};
use scylla::value::{Counter, CqlTimestamp, CqlTimeuuid, CqlValue, MaybeUnset};

use crate::{
    types::{
        duration::DurationWrapper,
        inet::InetAddressWrapper,
        local_date::LocalDateWrapper,
        local_time::LocalTimeWrapper,
        type_wrappers::{ComplexType, CqlType},
        uuid::UuidWrapper,
    },
    utils::{bigint_to_i64, js_error},
};

pub struct ParameterWrapper {
    pub(crate) row: Option<MaybeUnset<CqlValue>>,
}

/// Converts and array of values into Vector of CqlValue based on the provided type.
fn cql_value_vec_from_array(typ: &ComplexType, arr: &Array) -> napi::Result<Vec<CqlValue>> {
    let mut res = vec![];
    for i in 0..arr.len() {
        res.push(cql_value_from_napi_value(typ, arr, i)?);
    }
    Ok(res)
}

/// Creates a Vector of (key, value) pairs, each being of CqlVale type,
/// from provided array and type.
///
/// It requirers that each element of the arr array is at least two element array itself.
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
        let elem = arr.get::<Array>(i)?.ok_or(parsing_error())?;

        let key = cql_value_from_napi_value(
            &(typ.get_first_support_type().ok_or(parsing_error())?),
            &elem,
            0,
        )?;
        let val = cql_value_from_napi_value(
            &(typ.get_second_support_type().ok_or(parsing_error())?),
            &elem,
            1,
        )?;
        res.push((key, val));
    }
    Ok(res)
}

/// Convert element at pos position in elem Array into CqlValue, based on the provided type
fn cql_value_from_napi_value(typ: &ComplexType, elem: &Array, pos: u32) -> napi::Result<CqlValue> {
    let parsing_error = || {
        napi::Error::new(
            Status::InvalidArg,
            "Unexpected data when parsing parameters row".to_owned(),
        )
    };
    macro_rules! get_element {
        ($statement_type: ty) => {
            elem.get::<$statement_type>(pos)?.ok_or(parsing_error())?
        };
    }
    let value: CqlValue = match typ.base_type {
        CqlType::Ascii => CqlValue::Ascii(get_element!(String)),
        CqlType::Boolean => CqlValue::Boolean(get_element!(bool)),
        CqlType::Blob => CqlValue::Blob(get_element!(Buffer).to_vec()),
        CqlType::Counter => CqlValue::Counter(Counter(bigint_to_i64(
            get_element!(BigInt),
            "Value casted into counter type shouldn't overflow i64",
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
                .map_err(|_| js_error("Value must fit in ii8 type to be small int"))?,
        ),
        CqlType::Time => CqlValue::Time(get_element!(&LocalTimeWrapper).get_cql_time()),
        CqlType::Timeuuid => CqlValue::Timeuuid(CqlTimeuuid::from_bytes(
            get_element!(&UuidWrapper).get_cql_uuid().into_bytes(),
        )),
        CqlType::Tuple => todo!(),
        CqlType::Uuid => CqlValue::Uuid(get_element!(&UuidWrapper).get_cql_uuid()),
        CqlType::Varint => todo!(),
        CqlType::Custom => unreachable!("Should not receive Custom type here"),
        _ => todo!(),
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
        let val = if elem.len() == 0 {
            None
        } else if elem.len() == 2 {
            let typ = elem.get::<&ComplexType>(0)?.ok_or(parsing_error())?;
            if typ.is_unset {
                Some(MaybeUnset::Unset)
            } else {
                Some(MaybeUnset::Set(cql_value_from_napi_value(typ, &elem, 1)?))
            }
        } else {
            return Err(parsing_error());
        };

        Ok(ParameterWrapper { row: val })
    }
}

pub(crate) fn convert_parameters_row_wrapper(
    val: Vec<ParameterWrapper>,
) -> Vec<Option<MaybeUnset<CqlValue>>> {
    val.into_iter().map(|e| e.row).collect()
}
