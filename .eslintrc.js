module.exports = {
  env: {
    es6: true,
  },
  ignorePatterns: ['node_modules/*', 'lib/*', 'es/*'],
  parser: '@typescript-eslint/parser',
  extends: [
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
    ecmaVersion: 2018,
  },
  rules: {
    '@typescript-eslint/explicit-function-return-type': 0,
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-use-before-define': 'warn',
    '@typescript-eslint/camelcase': 'warn',
    '@typescript-eslint/no-empty-interface': 'warn',
    '@typescript-eslint/no-empty-function': 'warn',
    '@typescript-eslint/no-namespace': 'warn',
    'react/display-name': 'warn',
    'react/prop-types': 'warn',
    'prefer-rest-params': 'warn',
    'no-else-return': 'error',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
