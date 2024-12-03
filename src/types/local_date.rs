use crate::utils::js_error;
use regex::Regex;
use scylla::frame::value::CqlDate;
use std::{cmp::max, fmt, num::ParseIntError};

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
    pub date: Option<Ymd>,
    pub in_date: bool, // value can be represented as Date class in JS
}

#[napi]
impl LocalDateWrapper {
    /// Create a new object from the day, month and year.
    #[napi]
    pub fn new(day: i8, month: i8, year: i32) -> napi::Result<Self> {
        let date = Ymd::new(year, month, day)?;

        let value = date.to_days();

        Ok(LocalDateWrapper {
            date: Some(date),
            value,
            in_date: (MIN_JS_DATE..=MAX_JS_DATE).contains(&value),
        })
    }

    /// Create a new object from number of days since 01.01.1970.
    #[napi]
    pub fn new_day(value: i32) -> napi::Result<Self> {
        let date = Ymd::from_days(value.into());
        Ok(LocalDateWrapper {
            value,
            date,
            in_date: (MIN_JS_DATE..=MAX_JS_DATE).contains(&value),
        })
    }

    #[napi(js_name = "toString")]
    pub fn to_format(&self) -> String {
        self.to_string()
    }

    pub fn get_cql_date(&self) -> CqlDate {
        CqlDate(((1 << 31) + self.value) as u32)
    }

    pub fn from_cql_date(date: CqlDate) -> Self {
        let value: i32 = date.0 as i32 - (1 << 31);
        let date = Ymd::from_days(value.into());
        LocalDateWrapper {
            value,
            date,
            in_date: (MIN_JS_DATE..=MAX_JS_DATE).contains(&value),
        }
    }

    /// Returns the number of days since 01.01.1970 based on a String representing the date.
    #[napi]
    pub fn from_string(value: String) -> napi::Result<i32> {
        match value.chars().filter(|c| *c == '-').count() {
            d if d < 2 => match value.parse::<i32>() {
                Ok(val) => Ok(val),
                Err(_) => Err(js_error("Invalid format of string")),
            },
            2 | 3 => {
                // based on https://stackoverflow.com/a/22061879
                let pattern = r"^-?\d{1}\d*-(0?[1-9]|1[012])-(0?[1-9]|[12][0-9]|3[01])$";
                let re = Regex::new(pattern).unwrap();
                if !re.is_match(&value) {
                    return Err(js_error("Invalid format of string"));
                }

                let lambda = |s: String| -> Result<(i32, i8, i8), ParseIntError> {
                    let cut: usize = if s.starts_with('-') { 1 } else { 0 };

                    let mut parts = s.get(cut..).unwrap().split('-');
                    let year = parts.next().unwrap().parse::<i32>()?;
                    Ok((
                        match cut {
                            0 => year,
                            _ => -year,
                        },
                        parts.next().unwrap().parse::<i8>()?,
                        parts.next().unwrap().parse::<i8>()?,
                    ))
                };

                match lambda(value) {
                    Ok(s) => {
                        let date = Ymd {
                            year: s.0,
                            month: s.1,
                            day: s.2,
                        };
                        Ok(date.to_days())
                    }
                    Err(_) => Err(js_error("Invalid parse of string")),
                }
            }
            _ => Err(js_error("Invalid format of string")),
        }
    }
}

impl fmt::Display for LocalDateWrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self.date {
            Some(date) => {
                if date.year < 0 {
                    write!(f, "-")?;
                }
                write!(
                    f,
                    "{}{}",
                    "0".repeat(max(
                        // source of code for number of digits: https://stackoverflow.com/a/69298721
                        4 - (date.year.abs().checked_ilog10().unwrap_or(0) + 1) as i8,
                        0
                    ) as usize),
                    date.year.abs()
                )?;
                if date.month < 10 {
                    write!(f, "-0{}", date.month)?;
                } else {
                    write!(f, "-{}", date.month)?;
                }
                if date.day < 10 {
                    write!(f, "-0{}", date.day)?;
                } else {
                    write!(f, "-{}", date.day)?;
                }
                Ok(())
            }
            None => {
                write!(f, "{}", self.value)
            }
        }
    }
}

/// Checks whether the year is leap year.
fn is_leap_year(year: i32) -> bool {
    (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0)
}

fn number_leap_years(n: i32) -> i32 {
    n / 4 - n / 100 + n / 400
}

#[napi(object)]
#[derive(Clone)]
pub struct Ymd {
    pub year: i32,
    pub month: i8,
    pub day: i8,
}

impl Ymd {
    fn new(year: i32, month: i8, day: i8) -> Result<Ymd, DateError> {
        if !(1..=12).contains(&month) {
            return Err(DateError::InvalidMonth);
        }

        if !(day >= 1 && day <= Self::days_in_month(month, year)) {
            return Err(DateError::InvalidDay);
        }

        Ok(Ymd { year, month, day })
    }

    /// Counts the number of days since 01.01.1970.
    fn to_days(&self) -> i32 {
        let mut total_days = 0;

        let number_day = DAY_IN_MONTH[self.month as usize - 1] // number of days from 1 January
            + if is_leap_year(self.year) && self.month > 2 {
                0
            } else {
                -1
            }
            + self.day as i32;

        if self.year >= 1970 {
            total_days += (self.year - 1970) * 365 + number_leap_years(self.year - 1)
                - LEAP_YEAR_1970
                + number_day;
        } else {
            total_days -= if is_leap_year(self.year) { 366 } else { 365 } - number_day;
            if self.year < 0 {
                total_days -= (1970 - self.year - 1) * 365
                    + number_leap_years(self.year.abs() + 1)
                    + LEAP_YEAR_1970
                    + 1;
            } else {
                total_days -= (1970 - self.year - 1) * 365 + LEAP_YEAR_1970
                    - number_leap_years(self.year + 1);
            }
        }
        total_days
    }

    /// Create a Ymd from the number of days since 01.01.1970.
    fn from_days(mut n: i64) -> Option<Self> {
        if !(MIN_JS_DATE..=MAX_JS_DATE).contains(&(n as i32)) {
            None
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
                    n -= (k.abs() * 365 + number_leap_years(year - 1) - number_leap_years(year - k))
                        as i64;
                } else {
                    n += (k.abs() * 365 + number_leap_years(year - k) - number_leap_years(year + 1))
                        as i64;
                }
            }

            if n < 0 {
                // If the remaining number of days is negative, change the year and count the complement.
                year -= 1;
                n += if is_leap_year(year) { 366 } else { 365 };
            }

            if is_leap_year(year) && n >= 60 {
                n -= 1;
            } else if is_leap_year(year) && n > 31 {
                return Some(Ymd {
                    year,
                    month: 2,
                    day: (n - 30) as i8,
                });
            }

            let q = DAY_IN_MONTH // Find month.
                .iter()
                .enumerate()
                .filter(|&(_, &x)| i64::from(x) <= n)
                .max_by_key(|&(_, &x)| x)
                .map(|(index, &_value)| index + 1)
                .unwrap();

            Some(Ymd {
                year,
                month: q as i8,
                day: (n - DAY_IN_MONTH[q - 1] as i64) as i8 + 1,
            })
        }
    }

    /// Returns the number of days in a month.
    fn days_in_month(month: i8, year: i32) -> i8 {
        match month {
            1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
            4 | 6 | 9 | 11 => 30,
            2 => {
                if is_leap_year(year) {
                    29
                } else {
                    28
                }
            }
            _ => 0,
        }
    }
}

enum DateError {
    InvalidMonth,
    InvalidDay,
}

impl fmt::Display for DateError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}",
            match self {
                DateError::InvalidDay => "Invalid number of day",
                DateError::InvalidMonth => "Invalid month",
            }
        )
    }
}

impl From<DateError> for napi::Error {
    fn from(value: DateError) -> Self {
        js_error(value)
    }
}
