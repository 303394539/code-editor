module.exports = {
  extends: '@baic/eslint-config-yolk',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 0,
    'no-console': 0,
  },
};
