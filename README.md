# ScyllaDB JS Driver

## Instalation and build process
For instalation type command below:
```
$ npm install
```

For build process use this command:
```
$ npm run build
```

If command above don't work, make sure that you have napi package downloded globally.

## File structure
File / Folder | Origin | Usage | Shouldn't be in .gitignore
--- | --- | --- | ---
.cargo          | Generated by 'napi-rs'    | ?                     | ?
.github         | Generated by 'napi-rs'    | CI-CD                 | ✅
examples        | Copied from Datastax      | examlpes              |
lib             | Copied from Datastax      | source code of datastax | 
npm             | Generated by 'napi-rs'    | ? publishing to npm   | ?
src             | Generated by 'napi-rs'    | source files for rust | ✅
test            | Copied from Datastax      | tests                 | 
.gitignore      | Generated by 'napi-rs'    | .gitignore (needs clearing) | ✅
.npmignore      | Generated by 'napi-rs'    | folders ignored when publishing to npm | ✅
build.rs        | Generated by 'napi-rs'    | ?                     | ✅
Cargo.toml      | Generated by 'napi-rs'    | cargo file            | ✅
index.d.ts      | Generated by 'napi-rs' every build | types of native JS functions | ?
index.js        | Generated by 'napi-rs' every build | file containing native JS funtions | ?
main.d.ts       | Copied from Datastax and renamed | types of Datastaxapi   | ✅
main.js         | Copied from Datastax and renamed | entry file for js api     | ✅
package.json    | Generated by 'napi-rs'    | npm package description   | ✅
package-lock.json   | npm install           | npm installed packages    | ✅
rustfmt.toml    | Generated by 'napi-rs'    | rust format file          | ✅


Files in .gitignore
- node_modules
- target
- Cargo.lock
- X.Y.node

## Not implemented functions
For functions not yet implemented:
```js
function function_name()) {
    throw new Error(`TODO: Not implemented`);
}
```

And for functions that will be not implemented:
```js
/**
 * @deprecated The method should not be used
 */
function function_name() {
    throw new ReferenceError(`This function is not supported by our driver`);
}
```