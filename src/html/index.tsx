import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type HTMLEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, HTMLEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="html" />;
});

export default Component;
