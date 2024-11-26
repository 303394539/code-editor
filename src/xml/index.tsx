import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type XMLEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, XMLEditorProps>((props, ref) => {
  return (
    <Base {...props} ref={ref} language="xml" defaultKeywords={keywords} />
  );
});

export default Component;
