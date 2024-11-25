import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type RedisEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, RedisEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="redis" />;
});

export default Component;
