# Stores 后端数据层

所有数据存储在 `server/stores/` 目录，直接操作文件系统。

## data.ts — 全局配置
- 读取 `.env` 和 `.env.local`（后者覆盖前者）
- 导出常量：`DATA_DIR`, `UsersFolder`, `PagesFolder`, `itemsFolder`, `filesFolder`, `dataFolder`
- `dataInit()` 确保数据目录存在，检测是否为空用户
- `isDev` 通过 `NODE_ENV` 判断
- `dataOptions.isEmptyUser` 供首次创建判断

## users.ts — 用户存储
- 文件：`user.jsonc`（JSON 格式）
- `cacheUserList` 缓存最近 1000 个用户（LRU：命中后移到末尾）
- **关键函数**：
  - `createUser(type)` → 创建用户目录 + user.jsonc
  - `getUser(pathID)` → 先查缓存，再读文件
  - `verifyUser(pathID, secondCode?)` → 验证用户密码
  - `verifyUserFromReq(req)` → 从请求头验证（`pathid` + `secondcode`）
  - `updateUser(pathID, obj)` → 不允许修改 pathID/type/secondCode
  - `editUserPathID(from, to, secondCode)` → 重命名目录 + 修改密码
  - `overCancelUser(pathID)` → 删除整个用户目录
  - `getUserList()` → 返回所有用户（隐藏 pathID，admin 排前）
  - `getUserData/updateUserData/deleteUserData/clearUserData` → data/ 目录 CRUD

## pages.ts — 页面存储
- 文件：`page.jsonc` 在 `data/pages/{uuid}/`
- 读写通过 `readPage(uuid)` / `writePage(page)` 内部函数
- **关键函数**：
  - `initPages()` — 从 `initPages.js` 初始化（用 `eval` 执行）
  - `getPage(uuid)` / `deletePage(uuid)` / `addPage(obj)` / `updatePage(uuid, obj)`
  - `addPageItemGroup(pageUUID, obj, insertIndex)` — 添加 itemGroup
  - `updatePageItemGroup(pageUUID, obj)` — 更新 itemGroup（不允许修改 list）
  - `deletePageItemGroup(pageUUID, itemGroupUUID)` — 删除 itemGroup 同时删除所有 item 数据
  - `updatePageItem(pageUUID, obj)` — 更新 item（按 uuid 查找）
  - `addPageItem(pageUUID, itemGroupUUID, obj, insertIndex)` — 添加 item 到分组
  - `deletePageItem(pageUUID, itemUUID)` — 删除 item 同时删除数据目录
  - `getPageData/updatePageData/deletePageData/clearPageData` — data/ 目录 CRUD

## items.ts — 项目数据存储
- item 数据目录命名：`{type}-{uuid}`（例如 `bookmark-abc123`）
- **关键函数**：
  - `initItem(item)` — 创建 item 目录 + 生成 uuid
  - `initItems(groupList)` — 批量初始化 itemGroup
  - `getItemPath(type, uuid)` — 返回目录路径
  - `getItemData/updateItemData/deleteItemData/clearItemData` — data/ 目录 CRUD
- 所有操作前先检查 `ItemRouterList[itemType]` 是否有效

## 通用模式
- 函数返回 `[result, error]` 元组模式
- 路径安全检查：所有文件操作前调用 `UrlsUtils.checkSinglePath()`
- data/ 存放实时数据（不做缓存），files/ 存放静态文件（一年缓存）
- clear 操作先 `rmSync` 再 `mkdirSync` 重置目录
