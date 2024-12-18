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
import type { MonacoEditorProps } from 'react-monaco-editor';
import ReactMonacoEditor from 'react-monaco-editor';
import type { ChangeHandler } from 'react-monaco-editor/lib/types';

import type { IDisposable } from 'monaco-editor';
import MonacoEditor from 'monaco-editor';
import type { EditorLanguage } from 'monaco-editor/esm/metadata';
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

export type HintData = {
  keywords: HintDataItem[];
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
  language: EditorLanguage;
  formatter?: (value?: string) => string | undefined;
  onFormatError?: (e: { error?: any; value?: string }) => void;
  hintData?: any;
  onHintData?: (monaco: typeof MonacoEditor, hintData?: any) => void;
  readOnly?: boolean;
  defaultKeywords?: string[];
}

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
  const editorWillMountHandler = useCallback(
    (monaco: typeof MonacoEditor) => {
      monacoRef.current = monaco;
      if (isFunction(onHintData)) {
        onHintData(monaco, hintData);
      } else {
        onHintDataHandler(monaco, hintData);
      }
    },
    [hintData, onHintData, onHintDataHandler],
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
      editor: editorRef.current,
      monaco: monacoRef.current,
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
    />
  );
});

export default Component;
