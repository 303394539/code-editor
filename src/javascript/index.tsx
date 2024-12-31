import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type JavaScriptEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
>;

const Component = forwardRef<EditorInstance, JavaScriptEditorProps>(
  (props, ref) => {
    return (
      <Editor
        {...props}
        ref={ref}
        language="javascript"
        defaultKeywords={keywords}
      />
    );
  },
);

export default Component;
