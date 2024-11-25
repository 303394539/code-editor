import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type SCSSEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, SCSSEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="scss" />;
});

export default Component;
