# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

自定义个人导航面板：Express 5 + Vue 3 全栈应用，前后端同源同端口，数据全部落在文件系统（无数据库、无 ORM，`fs` 同步读写）。

| 属性     | 值                                         |
| -------- | ------------------------------------------ |
| 运行时   | Node 20.19+ / 22.12+，pnpm                 |
| 后端     | Express 5 + Vite（vite-plugin-node）       |
| 前端     | Vue 3 + TypeScript + Naive UI + Pinia + UnoCSS |
| 开发端口 | 默认 3000（`SERVER_PORT` 进程环境可改）    |
| 生产入口 | `dist/server/index.cjs`（PM2）             |

## 常用命令

```sh
pnpm dev                                  # 开发：单个 Vite 服务同时提供前端和 API
pnpm build                                # 生产构建（先 server 再 client）
pnpm type-check                           # vue-tsc --build（四个子工程）
pnpm test                                 # vitest run，跑 tests/ 下全部用例
pnpm vitest run tests/pageOrder.test.ts   # 只跑单个测试文件
pnpm test:security                        # 安全回归脚本（必须先 pnpm build）
pnpm verify                               # 提交闸门：type-check + test + build + 安全回归
pnpm format                               # Prettier，只格式化 src/
```

PM2：`pnpm start|reload|restart|stop|delete|logs`；`pnpm update` 在部署机上依次拉代码 → 安装依赖 → 构建 → reload。

`pnpm verify` 是唯一完整的验证闸门。`test:security` 会启动构建产物（临时 `DATA_DIR` + 随机端口），所以必须先 build；它不碰真实 `data/`。

## 关键名词

- **user** — 账号，靠 `pathID` + 可选 `secondCode` 认证；`type` 为 `admin` / `user`
- **page** — 底部 tab 对应的一页，包含多个 `itemGroup`
- **itemGroup** — 分组，`display` 决定渲染方式：`btn` / `icon` / `box` / `widthBox` / `fullPage`
- **item** — 页面里的功能元件（书签、搜索等），由 `ItemRouterList` 注册、`defineAsyncComponent` 按需加载

## 核心架构

### API 系统（改接口前必读）

`common/apis/*.ts` 是前后端共用的唯一契约：

1. `apiUrlsTrans("user/", { getUser: { method, from?, to? } })` 定义接口；`from` / `to` 只是 `{} as Type` 的类型标记，运行时无意义。
2. **后端**：`TransExpressRouter.setRouter(key, handler)` 生成 Express 路由。GET 取 `req.query`、POST 取 `req.body`；handler 返回 `{ code?, msg?, data?, err? }`，自动序列化为统一响应。`err` 存在时 HTTP 状态取 `code`（默认 500），生产环境不返回堆栈。
3. **前端**：`TransFetch.request(key, data)` 发请求。GET 拼查询串、POST 发 JSON；15s 超时；401 单独返回；网络错误或非 JSON 响应返回 `code: 666`。五个实例（user/page/item/toolsImg/toolsUrl）在 `src/utils/jFetch.ts` 创建，鉴权头由 `App.vue` 统一注入。

服务端把所有 API 挂在 `/api`，前端 `prevUrl = "api/"`，所以定义里的 `"user/getUser"` 对应 `/api/user/getUser`。

新增接口：在 `common/apis/` 加定义 → 在对应 `server/routes/*Api.ts` 里 `setRouter` 实现 → 前端用已有 `*Fetch` 实例调用。除文件上传/下载等非 JSON 路由外，不要在服务端另写裸 `router.get`。

### 认证与权限

- 首次启动没有用户时，`GET /api/user/getUser` 自动创建 admin 并返回。
- 之后所有请求靠请求头 `pathid` + `secondcode` 鉴权；`secondCode` 用 sha256 + `timingSafeEqual` 比较。
- 401 = 未登录/凭据错误（前端弹登录框）；403 = 已登录但越权（非管理员、访问他人页面/元件）。
- 管理端不变量：不能改自己的 `type`、不能删自己、不能重置自己的二次码、至少保留一个 admin；`userList` 永不返回 `secondCode`。
- 前端把 `pathid` / `secondcode` 存在 `localStorage` 的 `data` 键，并允许 URL query 覆盖（见 `src/stores/data.ts`）。

### 数据存储

`DATA_DIR` 默认 `./data`，由 `process.cwd()` 解析成绝对路径——必须在仓库根启动，否则会读写到别处。

```
data/users/{pathID}/user.jsonc      # 基本信息；data/ 存业务数据，files/ 存上传文件
data/pages/{uuid}/page.jsonc        # 页面；同样有 data/、files/
data/items/{type}-{uuid}/           # 元件实例，目录名必须是 {type}-{uuid}
```

- 约定：`files/` 放随机命名、不修改的资源（可长缓存）；`data/` 放实时变化的内容（不缓存）。
- 所有读写只在 `server/stores/` 内完成，用同步 `fs`。`page.jsonc`、`user.jsonc` 都先写 `.tmp` 再 rename。
- 缓存：`cacheUserList` 是用户 LRU；`pages.ts` 按文件 mtime 维护 `pageCache`。写盘后必须让对应缓存失效，否则会读到旧对象。
- 环境变量优先级：显式进程环境 > `.env.local` > `.env`（见 `server/stores/data.ts`）。`.env` 不会被 Vite 配置文件加载，其中 `SERVER_PORT` 只作用于生产 `app.listen`；开发端口取进程环境里的 `SERVER_PORT`。

### 安全边界（改路由或上传时必须保持）

- 页面、元件读写都要校验归属，非本人数据返回 403（`pageApi.ts` / `itemApi.ts`）。
- 所有来自请求的路径片段先过 `UrlsUtils.checkSinglePath`，再 `path.resolve` 并确认仍在目标目录内。
- 上传：扩展名白名单（禁 html / svg / js 等），校验 `filename` / `prifix` / `extname`；非图片强制 `Content-Disposition: attachment`，响应统一带 `nosniff` 与沙箱 CSP。
- 服务端代抓 URL（`tools/url`、`tools/img`）先过 `safeUrl.assertPublicUrl`，拦截内网/回环/链路本地地址（含 DNS 解析结果），并限制重定向次数、响应大小和超时。
- `/api/files/items/...` 不鉴权（`<img>` 无法带自定义头），只靠上述响应头兜底；不要往这里放敏感内容。
- `scripts/security-check.mjs` 覆盖首启、路径穿越、401/403、上传校验等断言；改安全逻辑时同步补用例。

### 前端结构

```
App.vue → home.vue → page.vue → ItemView.vue → src/items/{Component}/index.vue
```

`App.vue` 负责初始化（`initUser` 成功后再并行 `initPages` / `initTheme`）并注入鉴权头；`home.vue` 管底部 tab 与 `keep-alive`；`page.vue` 渲染分组并对大分组分批挂载；`ItemView.vue` 按 `item.type` 找组件，自带 loading / error / 超时占位。

新增 item 类型：

1. 在 `src/items/{Component}/index.vue` 创建组件，接收 props `item`、`pageUUID`、`itemGroupUUID`、`display`
2. 在 `common/utils/itemRouterouterList.ts` 注册，key 必须等于 `type`，`component` 必须是目录名
3. 元件私有静态资源放 `public/items/{Component}/`，默认图标为其中的 `icon.png`

### 双 Vite 配置与运行模式

- `vite.config.ts`：客户端构建（Vue、UnoCSS、Naive UI 自动导入），输出 `dist/client/`。
- `vite.config.server.ts`：开发时复用客户端插件并由 Vite 直接提供页面，通过自定义 `configureServer` 把 Express app 作为中间件挂上；挂载时必须传 `next`，否则 Express 的 404 会吞掉前端路由和静态资源。构建时用 `vite-plugin-node` 输出 `dist/server/`。
- **不要**在 `server/index.ts` 里再建第二个 HTTP Server 或第二个 Vite 实例（会导致端口错位、HMR 连接失败）。该文件只在生产模式 `listen` 并 serve 静态文件。
- 生产静态服务：`index.html` 设 `no-cache`；带指纹的资源 `immutable` 长缓存；gzip 阈值 1KB；SPA fallback 先校验解析路径仍在 `dist/client` 内。
- `vite.config.server.ts` 启动时会把 `ecosystem.config.example.cjs`、`initPages.example.js` 复制成实际文件（两者被 gitignore）。要改模板请改 `.example` 文件。`initPages.js` 由服务端用 `eval` 执行，是新用户的页面模板。

### 测试

- 用例在根目录 `tests/`。没有独立 vitest 配置，Vitest 会自动复用 `vite.config.ts` 的 `@` / `@common` 别名。
- 测试 store 时先设 `process.env.DATA_DIR` 到临时目录，再**动态 import** store（`DATA_DIR` 在模块加载时求值），并在每个用例前清理缓存和目录，参考 `tests/users.test.ts`。

### 类型与代码约定

- `vue-tsc --build` 按 `tsconfig.json` 的四个子工程检查：app（strict）、server、node、option（含 `plugins/` 与根目录脚本）。生成的 `auto-imports.d.ts` / `components.d.ts` 在 option 工程里排除，避免把 `.vue` 拉进没有 `@/*` 映射的工程。
- 路径别名：`@/*` → `src/`，`@common/*` → `common/`（前端、服务端和 tsconfig 均已配置）。
- 前端可直接使用 Naive UI 组件及 `useDialog` / `useMessage` 等自动导入，无需手写 import；样式用 UnoCSS，`uno.config.ts` 额外定义了 `width-N`（百分比）、`width-Npx`、`height-N`、`fs-N`。
- 开发模式下 `src/main.ts` 会挂载 vConsole。

## 项目记忆

`.reasonix-memory/` 记录关键改动与踩坑，随 git 跟踪。更新时直接编辑 Markdown，并在 `.reasonix-memory/MEMORY.md` 补一行索引。

## Agent skills

### Issue tracker

Issue 与 spec 都记录在 GitHub Issues（`jeefyang/my-home`），用 `gh` CLI 操作。See `docs/agents/issue-tracker.md`.

### Triage labels

五个默认 triage 角色（`needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`），另有 wayfinder 类型标签（`wayfinder:map` / `research` / `prototype` / `grilling` / `task`）。See `docs/agents/triage-labels.md`.

### Domain docs

single-context：一个仓库共用根目录的 `GLOSSARY.md`，架构决定放 `docs/adr/`。See `docs/agents/domain.md`.
