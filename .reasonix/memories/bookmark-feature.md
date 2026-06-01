## 书签工具前端完成状态

### 文件结构
- `src/items/BookmarkItem/index.vue` — Tab（收藏夹）管理
- `src/items/BookmarkItem/components/SingleBookmarkItem.vue` — 书签列表（文件浏览器风格）
- `src/items/BookmarkItem/components/bookmarkUtils.ts` — 工具函数（HTML 解析/导出/树操作/图标上传）
- `public/items/BookmarkItem/addMark.js` — Tampermonkey 油猴脚本（右键添加书签）

### 数据存储
- `bookmarkList.json` — 收藏夹列表（Tab），`BookmarkType[]`
- `collection-{uuid}.json` — 每个收藏夹的书签树，`BookmarkCollectionType[]`
- 图标存到 `data/users/{pathID}/files/favcon_xxx.png`，通过 `/api/files/users/{pathID}/{filename}` 读取

### 已实现功能
- **Tab 页签管理**：右键菜单（⬆️置前/✏️重命名/🗑️删除），+ 添加按钮
- **文件浏览器导航**：面包屑路径，搜索时隐藏路径全局搜索
- **书签 CRUD**：添加/编辑/删除（含文件夹），添加时可检测标题+自动获取图标
- **导入**：解析 Chrome/Firefox HTML，base64 图标自动上传服务器
- **导出**：当前目录导出为标准 Netscape HTML，服务器图标自动转 base64 嵌入
- **PC 端悬停操作按钮**：两行三列（编辑/删除/新标签/跳转/复制/二维码）
- **移动端长按弹出菜单**：新标签打开/当前页面跳转/复制链接/转二维码/编辑/删除
- **仅书签列表区域滚动**，其他固定，隐藏滚动条
- **图标浅色底**确保暗色模式可见
- **工具栏**（一行横向滚动无分隔符）：刷新/+书签/+文件夹/导入/导出/复制脚本/导出连接信息
- **油猴脚本** `addMark.js`：右键菜单添加书签，可配置服务器连接，文件夹路径选择，自动获取标题/图标 base64，图标上传服务器

### 后端接口（未改动）
仅用 `itemApi` 的 `getItemData` / `updateItemData` / `deleteItemData`
