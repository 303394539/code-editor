import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type PythonEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, PythonEditorProps>(
  (props, ref) => {
    return <Base {...props} ref={ref} language="shell" />;
  },
);

export default Component;
