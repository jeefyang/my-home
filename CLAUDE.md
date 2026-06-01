# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

自定义个人导航面板，Express.js + Vue 3 全栈应用。前后端共享同一端口（开发 3000），文件系统存储（无数据库）。

| 属性     | 值                                   |
| -------- | ------------------------------------ |
| 后端     | Express.js + Vite + Node.js          |
| 前端     | Vue 3 + Vite + TypeScript + Naive UI |
| 包管理器 | pnpm                                 |
| 开发端口 | 3000                                 |

## 常用命令

```sh
pnpm dev           # 开发模式（前后端一体，端口 3000）
pnpm build         # 生产构建（server + client）
pnpm type-check    # TypeScript 类型检查
pnpm format        # Prettier 格式化 src/
pnpm start         # PM2 启动生产服务
pnpm reload        # PM2 热重载
pnpm stop          # PM2 停止
pnpm logs          # PM2 日志
```

## 关键名词

- **user** — 用户，通过 `pathID` + `secondCode` 认证
- **page** — 导航面板中的页面，底部 tab 切换，每个页面包含多个 `itemGroup`
- **item** — 页面中的功能组件（书签、搜索等），通过 `ItemRouterList` 注册，`defineAsyncComponent` 动态加载
- **itemGroup** — 页面中的分组，决定 item 的展示形式（`btn`/`icon`/`box`/`widthBox`/`fullPage`）

## 核心架构

### API 系统（最重要的架构模式）

`common/apis/` 实现了前后端 API 定义一致化：

1. 用 `apiUrlsTrans("prefix/", { key: { method, from?, to? } })` 定义接口形状
2. **后端**：`TransExpressRouter` 将定义转为 Express Router，通过 `setRouter(key, handler)` 绑定处理函数，自动处理 GET/POST 参数提取和响应格式化
3. **前端**：`TransFetch` 将定义转为类型安全的 fetch 调用，通过 `instance.request(key, data)` 发起请求

```
common/apis/user.ts  →  server/routes/userApi.ts  (后端处理)
                      →  src/utils/jFetch.ts       (前端调用)
```

类型 `from`/`to` 作为类型标记传入 `{} as SomeType`，用于编译期类型推导，不参与运行时逻辑。

### 认证流程

用户通过 `pathID`（相当于用户 ID）和 `secondCode`（可选密码）认证。`App.vue` 初始化时调用 `getUser`，若返回非 200 则弹出登录弹窗。后续所有请求通过 `jFetch` 的 `getHeaderFn` 自动附加 `pathid` 和 `secondcode` 请求头。

首次运行时没有用户，自动创建 admin 用户。

### 数据存储

`data/` 目录（路径由 `.env` 的 `DATA_DIR` 配置）：
- `data/users/{pathID}/` — 用户数据，`user.jsonc` 存储基本信息，`data/` 子目录存业务数据，`files/` 子目录存上传文件
- `data/pages/{uuid}/` — 页面数据
- `data/items/{itemName-uuid}/` — 项目实例数据

所有读写通过 `server/stores/` 下的模块完成，直接操作文件系统。

### 添加新 Item 类型

1. 在 `src/items/` 下创建 `{Name}Item/index.vue`
2. 在 `common/utils/itemRouterouterList.ts` 注册条目（`type` 必须与 key 一致）
3. `ItemView.vue` 会自动通过 `defineAsyncComponent` 动态加载对应组件

### 布局结构

```
App.vue → home.vue → page.vue → ItemView.vue → {Name}Item/index.vue (动态加载)
             ↓
       底部 tab 切换 page
```

`home.vue` 负责页面切换（底部 tab），`page.vue` 负责渲染当前页面的 itemGroup 列表。

### 双 Vite 配置

- `vite.config.server.ts` — 后端构建，用 `vite-plugin-node` 编译 Express 到 `dist/server/`
- `vite.config.ts` — 前端构建，用 `@vitejs/plugin-vue` + UnoCSS + Naive UI 自动导入，输出到 `dist/client/`

开发模式下，`server/index.ts` 创建 HTTP Server，Vite 以 middleware 模式挂载，实现前后端同端口 HMR。
生产模式下，Express 直接 serve `dist/client/` 静态文件，SPA fallback 返回 `index.html`。

### 生产部署

PM2 管理进程，配置文件 `ecosystem.config.cjs`。构建后 `dist/server/index.cjs` 为入口，每 3 天自动重启，内存超 1G 自动重启。
