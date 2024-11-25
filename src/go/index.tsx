import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type GoEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, GoEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="go" />;
});

export default Component;
