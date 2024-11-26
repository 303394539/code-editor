import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type RedisEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, RedisEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="redis" defaultKeywords={keywords} />;
});

export default Component;
