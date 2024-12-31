import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type LESSEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, LESSEditorProps>((props, ref) => {
  return (
    <Editor {...props} ref={ref} language="less" defaultKeywords={keywords} />
  );
});

export default Component;
