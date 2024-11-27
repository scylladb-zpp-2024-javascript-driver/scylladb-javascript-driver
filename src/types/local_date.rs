use crate::utils::js_error;
use scylla::frame::value::CqlDate;
use std::{cmp::max, fmt};

// Max and min date range of the Date class in JS.
const MAX_JS_DATE: i32 = 100_000_000;
const MIN_JS_DATE: i32 = -MAX_JS_DATE;

// Number of leap years up to 1970.
const LEAP_YEAR_1970: i32 = 477;
// Number of days to the beginning of each month.
const DAY_IN_MONTH: [i32; 12] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
// LocalDateWrapper holds two data representations - value and day, month, year.
// The class in JS has getters for both representations.
// When a new LocalDateWrapper instance is created, the second representation is calculated.
#[napi]
pub struct LocalDateWrapper {
    pub value: i32, // wrapper for number of days from 01.01.1970
    pub year: Option<i32>,
    pub month: Option<i8>,
    pub day: Option<i8>,
    pub in_date: bool, // value can be represented as Date class in JS
}

#[napi]
impl LocalDateWrapper {
    /// Create a new object from the day, month and year.
    #[napi]
    pub fn new(day: i8, month: i8, year: i32) -> napi::Result<Self> {
        Self::check_valid_date(day, month, year)
    }

    /// Create a new object from number of days since 01.01.1970.
    #[napi]
    pub fn new_day(value: i32) -> napi::Result<Self> {
        let date = Self::date_from_days(value.into());
        Ok(LocalDateWrapper {
            value,
            year: date.2,
            month: date.1,
            day: date.0,
            in_date: (MIN_JS_DATE..=MAX_JS_DATE).contains(&value),
        })
    }

    /// Counts the number of days since 01.01.1970.
    fn days_since_epoch(day: i8, month: i8, year: i32) -> i32 {
        let mut total_days = 0;

        let number_day = DAY_IN_MONTH[month as usize - 1] // number of days from 1 January
            + if Self::is_leap_year(year) && month > 2 {
                0
            } else {
                -1
            }
            + day as i32;

        if year >= 1970 {
            total_days += (year - 1970) * 365 + Self::number_leap_years(year - 1) - LEAP_YEAR_1970
                + number_day;
        } else {
            total_days -= if Self::is_leap_year(year) { 366 } else { 365 } - number_day;
            if year < 0 {
                total_days -= (1970 - year - 1) * 365
                    + Self::number_leap_years(year.abs() + 1)
                    + LEAP_YEAR_1970
                    + 1;
            } else {
                total_days -=
                    (1970 - year - 1) * 365 + LEAP_YEAR_1970 - Self::number_leap_years(year + 1);
            }
        }
        total_days
    }

    /// Create a date from the number of days since 01.01.1970.
    fn date_from_days(mut n: i64) -> (Option<i8>, Option<i8>, Option<i32>) {
        if !(MIN_JS_DATE..=MAX_JS_DATE).contains(&(n as i32)) {
            (None, None, None)
        } else {
            let mut year = 1970;
            while n.abs() >= 365 {
                // Find the number of years in n days.
                let k = (n / 365) as i32;
                if year > 0 && year + k < 0 {
                    n += 1;
                }
                year += k;

                if k > 0 {
                    n -= (k.abs() * 365 + Self::number_leap_years(year - 1)
                        - Self::number_leap_years(year - k)) as i64;
                } else {
                    n += (k.abs() * 365 + Self::number_leap_years(year - k)
                        - Self::number_leap_years(year + 1)) as i64;
                }
            }

            if n < 0 {
                // If the remaining number of days is negative, change the year and count the complement.
                year -= 1;
                n += if Self::is_leap_year(year) { 366 } else { 365 };
            }

            if Self::is_leap_year(year) && n >= 60 {
                n -= 1;
            } else if Self::is_leap_year(year) && n > 31 {
                return (Some((n - 30) as i8), Some(2), Some(year));
            }

            let q = DAY_IN_MONTH // Find month.
                .iter()
                .enumerate()
                .filter(|&(_, &x)| i64::from(x) <= n)
                .max_by_key(|&(_, &x)| x)
                .map(|(index, &_value)| index + 1)
                .unwrap();

            (
                Some((n - DAY_IN_MONTH[q - 1] as i64) as i8 + 1),
                Some(q as i8),
                Some(year),
            )
        }
    }

    /// Checks whether the year is leap year.
    fn is_leap_year(year: i32) -> bool {
        (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
    }

    /// Returns the number of days in a month.
    fn days_in_month(month: i8, year: i32) -> i8 {
        match month {
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            4 | 6 | 9 | 11 => 30,
            2 => {
                if Self::is_leap_year(year) {
                    29
                } else {
                    28
                }
            }
            _ => 0,
        }
    }

    fn number_leap_years(n: i32) -> i32 {
        n / 4 - n / 100 + n / 400
    }

    /// Checks if the given date is correct and returns Self.
    fn check_valid_date(day: i8, month: i8, year: i32) -> napi::Result<Self> {
        if !(1..=12).contains(&month) {
            return Err(js_error("Invalid month"));
        }

        if !(day >= 1 && day <= Self::days_in_month(month, year)) {
            return Err(js_error("Invalid number of day"));
        }

        let value = Self::days_since_epoch(day, month, year);

        Ok(LocalDateWrapper {
            year: Some(year),
            month: Some(month),
            day: Some(day),
            value,
            in_date: (MIN_JS_DATE..=MAX_JS_DATE).contains(&value),
        })
    }

    pub fn get_cql_date(&self) -> CqlDate {
        CqlDate(((1 << 31) + self.value) as u32)
    }

    pub fn from_cql_date(date: CqlDate) -> Self {
        let value: i32 = date.0 as i32 - (1 << 31);
        let date = Self::date_from_days(value.into());
        LocalDateWrapper {
            value,
            year: date.2,
            month: date.1,
            day: date.0,
            in_date: (MIN_JS_DATE..=MAX_JS_DATE).contains(&value),
        }
    }
}

impl fmt::Display for LocalDateWrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.in_date {
            write!(
                f,
                "{}-{}-{}",
                if self.year.unwrap() >= 1000 || self.year.unwrap() <= -1000 {
                    format!("{}", self.year.unwrap())
                } else if self.year.unwrap() < 0 {
                    let year_string = (-(self.year.unwrap())).to_string();
                    format!(
                        "-{}{}",
                        "0".repeat(max(4 - year_string.len(), 0)),
                        year_string
                    )
                } else {
                    let year_string = self.year.unwrap().to_string();
                    format!(
                        "{}{}",
                        "0".repeat(max(4 - year_string.len(), 0)),
                        year_string
                    )
                },
                if self.month.unwrap() < 10 {
                    format!("0{}", self.month.unwrap())
                } else {
                    format!("{}", self.month.unwrap())
                },
                if self.day.unwrap() < 10 {
                    format!("0{}", self.day.unwrap())
                } else {
                    format!("{}", self.day.unwrap())
                },
            )
        } else {
            write!(f, "{}", self.value)
        }
    }
}
