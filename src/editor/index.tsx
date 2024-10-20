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

// @ts-ignore
import * as MonacoEditor from 'monaco-editor';
import * as Editor from 'monaco-editor/esm/vs/editor/editor.api';

export interface EditorInstance {
  editor?: Editor.editor.IStandaloneCodeEditor;
  monaco?: typeof Editor;
  format: () => void;
  setValue: (value: string) => void;
}

export type HintDataItem = {
  label?: string;
  content: string;
  kind: Editor.languages.CompletionItemKind;
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
  hintData?: HintData;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeHandler;
  theme?: MonacoEditorProps['theme'];
  monacoEditorOptions?: Editor.editor.IStandaloneCodeEditor;
  language: string;
  formatter?: (value?: string) => string;
  onHintData?: (monaco: typeof MonacoEditor, hintData?: HintData) => void;
}

// export type CreateOption = AutoOption &
//   Omit<MonacoEditor.editor.IStandaloneEditorConstructionOptions, 'language'>;

export const Kind = Editor.languages.CompletionItemKind;

const editorFactory = ({
  language,
  monaco,
  hintData,
  formatter,
  onHintData,
}: {
  language: string;
  monaco: typeof MonacoEditor;
  hintData?: HintData;
  formatter?: EditorProps['formatter'];
  onHintData?: EditorProps['onHintData'];
}) => {
  if (isFunction(onHintData)) {
    onHintData(monaco, hintData);
  }
  monaco.languages.registerDocumentFormattingEditProvider(language, {
    provideDocumentFormattingEdits(model) {
      return [
        {
          text: isFunction(formatter)
            ? formatter(model.getValue())
            : model.getValue(),
          range: model.getFullModelRange(),
        },
      ];
    },
  });
};

// export const create = ({
//   language,
//   container,
//   options,
//   hintData,
//   formatter,
//   onHintData,
// }: {
//   language: string;
//   container: HTMLElement;
//   options?: CreateOption;
//   hintData?: HintData;
//   formatter?: EditorProps['formatter'];
//   onHintData?: EditorProps['onHintData'];
// }) => {
//   const { autoFormat, autoFocus, ...moreOption } = options || {};
//   const editor = MonacoEditor.editor.create(container, {
//     ...moreOption,
//     language,
//   });
//   editorFactory({
//     language,
//     monaco: MonacoEditor,
//     hintData,
//     formatter,
//     onHintData,
//   });
//   if (autoFocus) {
//     editor.focus();
//   }
//   if (autoFormat && editor.getValue()) {
//     raf(() => editor.getAction('editor.action.formatDocument')?.run());
//   }
//   return { editor, monaco: MonacoEditor };
// };

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
  } = props;
  const options = useMemo(
    () => ({
      contextmenu: false,
      ...monacoEditorOptions,
    }),
    [monacoEditorOptions],
  );
  const editorRef = useRef<Editor.editor.IStandaloneCodeEditor>();
  const monacoRef = useRef<typeof Editor>();
  const formatHandler = useCallback(() => {
    if (editorRef.current) {
      raf(() =>
        editorRef.current?.getAction('editor.action.formatDocument')?.run(),
      );
    }
  }, []);
  const onChangeHandler = useCallback(
    (v: any, e: any) => {
      if (isFunction(onChange)) {
        onChange(v, e);
      }
    },
    [onChange],
  );
  const setValueHandler = useCallback(
    (v: string) => {
      if (editorRef.current) {
        editorRef.current.setValue(v);
        onChangeHandler(v, {} as any);
        if (autoFormat) {
          raf(formatHandler);
        }
      }
    },
    [autoFormat, onChangeHandler, formatHandler],
  );
  const editorDidMountHandler = useCallback(
    async (editor: any, monaco: any) => {
      editorRef.current = editor;
      monacoRef.current = monaco;
      editorFactory({ language, monaco, hintData, formatter, onHintData });
      if (autoFocus) {
        editor.focus();
      }
      if (autoFormat && editor.getValue()) {
        raf(formatHandler);
      }
    },
    [
      language,
      hintData,
      formatter,
      onHintData,
      autoFocus,
      autoFormat,
      formatHandler,
    ],
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
      defaultValue={defaultValue}
      options={options}
      value={value}
      onChange={onChangeHandler}
      editorDidMount={editorDidMountHandler}
    />
  );
});

export default Component;