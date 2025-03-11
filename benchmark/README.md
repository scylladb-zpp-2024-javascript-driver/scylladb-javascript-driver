`docker run --name scylla-test -d scylladb/scylla`

# JS benchmark
param `<driver>` is `scylladb-javascript-driver ` or ` cassandra-driver`

- concurent_insert.js 

` node concurent_insert.js <driver> <Number of insert>`
- insert.js

`node insert.js <driver> <Number of insert>`

- select.js

`node select.js <driver> <Number of select>`


# Rust driver




- select.rs

`cargo build --bin select_benchmark -r`

and then

`CNT=<Number of queries (default 100)> cargo run --bin select_benchmark -r`

- insert.rs

`cargo build --bin insert_benchmark -r`

and then

`CNT=<Number of queries (default 100)> cargo run --bin insert_benchmark -r`

- concurent_insert.rs

`cargo build --bin concurrent_insert_benchmark -r`

and then

`CNT=<Number of queries (default 100)> cargo run --bin concurrent_insert_benchmark -r`

