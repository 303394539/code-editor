import { isFunction } from 'lodash';
import raf from 'raf';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { MonacoEditorProps } from 'react-monaco-editor';
import ReactMonacoEditor from 'react-monaco-editor';
import type { ChangeHandler } from 'react-monaco-editor/lib/types';

import MonacoEditor from 'monaco-editor';
import { editor, languages } from 'monaco-editor/esm/vs/editor/editor.api';

export interface EditorInstance {
  editor?: editor.IStandaloneCodeEditor;
  monaco?: typeof MonacoEditor;
  format: () => void;
  setValue: (value: string) => void;
}

export type HintDataItem = {
  label?: string;
  content: string;
  kind: languages.CompletionItemKind;
};

type TableItem = HintDataItem & {
  fields: HintDataItem[];
};

type DatabaseItem = HintDataItem & {
  tables: TableItem[];
};

export type HintData = {
  keywords: HintDataItem[];
  databases: DatabaseItem[];
};

interface AutoOption {
  autoFormat?: boolean;
  autoFocus?: boolean;
}

export interface EditorProps extends AutoOption {
  defaultValue?: string;
  value?: string;
  onChange?: ChangeHandler;
  theme?: MonacoEditorProps['theme'];
  monacoEditorOptions?: editor.IStandaloneEditorConstructionOptions;
  language: string;
  formatter?: (value?: string) => string | undefined;
  hintData?: HintData;
  onHintData?: (monaco: typeof MonacoEditor, hintData?: HintData) => void;
  readOnly?: boolean;
}

export const Kind = languages.CompletionItemKind;

const Component = forwardRef<EditorInstance, EditorProps>((props, ref) => {
  const {
    defaultValue,
    value,
    hintData,
    onChange,
    monacoEditorOptions,
    theme = 'vs',
    autoFormat,
    autoFocus,
    language,
    formatter,
    onHintData,
    readOnly,
  } = props;
  const optionsMemo =
    useMemo<editor.IStandaloneEditorConstructionOptions>(() => {
      return {
        contextmenu: false,
        ...monacoEditorOptions,
        readOnly,
        domReadOnly: true,
      };
    }, [monacoEditorOptions, readOnly]);
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const monacoRef = useRef<typeof MonacoEditor>();

  const formatHandler = useCallback(() => {
    if (isFunction(formatter)) {
      editorRef.current?.setValue(
        formatter(editorRef.current?.getValue()) || '',
      );
    } else {
      raf(() =>
        editorRef.current?.getAction('editor.action.formatDocument')?.run(),
      );
    }
  }, [formatter]);

  const onChangeHandler = useCallback(
    (v: string, e: editor.IModelContentChangedEvent) => {
      if (isFunction(onChange)) {
        onChange(v, e);
      }
    },
    [onChange],
  );
  const setValueHandler = useCallback(
    (v: string) => {
      let $v = v || '';
      if (autoFormat && isFunction(formatter)) {
        $v = formatter(v) || '';
      }
      onChangeHandler($v, {} as editor.IModelContentChangedEvent);
      editorRef.current?.setValue($v);
    },
    [onChangeHandler, autoFormat, formatter],
  );
  const editorWillMountHandler = useCallback(
    (monaco: typeof MonacoEditor) => {
      monacoRef.current = monaco;
      if (isFunction(onHintData)) {
        onHintData(monaco, hintData);
      }
    },
    [hintData, onHintData],
  );
  const editorDidMountHandler = useCallback(
    (editor: editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;
      if (autoFocus) {
        editor.focus();
      }
      if (autoFormat && isFunction(formatter) && editor.getValue()) {
        formatHandler();
      }
    },
    [autoFocus, autoFormat, formatHandler, formatter],
  );
  const onResizeHandler = useCallback(
    () => raf(() => editorRef.current?.layout()),
    [],
  );
  useImperativeHandle(ref, () => ({
    editor: editorRef.current,
    monaco: monacoRef.current,
    format: formatHandler,
    setValue: setValueHandler,
  }));
  useEffect(() => {
    if (monacoRef.current && isFunction(onHintData)) {
      onHintData(monacoRef.current, hintData);
    }
  }, [hintData, onHintData]);
  useEffect(() => {
    window.addEventListener('resize', onResizeHandler);
    onResizeHandler();
    return () => window.removeEventListener('resize', onResizeHandler);
  }, [onResizeHandler]);
  return (
    <ReactMonacoEditor
      language={language}
      theme={theme}
      options={optionsMemo}
      defaultValue={defaultValue}
      value={value}
      onChange={onChangeHandler}
      editorWillMount={editorWillMountHandler}
      editorDidMount={editorDidMountHandler}
    />
  );
});

export default Component;
