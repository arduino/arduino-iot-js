import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'lib/**', 'es/**', 'coverage/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }],
      // Hoisted function declarations are safe to reference before their
      // definition, so only flag variables/classes used before they exist.
      '@typescript-eslint/no-use-before-define': ['error', { functions: false, typedefs: false }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-empty-interface': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/await-thenable': 'error',
      'prefer-rest-params': 'warn',
      'no-else-return': 'error',
    },
  },
  // Plain JS/CJS/MJS files (e.g. this config) don't get type-aware linting.
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettierRecommended
);
