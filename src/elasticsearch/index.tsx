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
  searchTokens,
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
    const formatterHandler = useCallback((value?: string) => {
      if (isString(value) && value.length) {
        try {
          if (editorRef.current) {
            const model = editorRef.current.getModel();
            const action = getAction(editorRef.current.getPosition());
            if (model && action) {
              const { startLineNumber, endLineNumber } = action.position;
              const formatted = formatQDSL(
                searchTokens,
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
              return model.getValue();
            }
          }
        } catch (error) {
          console.error(error);
        }
      }
      return value || '';
    }, []);
    const onDidMountHandler = useCallback<Required<EditorProps>['onDidMount']>(
      (editor, monaco) => {
        editorRef.current = editor;

        let executeDecorations: Array<Decoration | string> = [];
        let currentAction: SearchAction | undefined = void 0;
        // let autoIndentCmdId: string | null = null;
        // let copyCurlCmdId: string | null = null;

        const refreshActionMarks = (
          editor: MonacoEditor,
          searchTokens: SearchAction[],
        ) => {
          const freshDecorations = getActionMarksDecorations(searchTokens);
          // @See https://github.com/Microsoft/monaco-editor/issues/913#issuecomment-396537569
          executeDecorations = editor.deltaDecorations(
            executeDecorations as Array<string>,
            freshDecorations,
          ) as unknown as Decoration[];
        };

        disposableList.push(
          monaco.languages.registerCodeLensProvider('search', {
            onDidChange: (listener, thisArg) => {
              const model = editor.getModel();
              // refresh at first loading
              if (model) {
                buildSearchToken(model);
                refreshActionMarks(editor, searchTokens);
              }
              return editor.onDidChangeCursorPosition((acc) => {
                // only updates the searchTokens when content edited, past, redo, undo
                if ([0, 4, 6, 5].includes(acc.reason)) {
                  if (!model) {
                    return;
                  }

                  buildSearchToken(model);

                  refreshActionMarks(editor, searchTokens);
                }

                const newAction = getAction(acc.position);
                if (newAction && newAction !== currentAction) {
                  currentAction = newAction;
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
      [],
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
