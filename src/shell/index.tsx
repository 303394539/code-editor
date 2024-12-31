import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type ShellEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
>;

const Component = forwardRef<EditorInstance, ShellEditorProps>((props, ref) => {
  return (
    <Editor {...props} ref={ref} language="shell" defaultKeywords={keywords} />
  );
});

export default Component;
