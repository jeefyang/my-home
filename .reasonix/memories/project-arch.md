# 项目架构

## 概述
自定义个人导航面板，Express.js + Vue 3 全栈应用。前后端共享同一端口（开发3000），文件系统存储（无数据库）。

## 包管理器 / 命令
- **pnpm** 管理依赖
- `pnpm dev`（开发，前后端一体，端口3000）
- `pnpm build`（生产构建 server + client）
- `pnpm start`（PM2 启动生产）

## 版本
当前代码版本 0.5.3，基于：
- Vue 3.5 + TypeScript 6.0
- Express 5.x + Vite 8.x
- Naive UI 2.44 + Pinia 3.x
- UnoCSS + unplugin-auto-import + unplugin-vue-components

## 双 Vite 配置
- `vite.config.server.ts` — Express 后端，`vite-plugin-node` 编译到 `dist/server/`
- `vite.config.ts` — Vue 前端，输出到 `dist/client/`

## 开发模式架构
`server/index.ts` 创建 Express app 和原生 HTTP Server，Vite 以 middleware 模式挂载，前后端同端口 HMR。
关键代码：
```ts
const httpServer = http.createServer(app);
const vite = await createServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    configFile: path.resolve('./vite.config.ts')
});
app.use(vite.middlewares);
```

## 类型系统
所有全局类型定义在 `types/index.d.ts`：
- `UserType` — pathID 认证，含 `secondCode`、`pageUUIDList`
- `PageType` — 导航页面，含 `itemGroupList: ItemGroupType[]`
- `ItemGroupType` — 分组，`display` 属性决定展示形式
- `ItemType` — 业务单元，`type` 决定加载哪个元件
- `ItemRouterType` — 元件注册信息
- `ItemDisplayType` — `"btn" | "icon" | "fullPage" | "box" | "widthBox"`
- `UserTypeType` — `"admin" | "user"`
- `ItemOptionType` — `title: string`, `icon: string`

## 数据存储路径
`data/`（由 `.env` 中 `DATA_DIR` 配置）：
- `data/users/{pathID}/` — 用户数据
  - `user.jsonc` — 用户基本信息
  - `data/` — 业务数据（themeOverrides.json 等）
  - `files/` — 上传文件（图标等）
- `data/pages/{uuid}/` — 页面数据
  - `page.jsonc` — 页面 + itemGroup + item 结构
  - `data/` — 页面级数据（theme.json 等）
  - `files/` — 页面文件
- `data/items/{type}-{uuid}/` — 项目实例数据
  - `data/` — 项目级数据（bookmarkList.json, engineList.json, memoList.json 等）
  - `files/` — 项目文件
- 所有读写通过 `server/stores/` 下模块完成，直接操作文件系统
- 有缓存机制：`cacheUserList` 缓存最近1000个用户

## 认证流程
- `pathID`（用户ID） + `secondCode`（可选密码）
- `App.vue` 初始化 → `userFetch.request('getUser')` → 非200弹登录
- 所有请求通过 `getHeaderFn` 自动附加 `pathid` + `secondcode` 请求头
- 首次运行自动创建 admin 用户（由 `getUser` 处理）
- `verifyUserFromReq()` 是通用认证中间件

## API 系统（核心）
`common/apis/` 实现前后端 API 定义一致化：
- `apiUrlsTrans(prefix, { key: { method, from?, to? } })` — 定义接口形状
- `TransExpressRouter` — 后端，自动转 Express Router
- `TransFetch` — 前端，类型安全的 fetch 调用
- `from`/`to` 仅用于编译期类型推导

## 已注册元件
`common/utils/itemRouterouterList.ts` 注册：
- `www` → WWWItem（搜索引擎/自定义搜索）
- `bookmark` → BookmarkItem（书签收藏夹）
- `memo` → MemoItem（备忘录）
- `ExampleItem` → 示例（调试用）
