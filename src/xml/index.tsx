import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type XMLEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, XMLEditorProps>((props, ref) => {
  return (
    <Editor {...props} ref={ref} language="xml" defaultKeywords={keywords} />
  );
});

export default Component;
