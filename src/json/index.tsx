import { isString } from 'lodash';

import { forwardRef, useCallback } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Base from '../editor';
import keywords from './keywords';

export type JSONEditorProps = Omit<EditorProps, 'language' | 'defaultKeywords'>;

const Component = forwardRef<EditorInstance, JSONEditorProps>((props, ref) => {
  const formatterHandler = useCallback((value?: string) => {
    if (isString(value) && value.length) {
      try {
        return JSON.stringify(JSON.parse(value), null, 2);
      } catch (error) {
        console.error(error);
      }
    }
    return value || '';
  }, []);
  return (
    <Base
      formatter={formatterHandler}
      {...props}
      ref={ref}
      language="json"
      defaultKeywords={keywords}
    />
  );
});

export default Component;
