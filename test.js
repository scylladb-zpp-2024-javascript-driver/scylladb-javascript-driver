const rust = require('./index');


let buffer = Buffer.from('abcdssssaaaabbbb');

console.log(buffer)
console.log(buffer.toString())
console.log(typeof buffer)

let inet = rust.InetAddress.new(buffer)

console.log(inet.toString())
