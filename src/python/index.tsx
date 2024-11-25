import { isEqual, uniqWith } from 'lodash';

import { forwardRef, useCallback, useEffect } from 'react';

import type { IDisposable } from 'monaco-editor';
import MonacoEditor from 'monaco-editor';
import { languages } from 'monaco-editor/esm/vs/editor/editor.api';

import type { EditorInstance, EditorProps, HintDataItem } from '../editor';
import Base, { Kind } from '../editor';
import defaultKeywords from './keywords';

export type HintData = {
  keywords: HintDataItem[];
};

export type PythonEditorProps = Omit<EditorProps, 'language'>;

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

const language = 'python';

const Component = forwardRef<EditorInstance, PythonEditorProps>(
  (props, ref) => {
    const onHintDataHandler = useCallback(
      (monaco: typeof MonacoEditor, hintData?: HintData) => {
        clearDisposableList();
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
      },
      [],
    );
    useEffect(() => {
      return () => {
        clearDisposableList();
      };
    }, []);
    return (
      <Base
        {...props}
        ref={ref}
        language={language}
        onHintData={onHintDataHandler}
      />
    );
  },
);

export default Component;
