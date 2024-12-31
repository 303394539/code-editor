import * as monaco from 'monaco-editor';

// import { monacoEnvironment } from './environment';
import { searchCompletionProvider } from './completion';
import { executeActions, search } from './lexerRules';

// self.MonacoEnvironment = monacoEnvironment;

monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
monaco.languages.register({ id: search.id });
monaco.languages.setMonarchTokensProvider(
  search.id,
  search.rules as monaco.languages.IMonarchLanguage,
);
monaco.languages.setLanguageConfiguration(
  search.id,
  search.languageConfiguration as monaco.languages.LanguageConfiguration,
);
monaco.languages.registerCompletionItemProvider(search.id, {
  triggerCharacters: ['g', 'p', 'd', '"', "'", ' '],
  // @ts-ignore
  provideCompletionItems: searchCompletionProvider,
  // resolveCompletionItem: searchResolveCompletionItem,
});

export * from './type';
export { executeActions, monaco };
export * from './referDoc';
export * from './tokenlizer';
