import { isString } from 'lodash';

import type { ReactElement, Ref } from 'react';
import { forwardRef, useCallback, useEffect, useRef } from 'react';

import type { IDisposable } from 'monaco-editor';

import type {
  EditorInstance,
  EditorProps,
  EditorStaticInterface,
  Mode,
  ModeMap,
  MonacoType,
} from '../editor';
import Editor from '../editor';
import type {
  Decoration,
  Editor as MonacoEditor,
  SearchAction,
} from './monaco';
import {
  // buildCodeLens,
  buildSearchToken,
  formatQDSL,
  getAction,
  getActionMarksDecorations,
} from './monaco';

export type ElasticSearchEditorProps<T extends Mode = 'normal'> = Omit<
  EditorProps<T>,
  'language' | 'defaultKeywords'
>;

export type InternalElasticSearchEditorType = <T extends Mode = 'normal'>(
  props: ElasticSearchEditorProps<T> & {
    ref?: Ref<EditorInstance<T>>;
  },
) => ReactElement;

export type ElasticSearchEditorInterface = InternalElasticSearchEditorType &
  EditorStaticInterface;

let disposableList: IDisposable[] = [];

const clearDisposableList = () => {
  disposableList.forEach((disposable) => {
    disposable.dispose();
  });
  disposableList = [];
};

function InternalComponent<T extends Mode = 'normal'>(
  { mode, ...props }: ElasticSearchEditorProps<T>,
  ref?: Ref<EditorInstance<T>>,
) {
  const editorRef = useRef<ModeMap[T]['editor']>();

  const searchTokensRef = useRef<SearchAction[]>([]);
  const executeDecorationsRef = useRef<(Decoration | string)[]>([]);
  const currentActionRef = useRef<SearchAction>();

  const refreshActionMarksHandler = useCallback((editor?: MonacoEditor) => {
    const freshDecorations = getActionMarksDecorations(searchTokensRef.current);
    // @See https://github.com/Microsoft/monaco-editor/issues/913#issuecomment-396537569
    executeDecorationsRef.current = editor?.deltaDecorations(
      executeDecorationsRef.current as Array<string>,
      freshDecorations,
    ) as unknown as Decoration[];
  }, []);

  const cleanHandler = useCallback((v?: string) => {
    return (
      v
        /**
         * 修复method之后的换行
         */
        ?.replace(/\s+(\n|\r)+\s+\//gu, (e) =>
          e.replace(/[\s\n\r]+/u, `${decodeURIComponent('%20')}`),
        )
        /**
         * 修复结尾{为换行
         */
        ?.replace(/([a-zA-Z0-9/]{1})(\s+)?\{/gu, (e) =>
          e.replace(/(\s+)?\{/u, `${decodeURIComponent('%0A')}{`),
        )
        /**
         * 修复}接method后为换行
         */
        .replace(/\}{1}(GET|DELETE|POST|PUT)/giu, (e) =>
          e.replace(
            /\}/,
            `}${decodeURIComponent('%0A')}${decodeURIComponent('%0A')}`,
          ),
        ) || ''
    );
  }, []);

  const formatterHandler = useCallback(
    (value?: string) => {
      if (isString(value) && value.length) {
        try {
          if (editorRef.current) {
            if (mode === 'normal') {
            } else {
              const editor = editorRef.current as ModeMap['normal']['editor'];
              const model = editor.getModel();
              if (model) {
                model.setValue(cleanHandler(value));
                searchTokensRef.current = buildSearchToken(model);
                refreshActionMarksHandler(editor);
                let i = 0;
                const callback = () => {
                  if (i < searchTokensRef.current.length) {
                    const action = searchTokensRef.current[i];
                    const { startLineNumber, endLineNumber } = action.position;
                    const formatted = formatQDSL(
                      searchTokensRef.current,
                      model,
                      action.position,
                    );
                    model.pushEditOperations(
                      [],
                      [
                        {
                          range: {
                            startLineNumber: startLineNumber + 1,
                            startColumn: 1,
                            endLineNumber,
                            endColumn: model.getLineLength(endLineNumber) + 1,
                          },
                          text: formatted,
                        },
                      ],
                      // @ts-ignore
                      () => [],
                    );
                    searchTokensRef.current = buildSearchToken(model);
                    refreshActionMarksHandler(editor);
                    i++;
                    callback();
                  }
                };
                if (searchTokensRef.current.length) {
                  callback();
                }
                return model.getValue();
              }
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
      return value || '';
    },
    [cleanHandler, mode, refreshActionMarksHandler],
  );

  const onDidMountHandler = useCallback(
    (e: ModeMap[T]['editor'], monaco: MonacoType) => {
      editorRef.current = e;

      disposableList.push(
        monaco.languages.registerCodeLensProvider('search', {
          onDidChange: (listener, thisArg) => {
            if (mode === 'diff') {
            }
            const editor = e as ModeMap['normal']['editor'];
            const model = editor.getModel();
            // refresh at first loading
            if (model) {
              searchTokensRef.current = buildSearchToken(model);
              refreshActionMarksHandler(editor);
            }
            return editor.onDidChangeCursorPosition((acc) => {
              // only updates the searchTokens when content edited, past, redo, undo
              if ([0, 4, 6, 5].includes(acc.reason)) {
                if (!model) {
                  return;
                }

                searchTokensRef.current = buildSearchToken(model);

                refreshActionMarksHandler(editor);
              }

              const newAction = getAction(acc.position);
              if (newAction && newAction !== currentActionRef.current) {
                currentActionRef.current = newAction;
                return listener(thisArg);
              }
            });
          },
          provideCodeLenses: () => {
            // const position = editor.getPosition();
            // const lenses = position
            //   ? buildCodeLens(position, autoIndentCmdId!, copyCurlCmdId!)
            //   : [];

            return {
              lenses: [],
              dispose: () => {},
            };
          },
        }),
      );
    },
    [mode, refreshActionMarksHandler],
  );
  useEffect(() => {
    return () => {
      clearDisposableList();
    };
  }, []);
  return (
    <Editor
      formatter={formatterHandler}
      {...(props as ElasticSearchEditorProps)}
      mode={mode as T}
      ref={ref}
      language="search"
      onDidMount={onDidMountHandler}
    />
  );
}

const Component = forwardRef(
  InternalComponent,
) as InternalElasticSearchEditorType as ElasticSearchEditorInterface;

export default Component;
