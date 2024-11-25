import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type XMLEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, XMLEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="xml" />;
});

export default Component;
