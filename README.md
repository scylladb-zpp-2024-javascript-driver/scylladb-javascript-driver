![Static Badge](https://img.shields.io/badge/API%20coverage-0%25-red)
![test workflow](https://github.com/scylladb-zpp-2024-javascript-driver/scylladb-javascript-driver/actions/workflows/tests.yml/badge.svg)
![quality workflow](https://github.com/scylladb-zpp-2024-javascript-driver/scylladb-javascript-driver/actions/workflows/code-quality.yml/badge.svg)
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

| File / Folder     | Origin                             | Usage                                 
| ----------------- | ---------------------------------- | --------------------------------------
| .cargo            | Generated by 'napi-rs'             | 
| .github           | Generated by 'napi-rs'             | CI-CD for GitHub
| examples          | Copied from Datastax               | Example usage of the Datastax driver
| lib               | Copied from Datastax               | Source code of the Datastax driver
| npm               | Generated by 'napi-rs'             | Files for publishing to the NPM
| src               | Generated by 'napi-rs'             | Source files of Rust code of our driver
| test              | Copied from Datastax               | Tests from Datastax
| .gitignore        | Generated by 'napi-rs'             | .gitignore modified (template for Node.js)
| .npmignore        | Generated by 'napi-rs'             | Folders ignored when publishing to the NPM
| .prettierignore   | Manually created                   | Files to ignore when prettifying 
| .prettierrc       | Manually created                   | File specifying rules for prettifying JS files
| build.rs          | Generated by 'napi-rs'             | File needed for a build process
| Cargo.toml        | Generated by 'napi-rs'             | Cargo file
| index.d.ts        | Generated by 'napi-rs' every build | Types of native JS functions (generated on build)
| index.js          | Generated by 'napi-rs' every build | File containing native JS funtions (generated on build)
| main.d.ts         | Copied from Datastax and renamed   | Types of the JS API
| main.js           | Copied from Datastax and renamed   | Entry file for the JS API
| package.json      | Generated by 'napi-rs'             | NPM package description
| package-lock.json | npm install                        | NPM installed packages
| rustfmt.toml      | Generated by 'napi-rs'             | Rust format file

Files in .gitignore (auto-generated)

- node_modules/
- target/
- Cargo.lock
- *.node

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
