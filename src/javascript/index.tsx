import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type JavaScriptEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, JavaScriptEditorProps>(
  (props, ref) => {
    return <Base {...props} ref={ref} language="javascript" />;
  },
);

export default Component;
