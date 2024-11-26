import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type YAMLEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, YAMLEditorProps>((props, ref) => {
  return (
    <Base {...props} ref={ref} language="yaml" defaultKeywords={keywords} />
  );
});

export default Component;
