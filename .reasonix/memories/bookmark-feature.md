## 书签工具前端完成状态

### 文件结构
- `src/items/BookmarkItem/index.vue` — Tab（收藏夹）管理
- `src/items/BookmarkItem/components/SingleBookmarkItem.vue` — 书签列表（文件浏览器风格）
- `src/items/BookmarkItem/components/bookmarkUtils.ts` — 工具函数（HTML 解析/导出/树操作/图标上传）
- `public/items/BookmarkItem/addMark.js` — Tampermonkey 油猴脚本（右键添加书签）

### 数据存储
- `bookmarkList.json` — 收藏夹列表（Tab），`BookmarkType[]`
- `collection-{uuid}.json` — 每个收藏夹的书签树，`BookmarkCollectionType[]`
- 图标存到 `data/users/{pathID}/files/favcon_xxx.png`

### 已实现功能
- **Tab 页签管理**：右键菜单（⬆️置前/✏️重命名/🗑️删除），+ 按钮新增（push 到末尾）
- **书签内容缓存**：`v-show` 保持所有页签组件挂载，切换不刷新
- **文件浏览器导航**：面包屑路径（长路径省略号截断）+ 右侧返回按钮，搜索时隐藏路径全局搜索
- **书签 CRUD**：添加/编辑/删除（含文件夹），添加时可检测标题+自动获取图标（服务器存储）
- **导入**：解析 Chrome/Firefox HTML，base64 图标自动上传服务器
- **导出**：当前目录导出为标准 Netscape HTML，服务器图标转 base64
- **PC 端**两行三列操作按钮（编辑/删除/新标签/跳转/复制/二维码）
- **移动端**长按弹出菜单，顶部工具栏一行横向滚动无分隔符
- 仅书签列表区域滚动，隐藏滚动条
- 暗色模式图标浅色底

### 油猴脚本 addMark.js
- `@run-at context-menu`，右键 → Tampermonkey → 打开对话框
- 布局：URL重复提示(顶) → 网页信息 → 目标文件夹 → 服务器连接(底)
- 导入 JSON 自动配置，bookmarkUUID 变化时清空文件夹路径
- 单击文件夹进入，⬆上层返回，路径持久化到 GM 存储
- 自动获取页面标题/图标(base64)，图标 multipart 上传服务器
- 检测 URL 是否已存在，红色提示所在文件夹路径
- `GM_xmlhttpRequest` 绕过 CORS

### 后端接口（未改动）
仅用 `itemApi` 的 `getItemData` / `updateItemData` / `deleteItemData`
