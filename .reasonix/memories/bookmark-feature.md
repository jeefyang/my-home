## 书签工具前端完成状态

### 文件结构
- `src/items/BookmarkItem/index.vue` — Tab（收藏夹）管理
- `src/items/BookmarkItem/components/SingleBookmarkItem.vue` — 书签列表（文件浏览器风格）
- `src/items/BookmarkItem/components/bookmarkUtils.ts` — 工具函数
- `public/items/BookmarkItem/addMark.js` — Tampermonkey 油猴脚本
- `src/directives/touch.ts` — 移动端长按指令

### 拖拽与移动端兼容
`draggable="true"` 会拦截移动端触摸事件，导致长按菜单失效。
**修复**：`:draggable="!dataStore.isMobile"`

### 数据存储
- `bookmarkList.json` — 收藏夹列表（Tab），`BookmarkType[]`
- `collection-{uuid}.json` — 每个收藏夹的书签树，`BookmarkCollectionType[]`
- 图标存到 `data/users/{pathID}/files/favcon_xxx.png`

### 已实现功能
- **Tab 页签管理**：右键菜单（置前/重命名/删除），+ 按钮新增（push 到末尾）
- **书签内容缓存**：`v-show` 保持所有页签组件挂载
- **文件浏览器导航**：面包屑路径 + 右侧返回按钮，搜索时隐藏路径
- **书签 CRUD**：添加/编辑/删除（含文件夹），检测标题+自动获取图标（服务器存储）
- **文件夹展开**：右键菜单/PC悬停按钮 → 删除文件夹自身，子项平铺
- **拖拽移动**（PC 端）：拖到书签=排序，拖到文件夹图标=移入，拖到面包屑=移入
- **导入**：解析 Chrome/Firefox HTML，进度条+实时状态
- **导出**：当前目录导出为标准 Netscape HTML，带进度条
- **右键菜单**：可点击路径跳转，清空搜索框，关闭弹窗
- **编辑弹窗**：显示书签所在文件夹路径
- **移动端长按**：`vTouch` 指令
- 仅书签列表区域滚动，隐藏滚动条，暗色模式图标浅色底
- 悬停操作按钮 `visibility: hidden` 替代 `display: none`，防止布局偏移

### 后端接口（未改动）
仅用 `itemApi` 的 `getItemData` / `updateItemData` / `deleteItemData`
