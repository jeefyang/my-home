# 备忘录元件

## 文件
- `src/items/MemoItem/index.vue` — 主元件
- 注册在 `common/utils/itemRouterouterList.ts`，type: `"memo"`

## 数据存储
- `data/items/memo-{uuid}/data/memoList.json` — `MemoType[]`

```typescript
type MemoType = {
    uuid: string;
    content: string;
    createTime: number;
    modifyTime: number;
};
```

## 功能
- 对话历史（从上到下，最新在最下）
- 自动回滚到最底部
- 每条记录：复制/编辑/删除（编辑不改变排序）
- textarea 输入框，Enter 发送，Ctrl+Enter 换行
- 工具栏（刷新）
- `overflow: hidden` 防溢出，历史区 flex 自适应
- 顶部显示标题（取自 `props.item?.options?.title`，默认"备忘录"）
