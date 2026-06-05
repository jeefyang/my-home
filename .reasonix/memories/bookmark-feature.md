# 书签元件（BookmarkItem）

## 文件结构
- `src/items/BookmarkItem/index.vue` — Tab（收藏夹）管理 + CRUD
- `src/items/BookmarkItem/components/SingleBookmarkItem.vue` — 书签列表（文件浏览器风格，约45KB）
- `src/items/BookmarkItem/components/bookmarkUtils.ts` — 工具函数
- `public/items/BookmarkItem/addMark.js` — Tampermonkey 油猴脚本
- `src/directives/touch.ts` — 移动端长按指令

## 数据存储
- `data/items/bookmark-{uuid}/data/bookmarkList.json` — 收藏夹列表（Tab），`BookmarkType[]`
  ```ts
  type BookmarkType = { uuid, title, sortid, isDefault?, creatTime, modifyTime }
  ```
- `data/items/bookmark-{uuid}/data/collection-{uuid}.json` — 每个收藏夹的书签树，`BookmarkCollectionType[]`
- 图标存到 `data/items/{type}-{uuid}/files/favcon_xxx.png`（由用户目录迁移至元件目录）

## 已实现功能
### Tab 管理
- 右键菜单：置前、重命名、删除
- `+` 按钮新增收藏夹（push 到末尾）
- 重命名/删除弹窗确认
- 切换标签保持组件挂载（`v-show`），不刷新

### 书签 CRUD
- 添加/编辑/删除书签（含文件夹）
- 自动检测网页标题 + 自动获取图标（多平台轮询：favicon.im → Google → DuckDuckGo → direct）
- 粘贴/输入 URL 后 800ms 防抖自动检测标题和图标
- `normalizeUrl()` 自动补全协议头（`www.baidu.com` → `https://www.baidu.com`）
- 后端检测 Cloudflare 挑战页并返回清晰提示
- 详细的错误分类提示（DNS失败/超时/403/404等）

### 文件夹操作
- 右键菜单删除文件夹自身，子项平铺到父级
- PC 悬停显示操作按钮（`visibility: hidden` 避免布局偏移）

### 拖拽移动（PC 端）
- 拖到同级书签 = 排序
- 拖到文件夹图标 = 移入文件夹
- 拖到面包屑目录 = 移入目标目录

### 导入/导出
- 解析 Chrome/Firefox HTML 格式
- 导出为标准 Netscape HTML
- 带进度条和实时状态

### 其他
- 移动端长按支持（`vTouch` 指令）
- 仅书签列表区域滚动，隐藏滚动条
- 暗色模式图标自动浅色底
- `:draggable="!dataStore.isMobile"` 解决拖拽与触摸事件冲突

## 拖拽与移动端兼容
`draggable="true"` 会拦截移动端触摸事件，导致长按菜单失效。
**修复**：`:draggable="!dataStore.isMobile"`

## 后端接口
仅用 `itemApi` 的 `getItemData` / `updateItemData` / `deleteItemData`

## 图标获取（bookmarkUtils.ts）
```ts
fetchFaviconToServer(url) 依次尝试：
1. Google: https://www.google.com/s2/favicons?domain={hostname}
2. DuckDuckGo: https://icons.duckduckgo.com/ip3/{hostname}.ico
3. favicon.im: https://favicon.im/{hostname}
```
