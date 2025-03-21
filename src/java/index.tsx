import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type JavaEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, JavaEditorProps>((props, ref) => {
  return (
    <Editor {...props} ref={ref} language="java" defaultKeywords={keywords} />
  );
});

export default Component;
