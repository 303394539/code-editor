import { isString } from 'lodash';

import { forwardRef, useCallback, useEffect, useRef } from 'react';

import type { IDisposable } from 'monaco-editor';

import type { EditorInstance, EditorProps } from '../editor';
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

export type ElasticSearchEditorProps = Omit<
  EditorProps,
  'language' | 'defaultKeywords'
>;

let disposableList: IDisposable[] = [];

const clearDisposableList = () => {
  disposableList.forEach((disposable) => {
    disposable.dispose();
  });
  disposableList = [];
};

const Component = forwardRef<EditorInstance, ElasticSearchEditorProps>(
  (props, ref) => {
    const editorRef = useRef<EditorInstance['editor']>();

    const searchTokensRef = useRef<SearchAction[]>([]);
    const executeDecorationsRef = useRef<(Decoration | string)[]>([]);
    const currentActionRef = useRef<SearchAction>();

    const refreshActionMarksHandler = useCallback((editor?: MonacoEditor) => {
      const freshDecorations = getActionMarksDecorations(
        searchTokensRef.current,
      );
      // @See https://github.com/Microsoft/monaco-editor/issues/913#issuecomment-396537569
      executeDecorationsRef.current = editor?.deltaDecorations(
        executeDecorationsRef.current as Array<string>,
        freshDecorations,
      ) as unknown as Decoration[];
    }, []);

    const formatterHandler = useCallback(
      (value?: string) => {
        if (isString(value) && value.length) {
          try {
            if (editorRef.current) {
              const editor = editorRef.current;
              const model = editor.getModel();
              if (model) {
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
          } catch (error) {
            console.error(error);
          }
        }
        return value || '';
      },
      [refreshActionMarksHandler],
    );
    const onDidMountHandler = useCallback<Required<EditorProps>['onDidMount']>(
      (editor, monaco) => {
        editorRef.current = editor;

        disposableList.push(
          monaco.languages.registerCodeLensProvider('search', {
            onDidChange: (listener, thisArg) => {
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
      [refreshActionMarksHandler],
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
        language="search"
        onDidMount={onDidMountHandler}
      />
    );
  },
);

export default Component;
