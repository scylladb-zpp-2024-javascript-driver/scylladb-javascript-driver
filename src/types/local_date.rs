use crate::utils::js_error;
use scylla::frame::value::CqlDate;
use std::{cmp::max, fmt};

// max and min date range of the Date class in JS.
const MAX_JS_DATE: i32 = 100_000_000;
const MIN_JS_DATE: i32 = -MAX_JS_DATE;

#[napi]
pub struct LocalDateWrapper {
    pub value: i32, // wrapper for number of days from 01.01.1970
    pub year: i32,
    pub month: i8,
    pub day: i8,
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
        if !(MIN_JS_DATE..=MAX_JS_DATE).contains(&value) {
            Ok(LocalDateWrapper {
                value,
                year: 1970,
                month: 1,
                day: 1,
                in_date: false,
            })
        } else {
            let date = Self::add_day(value.into());
            Ok(LocalDateWrapper::new(date.0, date.1, date.2)?)
        }
    }

    /// Counts the number of days since 01.01.1970.
    fn days_since_epoch(day: i8, month: i8, year: i32) -> i32 {
        let mut total_days = 0;

        if year >= 1970 {
            for m in 1..month {
                total_days += Self::days_in_month(m, year) as i32;
            }
            total_days += day as i32 - 1;

            for y in 1970..year {
                total_days += if Self::is_leap_year(y) { 366 } else { 365 };
            }
        } else {
            for m in (month + 1)..=12 {
                total_days -= Self::days_in_month(m, year) as i32;
            }
            total_days -= (Self::days_in_month(month, year) - day) as i32 + 1;

            for y in (year + 1)..1970 {
                total_days -= if Self::is_leap_year(y) { 366 } else { 365 };
            }
        }

        total_days
    }

    /// Adds the number of days to self.
    fn add_day(mut n: i64) -> (i8, i8, i32) {
        let mut date: (i8, i8, i32) = (1, 1, 1970);

        while n != 0 {
            let days_in_year = match Self::is_leap_year(date.2 - (n < 0) as i32) {
                true => 366,
                false => 365,
            };

            if n >= days_in_year {
                n -= days_in_year;
                date.2 += 1;
            } else if n <= -days_in_year {
                n += days_in_year;
                date.2 -= 1;
            } else {
                break;
            }
        }

        while n != 0 {
            let days_in_current_month = Self::days_in_month(date.1, date.2) as i64;

            if n >= days_in_current_month {
                n -= days_in_current_month;
                date.1 += 1;
                if date.1 > 12 {
                    date.1 = 1;
                    date.2 += 1;
                }
            } else if n <= -days_in_current_month {
                n += days_in_current_month;
                date.1 -= 1;
                if date.1 < 1 {
                    date.1 = 12;
                    date.2 -= 1;
                }
            } else {
                break;
            }
        }

        date.0 += n as i8;
        while date.0 < 1 {
            date.1 -= 1;
            if date.1 < 1 {
                date.1 = 12;
                date.2 -= 1;
            }
            date.0 += Self::days_in_month(date.1, date.2);
        }

        while date.0 > Self::days_in_month(date.1, date.2) {
            date.0 -= Self::days_in_month(date.1, date.2);
            date.1 += 1;
            if date.1 > 12 {
                date.1 = 1;
                date.2 += 1;
            }
        }

        date
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

    /// Checks if the given date is correct and returns Self.
    fn check_valid_date(day: i8, month: i8, year: i32) -> napi::Result<Self> {
        if !(1..=12).contains(&month) {
            return Err(js_error("Invalid month"));
        }

        let days_in_month = Self::days_in_month(month, year);

        if !(day >= 1 && day <= days_in_month) {
            return Err(js_error("Invalid number of day"));
        }

        let value = Self::days_since_epoch(day, month, year);

        Ok(LocalDateWrapper {
            year,
            month,
            day,
            value,
            in_date: (MIN_JS_DATE..=MAX_JS_DATE).contains(&value),
        })
    }

    pub fn get_cql_date(&self) -> CqlDate {
        CqlDate(((1 << 31) + self.value) as u32)
    }

    pub fn from_cql_date(date: CqlDate) -> Self {
        let value: i32 = date.0 as i32 - (1 << 31);
        if !(MIN_JS_DATE..=MAX_JS_DATE).contains(&value) {
            LocalDateWrapper {
                value,
                year: 1970,
                month: 1,
                day: 1,
                in_date: false,
            }
        } else {
            let date = Self::add_day(value.into());

            LocalDateWrapper {
                value,
                year: date.2,
                month: date.1,
                day: date.0,
                in_date: true,
            }
        }
    }
}

impl fmt::Display for LocalDateWrapper {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        if self.in_date {
            write!(
                f,
                "{}-{}-{}",
                if self.year >= 1000 || self.year <= -1000 {
                    format!("{}", self.year)
                } else if self.year < 0 {
                    let year_string = (-(self.year)).to_string();
                    format!(
                        "-{}{}",
                        "0".repeat(max(4 - year_string.len(), 0)),
                        year_string
                    )
                } else {
                    let year_string = self.year.to_string();
                    format!(
                        "{}{}",
                        "0".repeat(max(4 - year_string.len(), 0)),
                        year_string
                    )
                },
                if self.month < 10 {
                    format!("0{}", self.month)
                } else {
                    format!("{}", self.month)
                },
                if self.day < 10 {
                    format!("0{}", self.day)
                } else {
                    format!("{}", self.day)
                },
            )
        } else {
            write!(f, "{}", self.value)
        }
    }
}
