# @baic/code-editor

## 基于 monaco-editor 的代码编辑器

### 安装

```shell
pnpm add @baic/code-editor
```

### 需要 webpack 插件配合

```ts
// 以 umi 为例
import { CodeEditorWebpackPlugin } from '@baic/code-editor';
export default {
  chainWebpack: (memo) => {
    memo
      .plugin('code-editor-webpack-plugin')
      .use(new CodeEditorWebpackPlugin());
  },
};
```

### 配置上下文

```tsx
// 以 umi 为例
import type { ReactNode } from 'react';
/**
 * 因为编辑器比较重，上下文的引用最好直接引用原地址，index的export引用会造成内存过大
 */
import Provider as CodeEditorProvider from '@baic/code-editor/es/provider';

export const rootContainer = (container: ReactNode) => {
  return <CodeEditorProvider monacoEditorOptions={{}}>
    {container}
  <CodeEditorProvider>
}
```

### 基本使用

```tsx
import { JSONEditor } from '@baic/code-editor';
export default () => (
  <div
    style={{
      height: 500,
    }}
  >
    <JSONEditor />
  </div>
);
```

### 新增提示词

```tsx
import { Kind, SQLEditor } from '@baic/code-editor';
const hintData = {
  databases: [
    {
      content: 'bigdata',
      kind: Kind.Struct,
      tables: [
        {
          content: 'auth',
          fields: [
            {
              content: 'id',
              kind: Kind.Field,
            },
          ],
          kind: Kind.Folder,
        },
        {
          content: 'role',
          fields: [
            {
              content: 'id',
              kind: Kind.Field,
            },
          ],
          kind: Kind.Folder,
        },
      ],
    },
  ],
  keywords: [
    {
      content: 'SELECT',
      kind: Kind.Keyword,
    },
    {
      content: 'INSERT',
      kind: Kind.Keyword,
    },
    {
      content: 'UPDATE',
      kind: Kind.Keyword,
    },
  ],
};
export default () => (
  <div
    style={{
      height: 500,
    }}
  >
    <SQLEditor hintData={hintData} />
  </div>
);
```

### Diff 使用

```tsx
import { JSONEditor } from '@baic/code-editor';
export default () => (
  <div
    style={{
      height: 500,
    }}
  >
    <JSONEditor mode="diff" value="{}" original="{}" />
  </div>
);
```

### 提前加载字体

```tsx
/**
 * 预加载字体
 */
import { preloadFonts } from '@baic/code-editor/es/provider';

preloadFonts();
```
