import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type JSONEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, JSONEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="json" />;
});

export default Component;
