import 'monaco-editor-nginx';

import { forwardRef, useMemo } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';

export type NginxEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
>;

const Component = forwardRef<EditorInstance, NginxEditorProps>(
  ({ theme, ...props }, ref) => {
    const themeMemo = useMemo(
      () => (theme === 'vs-dark' ? 'nginx-theme-dark' : 'nginx-theme'),
      [theme],
    );
    return <Editor {...props} ref={ref} theme={themeMemo} language="nginx" />;
  },
);

export default Component;
