import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type CSSEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, CSSEditorProps>((props, ref) => {
  return (
    <Base {...props} ref={ref} language="css" defaultKeywords={keywords} />
  );
});

export default Component;
