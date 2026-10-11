/** @file 前端模块、测试和构建脚本的静态检查约定。 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'tests/**/*.js', 'tooling/**/*.js', '*.config.js', 'build.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-var': 'error',
      'prefer-const': 'error',
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'max-lines': ['error', { max: 300, skipBlankLines: false, skipComments: false }],
    },
  },
  { files: ['js/**/*.js'], languageOptions: { globals: globals.browser } },
  {
    files: ['tests/**/*.js', 'tooling/**/*.js', '*.config.js', 'build.js'],
    languageOptions: { globals: globals.node },
  },
];
