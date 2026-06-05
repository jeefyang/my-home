# 术语约定：元件 vs 组件

为了避免与 Vue 3 的「组件」（`.vue` 文件）混淆，项目中**业务功能模块**统一称为**元件**（item）。

## 对照表
| 术语 | 英文 | 含义 |
|------|------|------|
| 元件 | item | 业务功能模块，如书签、搜索、备忘录 |
| 组件 | component | Vue `.vue` 文件 |
| 分组 | itemGroup | 元件的容器，决定展示形式 |
| 页面 | page | 底部 tab 切换的导航页面 |

## 文件路径示例
```
src/items/BookmarkItem/       # 书签元件
src/items/WWWItem/            # 搜索元件
src/items/MemoItem/           # 备忘录元件
src/items/ExampleItem/        # 示例元件
```

## 代码中的引用
```typescript
// ItemRouterList 注册的是元件
export const ItemRouterList = {
    "bookmark": { type: "bookmark", title: "收藏夹", component: "BookmarkItem", desc: "书签" },
    "www": { type: "www", title: "www", component: "WWWItem", desc: "自定义搜索" },
    "memo": { type: "memo", title: "备忘录", component: "MemoItem", desc: "记事" }
};
```
