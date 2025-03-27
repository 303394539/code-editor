import { defineConfig } from '@baic/father-plugin-yolk';

export default defineConfig({
  platform: 'browser',
  esm: {
    overrides: {
      'src/code-editor-webpack-plugin': {
        platform: 'node',
        output: 'es/code-editor-webpack-plugin',
      },
    },
  },
  cjs: {
    overrides: {
      'src/code-editor-webpack-plugin': {
        platform: 'node',
        output: 'lib/code-editor-webpack-plugin',
      },
    },
  },
});
