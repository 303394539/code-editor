import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type RedisEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
>;

const Component = forwardRef<EditorInstance, RedisEditorProps>((props, ref) => {
  return (
    <Editor {...props} ref={ref} language="redis" defaultKeywords={keywords} />
  );
});

export default Component;
