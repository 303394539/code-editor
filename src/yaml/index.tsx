import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type YAMLEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, YAMLEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="yaml" />;
});

export default Component;
