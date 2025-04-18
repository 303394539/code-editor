import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type HTMLEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, HTMLEditorProps>((props, ref) => {
  return (
    <Editor {...props} ref={ref} language="html" defaultKeywords={keywords} />
  );
});

export default Component;
