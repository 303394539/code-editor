# @baic/code-editor

#### 基于 monaco-editor 的代码编辑器

## 安装

```shell
pnpm add @baic/code-editor
```

#### 需要 monaco-editor-webpack-plugin 插件配合

```js
// 以 umi 为例
import MonacoEditorWebpackPlugin from 'monaco-editor-webpack-plugin';
export default {
  chainWebpack: (memo) => {
    memo
      .plugin('monaco-editor-webpack-plugin')
      .use(new MonacoEditorWebpackPlugin(), [['sql']]); // 其他语言增加其他的
  },
};
```

## SQL 编辑器

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

## JSON 编辑器

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
