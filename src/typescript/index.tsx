import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';
import keywords from './keywords';

export type TypeScriptEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
>;

const Component = forwardRef<EditorInstance, TypeScriptEditorProps>(
  (props, ref) => {
    return (
      <Editor
        {...props}
        ref={ref}
        language="typescript"
        defaultKeywords={keywords}
      />
    );
  },
);

export default Component;
