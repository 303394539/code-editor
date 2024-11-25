import MonacoEditorWebpackPlugin from 'monaco-editor-webpack-plugin';

declare namespace CodeEditorWebpackPlugin {
  interface Options
    extends Omit<
      MonacoEditorWebpackPlugin.IMonacoEditorWebpackPluginOpts,
      'filename'
    > {
    /**
     * Specify a filename template to use for generated files.
     * Use e.g. './editor/[contenthash:10].js' to include content-based hashes.
     */
    filename?: string;
  }
}

class CodeEditorWebpackPlugin extends MonacoEditorWebpackPlugin {
  constructor(options?: CodeEditorWebpackPlugin.Options) {
    super({
      filename: './editor/[contenthash:10].js',
      ...options,
    });
  }
}

export default CodeEditorWebpackPlugin;
