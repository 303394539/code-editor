import './monaco';

import { forwardRef } from 'react';

import type { EditorInstance, EditorProps } from '../editor';
import Editor from '../editor';

export type ElasticSearchEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
>;

const Component = forwardRef<EditorInstance, ElasticSearchEditorProps>(
  (props, ref) => {
    return <Editor {...props} ref={ref} language="search" />;
  },
);

export default Component;
