import { isEqual, isFunction, uniqWith } from 'lodash';
import raf from 'raf';

import type { ReactElement, Ref } from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import type {
  MonacoDiffEditorProps as ReactMonacoDiffEditorProps,
  MonacoEditorProps as ReactMonacoEditorProps,
} from 'react-monaco-editor';
import ReactMonacoEditor, {
  MonacoDiffEditor as ReactMonacoDiffEditor,
} from 'react-monaco-editor';
import type { ChangeHandler } from 'react-monaco-editor/lib/types';

import type { IDisposable } from 'monaco-editor';
import MonacoEditor from 'monaco-editor';
import type { EditorLanguage } from 'monaco-editor/esm/metadata';
import type { editor } from 'monaco-editor/esm/vs/editor/editor.api';
import { languages } from 'monaco-editor/esm/vs/editor/editor.api';

export type ModeMap = {
  normal: {
    editor: editor.IStandaloneCodeEditor;
    options: Omit<editor.IStandaloneEditorConstructionOptions, 'readOnly'>;
    formatErrorEvent: { error?: any; value?: string };
    instance: {
      getEditor: () => editor.IStandaloneCodeEditor | void;
      setValue: (value: string) => void;
      format: () => void;
    };
    props: {
      theme?: ReactMonacoEditorProps['theme'];
      onWillMount?: ReactMonacoEditorProps['editorWillMount'];
      onDidMount?: ReactMonacoEditorProps['editorDidMount'];
      onWillUnmount?: ReactMonacoEditorProps['editorWillUnmount'];
    };
  };
  diff: {
    editor: editor.IStandaloneDiffEditor;
    options: Omit<editor.IStandaloneDiffEditorConstructionOptions, 'readOnly'>;
    formatErrorEvent: {
      error?: any;
      value?: string;
      original?: string;
    };
    instance: {
      getEditor: () => editor.IStandaloneDiffEditor | void;
      setValue: (value: string) => void;
      setOriginal: (value: string) => void;
      format: (scope?: ('original' | 'value')[]) => void;
    };
    props: {
      theme?: ReactMonacoDiffEditorProps['theme'];
      onWillMount?: ReactMonacoDiffEditorProps['editorWillMount'];
      onDidMount?: ReactMonacoDiffEditorProps['editorDidMount'];
      onWillUnmount?: ReactMonacoDiffEditorProps['editorWillUnmount'];
    } & Pick<ReactMonacoDiffEditorProps, 'original'>;
  };
};

export type Mode = keyof ModeMap;

export type MonacoType = typeof MonacoEditor;

export type EditorInstance<T extends Mode = 'normal'> = {
  getMonaco: () => MonacoType | void;
} & ModeMap[T]['instance'];

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

export type EditorProps<T extends Mode = 'normal'> = AutoOption & {
  mode?: T;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeHandler;
  monacoEditorOptions?: ModeMap[T]['options'];
  language: EditorLanguage | string;
  formatter?: (value?: string) => string | undefined;
  onFormatError?: (e: ModeMap[T]['formatErrorEvent']) => void;
  hintData?: any;
  onHintData?: (monaco: MonacoType, hintData?: any) => void;
  readOnly?: boolean;
  defaultKeywords?: string[];
} & ModeMap[T]['props'];

export type EditorStaticInterface = {
  displayName: string;
};

export type InternalEditorType = <T extends Mode = 'normal'>(
  props: EditorProps<T> & {
    ref?: Ref<EditorInstance<T>>;
  },
) => ReactElement;

export type EditorInterface = InternalEditorType & EditorStaticInterface;

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

function InternalComponent<T extends Mode = 'normal'>(
  props: EditorProps<T>,
  ref?: Ref<EditorInstance<T>>,
) {
  const {
    mode = 'normal',
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
  const { original } = props as EditorProps<'diff'>;
  const optionsMemo = useMemo<ModeMap[T]['options']>(() => {
    return {
      contextmenu: false,
      domReadOnly: true,
      ...monacoEditorOptions,
      readOnly,
      readOnlyMessage: {
        value: '不可编辑',
        supportThemeIcons: true,
        supportHtml: true,
        ...monacoEditorOptions?.readOnlyMessage,
      },
    };
  }, [monacoEditorOptions, readOnly]);
  const editorRef = useRef<ModeMap[T]['editor']>();
  const monacoRef = useRef<MonacoType>();

  const formatHandler = useCallback<ModeMap['diff']['instance']['format']>(
    (scope) => {
      if (mode === 'diff') {
        const $scope = scope || [];
        const editor = editorRef.current as ModeMap['diff']['editor'];
        const originalModel = editor?.getModel()?.original;
        const modifiedModel = editor?.getModel()?.modified;
        try {
          if (isFunction(formatter)) {
            if (!$scope.length || $scope.includes('original')) {
              originalModel?.setValue(
                formatter(originalModel?.getValue()) || '',
              );
            }
            if (!$scope.length || $scope.includes('value')) {
              modifiedModel?.setValue(
                formatter(modifiedModel?.getValue()) || '',
              );
            }
          } else {
            editor.getSupportedActions().forEach((action) => {
              const { id } = action;
              if (id.includes('format')) {
                raf(() => action?.run());
              }
            });
          }
        } catch (error) {
          if (isFunction(onFormatError)) {
            onFormatError({
              original: originalModel?.getValue(),
              value: modifiedModel?.getValue(),
              error,
            });
          }
        }
      } else {
        const editor = editorRef.current as ModeMap['normal']['editor'];
        try {
          if (isFunction(formatter)) {
            editor
              ?.getModel()
              ?.setValue(formatter(editor?.getModel()?.getValue()) || '');
          } else {
            editor.getSupportedActions().forEach((action) => {
              const { id } = action;
              if (id.includes('format')) {
                raf(() => action?.run());
              }
            });
          }
        } catch (error) {
          if (isFunction(onFormatError)) {
            onFormatError({ value: editor?.getModel()?.getValue(), error });
          }
        }
      }
    },
    [formatter, mode, onFormatError],
  );

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
      if (mode === 'diff') {
        const editor = editorRef.current as ModeMap['diff']['editor'];
        const modifiedModel = editor?.getModel()?.modified;
        modifiedModel?.setValue($v);
      } else {
        const editor = editorRef.current as ModeMap['normal']['editor'];
        editor?.setValue($v);
      }
    },
    [autoFormat, formatter, mode],
  );
  const setOriginalHandler = useCallback(
    (v: string) => {
      let $v = v || '';
      if (autoFormat && isFunction(formatter)) {
        $v = formatter(v) || '';
      }
      const editor = editorRef.current as ModeMap['diff']['editor'];
      const originalModel = editor?.getModel()?.original;
      originalModel?.setValue($v);
    },
    [autoFormat, formatter],
  );
  const onHintDataHandler = useCallback(
    (monaco: MonacoType, hintData?: HintData) => {
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
    (monaco: MonacoType) => {
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
  const editorDidMountHandler = useCallback(
    (editor: ModeMap[T]['editor'], monaco: MonacoType) => {
      if (isFunction(onDidMount)) {
        onDidMount(
          editor as ModeMap['normal']['editor'] & ModeMap['diff']['editor'],
          monaco,
        );
      }
      editorRef.current = editor;
      if (autoFocus) {
        editor.focus();
      }
      if (autoFormat && isFunction(formatter)) {
        if (mode === 'diff') {
          const editor = editorRef.current as ModeMap['diff']['editor'];
          const originalModel = editor?.getModel()?.original;
          const modifiedModel = editor?.getModel()?.modified;
          if (originalModel?.getValue() || modifiedModel?.getValue()) {
            formatHandler();
          }
        } else {
          const editor = editorRef.current as ModeMap['normal']['editor'];
          if (editor?.getValue()) {
            formatHandler();
          }
        }
      }
    },
    [onDidMount, autoFocus, autoFormat, formatter, mode, formatHandler],
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
    () =>
      ({
        getEditor: () => editorRef.current,
        getMonaco: () => monacoRef.current,
        format: formatHandler,
        setValue: setValueHandler,
        setOriginal: setOriginalHandler,
      } as EditorInstance<'diff'>),
    [formatHandler, setOriginalHandler, setValueHandler],
  );
  if (mode === 'diff') {
    return (
      <ReactMonacoDiffEditor
        language={language}
        theme={theme}
        options={optionsMemo}
        defaultValue={defaultValue}
        value={value}
        original={original}
        onChange={onChangeHandler}
        editorWillMount={editorWillMountHandler}
        editorDidMount={editorDidMountHandler}
        editorWillUnmount={
          onWillUnmount as ModeMap['diff']['props']['onWillUnmount']
        }
      />
    );
  }
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
      editorWillUnmount={
        onWillUnmount as ModeMap['normal']['props']['onWillUnmount']
      }
    />
  );
}

const Component = forwardRef(
  InternalComponent,
) as InternalEditorType as EditorInterface;

export default Component;
