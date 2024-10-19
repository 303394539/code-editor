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

// @ts-ignore
import { parser } from 'dt-sql-parser';
import * as MonacoEditor from 'monaco-editor';
import * as Editor from 'monaco-editor/esm/vs/editor/editor.api';
import * as SqlFormatter from 'sql-formatter';

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

export interface SqlEditorProps extends AutoOption {
  hintData?: HintData;
  defaultValue?: string;
  value?: string;
  onChange?: ChangeHandler;
  theme?: MonacoEditorProps['theme'];
  monacoEditorOptions?: Editor.editor.IStandaloneCodeEditor;
}

export type CreateOption = AutoOption &
  Omit<MonacoEditor.editor.IStandaloneEditorConstructionOptions, 'language'>;

export const Kind = Editor.languages.CompletionItemKind;

let hintDisposables: MonacoEditor.IDisposable[] = [];

const createSuggestionItem = ({ label, content, kind }: HintDataItem) =>
  ({
    label: label || content,
    insertText: content,
    kind,
  } as any);

export const setHintData = (
  monaco: typeof MonacoEditor,
  hintData?: HintData,
) => {
  hintDisposables.forEach((disposable) => {
    disposable.dispose();
  });
  hintDisposables = [];
  hintDisposables.push(
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems(model, position) {
        const { keywords = [], databases = [] } = hintData || {};
        const lineContent = model.getValueInRange(
          new Editor.Range(
            position.lineNumber,
            0,
            position.lineNumber,
            position.column,
          ),
        );
        const suggestions: Editor.languages.CompletionItem[] = [];
        let leftLineNumber = position.lineNumber;
        let leftColumn = position.column - 1;
        for (; leftLineNumber >= 1; leftLineNumber--) {
          if (leftLineNumber === position.lineNumber) {
            for (; leftColumn > 0; leftColumn--) {
              const str = model.getValueInRange(
                new Editor.Range(
                  leftLineNumber,
                  leftColumn - 1,
                  leftLineNumber,
                  leftColumn,
                ),
              );
              if (';' === str) {
                break;
              }
            }
          } else {
            leftColumn = model.getLineContent(leftLineNumber).length + 1;
            for (; leftColumn > 0; leftColumn--) {
              const str = model.getValueInRange(
                new Editor.Range(
                  leftLineNumber,
                  leftColumn - 1,
                  leftLineNumber,
                  leftColumn,
                ),
              );
              if (';' === str) {
                break;
              }
            }
          }
        }
        let rightLineNumber = position.lineNumber;
        let rightColumn = position.column + 1;
        for (; rightLineNumber < model.getLineCount(); rightLineNumber++) {
          if (rightLineNumber === position.lineNumber) {
            for (
              ;
              rightColumn < model.getLineMaxColumn(rightLineNumber);
              rightColumn++
            ) {
              const str = model.getValueInRange(
                new Editor.Range(
                  rightLineNumber,
                  rightColumn,
                  rightLineNumber,
                  rightColumn + 1,
                ),
              );
              if (';' === str) {
                break;
              }
            }
          } else {
            rightColumn = 0;
            for (
              ;
              rightColumn < model.getLineMaxColumn(rightLineNumber);
              rightColumn++
            ) {
              const str = model.getValueInRange(
                new Editor.Range(
                  rightLineNumber,
                  rightColumn,
                  rightLineNumber,
                  rightColumn + 1,
                ),
              );
              if (';' === str) {
                break;
              }
            }
          }
        }
        const currentSql = new Editor.Range(
          leftLineNumber + 1,
          leftColumn,
          rightLineNumber,
          rightColumn,
        );
        const { locations } =
          parser.parserSql(model.getValueInRange(currentSql), '', false) || {};
        const tableAlias = new Map<string, string[]>();
        locations.forEach(({ source, type, identifierChain, alias }: any) => {
          if ('table' === source && 'alias' === type) {
            const item = identifierChain[identifierChain.length - 1];
            const { name } = item || {};
            const arr = tableAlias.get(alias);
            if (Array.isArray(arr)) {
              if (arr.indexOf(name) < 0) {
                tableAlias.set(alias, arr.concat(name));
              }
            } else {
              tableAlias.set(alias, [name]);
            }
          }
        });
        if (/(\s+|,)([0-9a-zA-Z_]{1})?$/iu.test(lineContent)) {
          console.info('进入(s+|,)之后提示数据库和表模式', lineContent);
          if (
            /(from|join|update|delete)\s+([0-9a-zA-Z_]{1})?$/iu.test(
              lineContent,
            )
          ) {
            console.info(
              '进入(from|join|update|delete)之后提示数据库和表模式',
              lineContent,
            );
            databases.forEach((database) => {
              const { tables } = database;
              suggestions.push(createSuggestionItem(database));
              if (Array.isArray(tables) && tables.length) {
                tables.forEach((table) => {
                  suggestions.push(createSuggestionItem(table));
                });
              }
            });
            keywords.forEach((item) =>
              suggestions.push(createSuggestionItem(item)),
            );
          } else if (
            /(select|insert|set|where|into|values)\s+([0-9a-zA-Z_]{1})?$/iu.test(
              lineContent,
            )
          ) {
            console.info(
              '进入(select|insert|set|where|into|values)之后提示数据库和表模式',
              lineContent,
            );
            databases.forEach((database) => {
              const { tables } = database;
              suggestions.push(createSuggestionItem(database));
              if (Array.isArray(tables) && tables.length) {
                tables.forEach((table) => {
                  suggestions.push(createSuggestionItem(table));
                  const { fields } = table;
                  fields.forEach((item) => {
                    suggestions.push(createSuggestionItem(item));
                  });
                });
              }
            });
            keywords.forEach((item) =>
              suggestions.push(createSuggestionItem(item)),
            );
          } else if (/table\s+([0-9a-zA-Z_]{1})?$/iu.test(lineContent)) {
            console.info('进入table之后提示数据库和表模式', lineContent);
            databases.forEach((database) => {
              const { tables } = database;
              suggestions.push(createSuggestionItem(database));
              if (Array.isArray(tables) && tables.length) {
                tables.forEach((table) => {
                  suggestions.push(createSuggestionItem(table));
                });
              }
            });
          } else if (
            /(alter|drop|create)\s+([0-9a-zA-Z_]{1})?$/iu.test(lineContent)
          ) {
            console.info(
              '进入(alter|drop|create)之后提示table关键词',
              lineContent,
            );
            keywords.forEach(
              (item) =>
                item.content &&
                'table' === item.content.toLocaleLowerCase() &&
                suggestions.push(createSuggestionItem(item)),
            );
          } else if (/,([0-9a-zA-Z_]{1})?$/iu.test(lineContent)) {
            console.info('进入,提示数据库、表和字段模式', lineContent);
            databases.forEach((database) => {
              const { tables } = database;
              suggestions.push(createSuggestionItem(database));
              if (Array.isArray(tables) && tables.length) {
                tables.forEach((table) => {
                  suggestions.push(createSuggestionItem(table));
                  const { fields } = table;
                  fields.forEach((item) => {
                    suggestions.push(createSuggestionItem(item));
                  });
                });
              }
            });
            keywords.forEach((item) =>
              suggestions.push(createSuggestionItem(item)),
            );
          } else {
            keywords.forEach((item) =>
              suggestions.push(createSuggestionItem(item)),
            );
          }
        } else if (
          /([0-9a-zA-Z_]+)\.([0-9a-zA-Z_]+)\.([0-9a-zA-Z_]{1})?$/iu.test(
            lineContent,
          )
        ) {
          // 进入.提示数据库、表和字段模式
          console.info('进入.提示数据库、表和字段模式', lineContent);
          const [, dbName, tableName] =
            /([0-9a-zA-Z_]+)\.([0-9a-zA-Z_]+)\.([0-9a-zA-Z_]{1})?$/iu.exec(
              lineContent,
            ) || [];
          databases.forEach(({ content: dcontent, tables }) => {
            if (
              dbName === dcontent ||
              (tableAlias.get(dbName) || '').indexOf(dcontent) >= 0
            ) {
              tables.forEach(({ content, fields }) => {
                if (
                  tableName === content ||
                  (tableAlias.get(tableName) || '').indexOf(content) >= 0
                ) {
                  fields.forEach((item) => {
                    suggestions.push(createSuggestionItem(item));
                  });
                }
              });
            }
          });
        } else if (/([0-9a-zA-Z_]+)\.([0-9a-zA-Z_]{1})?$/iu.test(lineContent)) {
          // 进入表点字段模式
          console.info('进入表.提示字段模式');
          const [, , tableName] =
            /((\w+)\.([0-9a-zA-Z_]{1})?)$/iu.exec(lineContent) || [];
          databases.forEach(({ content: dcontent, tables }) => {
            if (
              tableName === dcontent ||
              (tableAlias.get(tableName) || '').indexOf(dcontent) >= 0
            ) {
              if (Array.isArray(tables) && tables.length) {
                tables.forEach((table) => {
                  suggestions.push(createSuggestionItem(table));
                });
              }
            }
            tables.forEach(({ content, fields }) => {
              if (
                tableName === content ||
                (tableAlias.get(tableName) || '').indexOf(content) >= 0
              ) {
                fields.forEach((item) => {
                  suggestions.push(createSuggestionItem(item));
                });
              }
            });
          });
        } else if (/([0-9a-zA-Z_]+)\(([0-9a-zA-Z_]{1})?$/iu.test(lineContent)) {
          // 进入表点字段模式
          console.info('进入表(提示字段模式');
          databases.forEach((database) => {
            const { tables } = database;
            suggestions.push(createSuggestionItem(database));
            if (Array.isArray(tables) && tables.length) {
              tables.forEach((table) => {
                suggestions.push(createSuggestionItem(table));
                const { fields } = table;
                fields.forEach((item) => {
                  suggestions.push(createSuggestionItem(item));
                });
              });
            }
          });
        } else {
          keywords.forEach((item) =>
            suggestions.push(createSuggestionItem(item)),
          );
        }
        return {
          suggestions: uniqWith(suggestions, isEqual),
        };
      },
      quickSuggestions: false,
      fixedOverflowWidgets: true,
      triggerCharacters: ['.', ' ', ',', '('],
    } as Editor.languages.CompletionItemProvider),
  );
};

const sqlEditorFactory = (
  editor: MonacoEditor.editor.IStandaloneCodeEditor,
  monaco: typeof MonacoEditor,
  hintData?: HintData,
) => {
  setHintData(monaco, hintData);
  monaco.languages.registerDocumentFormattingEditProvider('sql', {
    provideDocumentFormattingEdits(model) {
      return [
        {
          text: SqlFormatter.format(model.getValue()),
          range: model.getFullModelRange(),
        },
      ];
    },
  });
};

export const create = (
  container: HTMLElement,
  options?: CreateOption,
  hintData?: HintData,
) => {
  const { autoFormat, autoFocus, ...moreOption } = options || {};
  const editor = MonacoEditor.editor.create(container, {
    ...moreOption,
    language: 'sql',
  });
  sqlEditorFactory(editor, MonacoEditor, hintData);
  if (autoFocus) {
    editor.focus();
  }
  if (autoFormat && editor.getValue()) {
    raf(() => editor.getAction('editor.action.formatDocument')?.run());
  }
  return { editor, monaco: MonacoEditor };
};

const Component = forwardRef<EditorInstance, SqlEditorProps>((props, ref) => {
  const {
    defaultValue,
    value,
    hintData,
    onChange,
    monacoEditorOptions,
    theme,
    autoFormat,
    autoFocus,
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
      sqlEditorFactory(editor, monaco, hintData);
      if (autoFocus) {
        editor.focus();
      }
      if (autoFormat && editor.getValue()) {
        raf(formatHandler);
      }
    },
    [hintData, autoFormat, autoFocus, formatHandler],
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
    if (monacoRef.current) {
      setHintData(monacoRef.current, hintData);
    }
  }, [hintData]);
  useEffect(() => {
    window.addEventListener('resize', onResizeHandler);
    onResizeHandler();
    return () => window.removeEventListener('resize', onResizeHandler);
  }, [onResizeHandler]);
  return (
    <ReactMonacoEditor
      language="sql"
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
