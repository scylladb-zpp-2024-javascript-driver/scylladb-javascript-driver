import globals from "globals";
import pluginJs from "@eslint/js";


/** @type {import('eslint').Linter.Config[]} */
export default [
  pluginJs.configs.recommended,
  {
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        ...globals.mocha,
        ...globals.node,
        expect: "readonly",
        assert: "readonly",
      },
    },
    rules: {
      // Check if there is no unused variables
      // If a value is passed to a function but not used the error is ignored
      // Catched but unused errors are also ignored
      // TODO: FIX "no-unused-vars": ["error", { "args": "none", "caughtErrors": "none" }],
      // TODO: FIX 
      "no-unused-vars": "off",

      //Checks if var is not used
      "no-var": "error",

      //Check if there is a space at the beginning of a comment
      "spaced-comment": "error",

      // This will be deleted after everything is switched from prototypes to classes
      // TODO: FIX
      "no-prototype-builtins": "off",

      // Check if variable names are in camelCase
      // Disabled in some of the tests because they are inserting values into the database
      "camelcase": "error",
      // TODO: FIX 
      "no-unreachable": "off",

      // TODO: FIX 
      "no-undef": "off",

      // TODO: FIX
      "no-async-promise-executor": "off",

      "no-constructor-return": "error",
      "no-duplicate-imports": "error",
      "default-case-last": "error",
      "no-eval": "error",
      "no-multi-str": "error",
      "no-throw-literal": "error",
      "sort-imports": "error",
      "no-lonely-if": "error",
      // TODO: FIX "no-else-return": "error",
      "no-useless-assignment": "error",
    }
  },
];
