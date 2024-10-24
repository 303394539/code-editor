import { forwardRef, useCallback } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';

export type JSONEditorProps = Omit<EditorProps, 'language'>;

const Component = forwardRef<EditorInstance, JSONEditorProps>((props, ref) => {
  const formatterHandler = useCallback(
    (value?: string) => JSON.stringify(value, null, 2),
    [],
  );
  return (
    <Base formatter={formatterHandler} {...props} ref={ref} language="json" />
  );
});

export default Component;
