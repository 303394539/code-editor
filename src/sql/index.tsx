import { isEqual, isString, uniqWith } from 'lodash';

import { forwardRef, useCallback, useEffect, useMemo, useRef } from 'react';

import {
  FlinkSQL,
  HiveSQL,
  ImpalaSQL,
  MySQL,
  PostgreSQL,
  SparkSQL,
  TrinoSQL,
} from 'dt-sql-parser';
import type { IDisposable } from 'monaco-editor';
import MonacoEditor from 'monaco-editor';
import { languages, Range } from 'monaco-editor/esm/vs/editor/editor.api';
import type { SqlLanguage } from 'sql-formatter';
import { format } from 'sql-formatter';

import type { EditorInstance, EditorProps, HintDataItem } from '../editor';
import Editor, { Kind } from '../editor';
import {
  FlinkSQL as FlinkSQLKeywords,
  MySQL as MySQLKeywords,
} from './keywords';

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

export type SQLEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
> & {
  /**
   * @description sql类型
   * @default MySQL
   */
  type?:
    | 'FlinkSQL'
    | 'HiveSQL'
    | 'ImpalaSQL'
    | 'MySQL'
    | 'PostgreSQL'
    | 'SparkSQL'
    | 'TrinoSQL';
};

const typeMap = {
  FlinkSQL,
  HiveSQL,
  ImpalaSQL,
  MySQL,
  PostgreSQL,
  SparkSQL,
  TrinoSQL,
};

const formatLanguageMap: Record<keyof typeof typeMap, SqlLanguage> = {
  FlinkSQL: 'sql',
  HiveSQL: 'hive',
  ImpalaSQL: 'sql',
  MySQL: 'mysql',
  PostgreSQL: 'postgresql',
  SparkSQL: 'spark',
  TrinoSQL: 'trino',
};

const languageMap: Record<keyof typeof typeMap, 'sql' | 'mysql' | 'pgsql'> = {
  FlinkSQL: 'sql',
  HiveSQL: 'sql',
  ImpalaSQL: 'sql',
  MySQL: 'mysql',
  PostgreSQL: 'pgsql',
  SparkSQL: 'sql',
  TrinoSQL: 'sql',
};
const defaultHintDataMap: Record<keyof typeof typeMap, HintData> = {
  FlinkSQL: {
    databases: [],
    keywords: FlinkSQLKeywords.map((content) => ({
      content,
      kind: Kind.Keyword,
    })),
  },
  HiveSQL: { databases: [], keywords: [] },
  ImpalaSQL: { databases: [], keywords: [] },
  MySQL: {
    databases: [],
    keywords: MySQLKeywords.map((content) => ({
      content,
      kind: Kind.Keyword,
    })),
  },
  PostgreSQL: { databases: [], keywords: [] },
  SparkSQL: { databases: [], keywords: [] },
  TrinoSQL: { databases: [], keywords: [] },
};

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

const Component = forwardRef<EditorInstance, SQLEditorProps>(
  ({ type = 'MySQL', ...props }, ref) => {
    const parserRef = useRef(new typeMap[type]());

    const languageMemo = useMemo(() => languageMap[type], [type]);

    const formatterHandler = useCallback(
      (value?: string) =>
        format(value || '', {
          language: formatLanguageMap[type],
          tabWidth: 2,
        }),
      [type],
    );

    const onHintDataHandler = useCallback(
      (monaco: typeof MonacoEditor, hintData?: HintData) => {
        clearDisposableList();
        disposableList.push(
          monaco.languages.registerCompletionItemProvider(languageMemo, {
            provideCompletionItems(model, position) {
              const {
                keywords: defaultKeywords = [],
                databases: defaultDatabases = [],
              } = defaultHintDataMap[type] || {};
              const {
                keywords: newKeywords = [],
                databases: newDatabase = [],
              } = hintData || {};
              const keywords = uniqWith(
                defaultKeywords.concat(newKeywords),
                (a, b) => isEqual(a.content, b.content),
              );
              const databases = defaultDatabases.concat(newDatabase);
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
              for (
                ;
                rightLineNumber < model.getLineCount();
                rightLineNumber++
              ) {
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

              const entities =
                parserRef.current.getAllEntities(
                  model.getValueInRange(currentSql),
                ) || [];
              const tableAlias = new Map<string, string[]>();
              entities.forEach(
                ({ entityContextType, isAlias, text, alias }) => {
                  if ('table' === entityContextType && isAlias) {
                    const { text: aliasText } = isString(alias)
                      ? { text: alias }
                      : alias || {};
                    if (aliasText) {
                      const arr = tableAlias.get(aliasText);
                      if (Array.isArray(arr)) {
                        if (arr.indexOf(text) < 0) {
                          tableAlias.set(aliasText, arr.concat(text));
                        }
                      } else {
                        tableAlias.set(aliasText, [text]);
                      }
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
                  /(alter|drop|create)\s+([0-9a-zA-Z_]{1})?$/iu.test(
                    lineContent,
                  )
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
            triggerCharacters: ['.', ' ', '('],
          } as languages.CompletionItemProvider),
        );
      },
      [languageMemo, type],
    );
    useEffect(() => {
      return () => {
        clearDisposableList();
      };
    }, []);
    return (
      <Editor
        formatter={formatterHandler}
        {...props}
        ref={ref}
        language={languageMemo}
        onHintData={onHintDataHandler}
      />
    );
  },
);

export default Component;
