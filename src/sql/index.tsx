import { isEqual, uniqWith } from 'lodash';

import { forwardRef, useCallback, useRef } from 'react';

// @ts-ignore
import { parser } from 'dt-sql-parser';
import type { IDisposable } from 'monaco-editor';
import MonacoEditor from 'monaco-editor';
import { languages, Range } from 'monaco-editor/esm/vs/editor/editor.api';
import { format } from 'sql-formatter';

import type {
  EditorInstance,
  EditorProps,
  HintData,
  HintDataItem,
} from '../editor';
import Base from '../editor';

export type SQLEditorProps = Omit<EditorProps, 'language'>;

const createSuggestionItem = ({ label, content, kind }: HintDataItem) =>
  ({
    label: label || content,
    insertText: content,
    kind,
  } as any);

const Component = forwardRef<EditorInstance, SQLEditorProps>((props, ref) => {
  const hintDisposablesRef = useRef<IDisposable[]>([]);

  const formatterHandler = useCallback(
    (value?: string) => format(value || ''),
    [],
  );

  const onHintDataHandler = useCallback(
    (monaco: typeof MonacoEditor, hintData?: HintData) => {
      hintDisposablesRef.current.forEach((disposable) => {
        disposable.dispose();
      });
      hintDisposablesRef.current = [];
      hintDisposablesRef.current.push(
        monaco.languages.registerCompletionItemProvider('sql', {
          provideCompletionItems(model, position) {
            const { keywords = [], databases = [] } = hintData || {};
            const lineContent = model.getValueInRange(
              new Range(
                position.lineNumber,
                0,
                position.lineNumber,
                position.column,
              ),
            );
            const suggestions: languages.CompletionItem[] = [];
            let leftLineNumber = position.lineNumber;
            let leftColumn = position.column - 1;
            for (; leftLineNumber >= 1; leftLineNumber--) {
              if (leftLineNumber === position.lineNumber) {
                for (; leftColumn > 0; leftColumn--) {
                  const str = model.getValueInRange(
                    new Range(
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
                    new Range(
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
                    new Range(
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
                    new Range(
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
            const currentSql = new Range(
              leftLineNumber + 1,
              leftColumn,
              rightLineNumber,
              rightColumn,
            );
            const { locations } =
              parser.parserSql(model.getValueInRange(currentSql), '', false) ||
              {};
            const tableAlias = new Map<string, string[]>();
            locations.forEach(
              ({ source, type, identifierChain, alias }: any) => {
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
              },
            );
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
            } else if (
              /([0-9a-zA-Z_]+)\.([0-9a-zA-Z_]{1})?$/iu.test(lineContent)
            ) {
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
            } else if (
              /([0-9a-zA-Z_]+)\(([0-9a-zA-Z_]{1})?$/iu.test(lineContent)
            ) {
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
        } as languages.CompletionItemProvider),
      );
    },
    [],
  );
  return (
    <Base
      formatter={formatterHandler}
      {...props}
      ref={ref}
      language="sql"
      onHintData={onHintDataHandler}
    />
  );
});

export default Component;
