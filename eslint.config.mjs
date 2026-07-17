import globals from 'globals';
import html from 'eslint-plugin-html';
import js from '@eslint/js';

// js.configs.all = every core rule on. The waivers below are the deliberate
// exceptions a generative-art page earns — each one documented, nothing silent.
const waivers = {
  'no-magic-numbers': 'off', // the artwork IS magic numbers, tuned by eye
  'no-bitwise': 'off', // mulberry32 PRNG is bitwise by definition
  'no-plusplus': 'off',
  'one-var': 'off',
  'sort-keys': 'off',
  'sort-vars': 'off',
  'id-length': 'off', // gl, px, py, cR… shader-adjacent math names
  'max-lines': 'off',
  'max-lines-per-function': 'off',
  'max-statements': 'off',
  'max-params': 'off',
  complexity: 'off',
  'no-ternary': 'off',
  'func-style': 'off',
  'capitalized-comments': 'off',
  'no-inline-comments': 'off',
  'line-comment-position': 'off',
  'prefer-destructuring': 'off',
  'init-declarations': 'off',
  'no-use-before-define': ['error', { functions: false }],
  'no-continue': 'off',
  'no-mixed-operators': 'off', // math reads as math
  'no-nested-ternary': 'off',
  'multiline-comment-style': 'off',
  'no-undefined': 'off',
  'require-unicode-regexp': 'off',
  'no-await-in-loop': 'off',
  'prefer-named-capture-group': 'off',
  'max-classes-per-file': 'off',
  'no-lonely-if': 'off',
  'no-negated-condition': 'off',
  'no-else-return': 'off',
  'no-console': 'error',
  'no-warning-comments': 'off',
};

export default [
  { ignores: ['node_modules/**', '.tscheck/**', '.vercel/**'] },
  {
    files: ['**/*.html'],
    plugins: { html },
    languageOptions: { globals: { ...globals.browser } },
    rules: { ...js.configs.all.rules, ...waivers },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
    rules: { ...js.configs.all.rules, ...waivers },
  },
];
