/** @type {import('next').NextConfig} */
module.exports = {
  extends: [
    'next/core-web-vitals',
    '../../.eslintrc.js'
  ],
  env: {
    browser: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react/no-unescaped-entities': 'off',
  }
};