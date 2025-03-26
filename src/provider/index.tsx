import type { PropsWithChildren } from 'react';
import { createContext } from 'react';

import type { EditorProps } from '../editor';

export type ProviderValue = Pick<
  EditorProps,
  | 'monacoEditorOptions'
  | 'theme'
  | 'onWillMount'
  | 'onDidMount'
  | 'onWillUnmount'
>;

export type ProviderProps = PropsWithChildren<ProviderValue>;

export const context = createContext<ProviderValue>({});

const { Provider } = context;

const Component = ({ children, ...moreProps }: ProviderProps) => {
  return <Provider value={moreProps}>{children}</Provider>;
};

Component.displayName = 'EditorProvider';

Component.context = context;

export default Component;
