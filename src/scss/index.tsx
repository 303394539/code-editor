import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type SCSSEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, SCSSEditorProps>((props, ref) => {
  return (
    <Base {...props} ref={ref} language="scss" defaultKeywords={keywords} />
  );
});

export default Component;
