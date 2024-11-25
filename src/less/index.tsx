import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type LESSEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, LESSEditorProps>((props, ref) => {
  return <Base {...props} ref={ref} language="less" />;
});

export default Component;
