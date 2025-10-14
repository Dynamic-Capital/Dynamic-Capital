/**
 * @type {import('eslint').Linter.Config}
 */
const config = {
  root: true,
  ignorePatterns: [
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/build/**',
    '**/out/**',
    '**/coverage/**',
    '**/.turbo/**',
    '**/generated/**'
  ],
  env: {
    browser: true,
    es2024: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'next/core-web-vitals'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  settings: {
    next: {
      rootDir: ['apps/web']
    },
    react: {
      version: 'detect'
    }
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    {
      files: [
        '*.config.{js,cjs,mjs,ts}',
        '*.config.*.ts',
        'scripts/**/*.{js,ts}',
        'tools/**/*.{js,ts}',
        'apps/*/next.config.js',
        'apps/*/next.config.mjs'
      ],
      env: {
        node: true
      }
    }
  ]
};

export default config;
