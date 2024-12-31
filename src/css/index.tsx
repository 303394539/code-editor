import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type CSSEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, CSSEditorProps>((props, ref) => {
  return (
    <Editor {...props} ref={ref} language="css" defaultKeywords={keywords} />
  );
});

export default Component;
