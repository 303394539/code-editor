import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type CSSEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, CSSEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="css" />;
});

export default Component;
