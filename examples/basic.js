const lib = require('../')

async function fn() {
    console.log(await lib.rust.testConnection('172.17.0.2:9042'))    
}

fn()

