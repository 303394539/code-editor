/** @type {import('npm-check-updates').RunOptions} */
module.exports = {
  reject: [
    'dt-sql-parser',
    'monaco-editor', // 0.55.x 以上的导出不适配webpack插件和bundler
    'pnpm',
    'vitest',
  ],
};
