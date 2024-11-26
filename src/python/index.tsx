import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type PythonEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
>;

const Component = forwardRef<EditorInstance, PythonEditorProps>(
  (props, ref) => {
    return (
      <Base {...props} ref={ref} language="python" defaultKeywords={keywords} />
    );
  },
);

export default Component;
