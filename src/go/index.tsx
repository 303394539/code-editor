import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type GoEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, GoEditorProps>((props, ref) => {
  return <Editor {...props} ref={ref} language="go" defaultKeywords={keywords} />;
});

export default Component;
