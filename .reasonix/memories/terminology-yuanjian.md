## 术语约定

为了避免与 Vue 3 的「组件」(`.vue` 文件)混淆，项目中**业务功能模块**统一称为**元件**：

- 搜索元件（原 WWWItem）
- 书签元件（原 BookmarkItem）
- 图片元件
- 等等

Vue 3 的 `.vue` 文件仍然叫**组件**。

### 文件路径示例
```
src/items/BookmarkItem/       # 书签元件
src/items/WWWItem/            # 搜索元件
src/items/ExampleItem/        # 示例元件
```

### 代码中的引用
```typescript
// ItemRouterList 注册的是元件
export const ItemRouterList = {
    "bookmark": { type: "bookmark", title: "收藏夹", component: "BookmarkItem", desc: "书签元件" },
    "www": { type: "www", title: "搜索", component: "WWWItem", desc: "搜索元件" }
};
```
