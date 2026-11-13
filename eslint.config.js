import globals from 'globals';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

const LINTED_FILES = [
  'backend/src/**/*.ts',
  'backend/tests/**/*.ts',
  'eslint.config.js'
];

const rules = {
  'eqeqeq': ['error', 'always'], // Checks data type and content
  'no-eval': ['error'], // Don't use eval()
  'no-var': ['error'], // No use of variable declaration using "var"
  'prefer-const': ['error'], // Use const over let if possible
  'arrow-body-style': ['error', 'always'], // Explicitly write the curly brackets and return statement in an arrow function
  'consistent-return': 'warn', // Enforce consistent return statements in functions. Either always return a value or never return a value
  'max-params': ['warn', 3], // Warn when a function has more than 3 parameters
  'no-async-promise-executor': 'error', // Disallow async functions as Promise executors
  'no-unreachable': 'error', // Disallow code after return, throw, break or continue
  'no-dupe-keys': 'error', // Disallow duplicate keys in object literals

  // TypeScript versions of core rules: the core versions give false errors on types and interfaces
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': ['error'], // No unused variables
  'no-shadow': 'off',
  '@typescript-eslint/no-shadow': ['error', { builtinGlobals: true }] // Don't write block-scoped variables with the same name as a global-scoped variable
};

export default [
  {
    ignores: [
      '**/*',
      '!**/',
      '**/node_modules/',
      ...LINTED_FILES.map((pattern) => {
        return `!${pattern}`;
      })
    ]
  },

  {
    files: LINTED_FILES,
    languageOptions: {
      parser: tseslint.parser, // Lets ESLint read TypeScript syntax
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node }
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin
    },
    rules
  },

  // Turns off any ESLint rules that would conflict with Prettier
  eslintConfigPrettier

  // ─── Word add-in (enable when word-addin/ exists) ────────────────────────
  // Also add 'word-addin/src/**/*.ts' to LINTED_FILES above.
  // {
  //   files: ['word-addin/src/**/*.ts'],
  //   languageOptions: {
  //     globals: { ...globals.browser, Office: 'readonly', Word: 'readonly' }
  //   }
  // }
];
