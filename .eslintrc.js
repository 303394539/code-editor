/** @type {import('eslint').Linter.BaseConfig} */
module.exports = {
  extends: '@baic/eslint-config-yolk',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 0,
    'no-console': 0,
    /**
     * ElasticSearch临时放开
     */
    'no-useless-escape': 0,
    '@typescript-eslint/no-unused-expressions': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/no-non-null-assertion': 0,
  },
};
