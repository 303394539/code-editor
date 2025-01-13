import { isEqual, isFunction, uniqWith } from 'lodash';
import raf from 'raf';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type { MonacoEditorProps as ReactMonacoEditorProps } from 'react-monaco-editor';
import ReactMonacoEditor from 'react-monaco-editor';
import type { ChangeHandler } from 'react-monaco-editor/lib/types';

import type { IDisposable } from 'monaco-editor';
import MonacoEditor from 'monaco-editor';
import type { EditorLanguage } from 'monaco-editor/esm/metadata';
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { languages } from 'monaco-editor/esm/vs/editor/editor.api';

export type EditorInstance = {
  getEditor: () => editor.IStandaloneCodeEditor | void;
  getMonaco: () => typeof MonacoEditor | void;
  format: () => void;
  setValue: (value: string) => void;
};

export type HintDataItem = {
  label?: string;
  content: string;
  kind: languages.CompletionItemKind;
};

export type HintData = {
  keywords: HintDataItem[];
};
type AutoOption = {
  autoFormat?: boolean;
  autoFocus?: boolean;
};

export type EditorProps = AutoOption & {
  defaultValue?: string;
  value?: string;
  onChange?: ChangeHandler;
  theme?: ReactMonacoEditorProps['theme'];
  monacoEditorOptions?: editor.IStandaloneEditorConstructionOptions;
  language: EditorLanguage | string;
  formatter?: (value?: string) => string | undefined;
  onFormatError?: (e: { error?: any; value?: string }) => void;
  hintData?: any;
  onHintData?: (monaco: typeof MonacoEditor, hintData?: any) => void;
  readOnly?: boolean;
  defaultKeywords?: string[];
  onWillMount?: ReactMonacoEditorProps['editorWillMount'];
  onDidMount?: ReactMonacoEditorProps['editorDidMount'];
  onWillUnmount?: ReactMonacoEditorProps['editorWillUnmount'];
};

export const Kind = languages.CompletionItemKind;

const createSuggestionItem = ({ label, content, kind }: HintDataItem) =>
  ({
    label: label || content,
    insertText: content,
    kind,
  } as any);

let disposableList: IDisposable[] = [];

const clearDisposableList = () => {
  disposableList.forEach((disposable) => {
    disposable.dispose();
  });
  disposableList = [];
};

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
    onFormatError,
    onHintData,
    readOnly,
    defaultKeywords = [],
    onWillMount,
    onDidMount,
    onWillUnmount,
  } = props;
  const optionsMemo =
    useMemo<editor.IStandaloneEditorConstructionOptions>(() => {
      return {
        contextmenu: false,
        domReadOnly: true,
        ...monacoEditorOptions,
        readOnly,
      };
    }, [monacoEditorOptions, readOnly]);
  const editorRef = useRef<editor.IStandaloneCodeEditor>();
  const monacoRef = useRef<typeof MonacoEditor>();

  const formatHandler = useCallback(() => {
    try {
      if (isFunction(formatter)) {
        editorRef.current?.setValue(
          formatter(editorRef.current?.getValue()) || '',
        );
      } else {
        raf(() =>
          editorRef.current?.getAction('editor.action.formatDocument')?.run(),
        );
      }
    } catch (error) {
      if (isFunction(onFormatError)) {
        onFormatError({ value: editorRef.current?.getValue(), error });
      }
    }
  }, [formatter, onFormatError]);

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
      editorRef.current?.setValue($v);
    },
    [autoFormat, formatter],
  );
  const onHintDataHandler = useCallback(
    (monaco: typeof MonacoEditor, hintData?: HintData) => {
      clearDisposableList();
      if (defaultKeywords.length) {
        disposableList.push(
          monaco.languages.registerCompletionItemProvider(language, {
            provideCompletionItems() {
              const { keywords: newKeywords = [] } = hintData || {};
              const keywords = uniqWith(
                defaultKeywords
                  .map((content) => ({
                    content,
                    kind: Kind.Keyword,
                  }))
                  .concat(newKeywords),
                (a, b) => isEqual(a.content, b.content),
              );
              const suggestions: languages.CompletionItem[] = [];
              keywords.forEach((item) =>
                suggestions.push(createSuggestionItem(item)),
              );
              return {
                suggestions: uniqWith(suggestions, isEqual),
              };
            },
            quickSuggestions: false,
            fixedOverflowWidgets: true,
            triggerCharacters: ['.', ' '],
          } as languages.CompletionItemProvider),
        );
      }
    },
    [defaultKeywords, language],
  );
  const editorWillMountHandler = useCallback<
    Required<ReactMonacoEditorProps>['editorWillMount']
  >(
    (monaco) => {
      if (isFunction(onWillMount)) {
        onWillMount(monaco);
      }
      monacoRef.current = monaco;
      if (isFunction(onHintData)) {
        onHintData(monaco, hintData);
      } else {
        onHintDataHandler(monaco, hintData);
      }
    },
    [onWillMount, hintData, onHintData, onHintDataHandler],
  );
  const editorDidMountHandler = useCallback<
    Required<ReactMonacoEditorProps>['editorWillUnmount']
  >(
    (editor, monaco) => {
      if (isFunction(onDidMount)) {
        onDidMount(editor, monaco);
      }
      editorRef.current = editor;
      if (autoFocus) {
        editor.focus();
      }
      if (autoFormat && isFunction(formatter) && editor.getValue()) {
        formatHandler();
      }
    },
    [autoFocus, autoFormat, onDidMount, formatHandler, formatter],
  );
  const onResizeHandler = useCallback(
    () => raf(() => editorRef.current?.layout()),
    [],
  );
  useEffect(() => {
    if (monacoRef.current) {
      if (isFunction(onHintData)) {
        onHintData(monacoRef.current, hintData);
      } else {
        onHintDataHandler(monacoRef.current, hintData);
      }
    }
  }, [hintData, onHintData, onHintDataHandler]);
  useEffect(() => {
    window.addEventListener('resize', onResizeHandler);
    onResizeHandler();
    return () => window.removeEventListener('resize', onResizeHandler);
  }, [onResizeHandler]);
  useImperativeHandle(
    ref,
    () => ({
      getEditor: () => editorRef.current,
      getMonaco: () => monacoRef.current,
      format: formatHandler,
      setValue: setValueHandler,
    }),
    [formatHandler, setValueHandler],
  );
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
      editorWillUnmount={onWillUnmount}
    />
  );
});

export default Component;
