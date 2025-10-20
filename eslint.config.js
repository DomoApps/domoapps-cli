const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'distcopy/**',
      'templates/**',
      'coverage/**',
      '**/*.js',
      '!eslint.config.js',
      '!jest.config.js',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 11,
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single'],
      semi: ['error', 'always'],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
    },
  },
];
