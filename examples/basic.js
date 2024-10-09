const lib = require('../index')

async function fn() {
    console.log(await lib.testConnection('172.17.0.2:9042'))    
}

fn()

