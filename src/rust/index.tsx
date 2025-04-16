import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type RustEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, RustEditorProps>((props, ref) => {
  return (
    <Editor {...props} ref={ref} language="rust" defaultKeywords={keywords} />
  );
});

export default Component;
