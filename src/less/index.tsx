import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type LESSEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, LESSEditorProps>((props, ref) => {
  return (
    <Base {...props} ref={ref} language="less" defaultKeywords={keywords} />
  );
});

export default Component;
