import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type JavaEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, JavaEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="java" />;
});

export default Component;
