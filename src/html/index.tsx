import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type HTMLEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, HTMLEditorProps>((props, ref) => {
  return (
    <Base {...props} ref={ref} language="html" defaultKeywords={keywords} />
  );
});

export default Component;
