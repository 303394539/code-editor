import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type TypeScriptEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, TypeScriptEditorProps>(
  (props, ref) => {
    return <Base {...props} ref={ref} language="typescript" />;
  },
);

export default Component;
