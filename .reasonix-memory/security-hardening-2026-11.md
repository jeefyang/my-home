# 2026-11 安全加固与体验修复

对应 34 条审计清单的执行结果（未提交，工作区约 25 文件改动）。

## 命令
- `pnpm verify` = `vue-tsc --build && pnpm build && node scripts/security-check.mjs`
- 单独跑安全回归：`pnpm build && pnpm test:security`（用临时 DATA_DIR，不碰真实数据）

## P0 安全
- `server/routes/userApi.ts`：createUser 先校验管理员 + type 白名单；editUserPathID 只改密码也必须登录，改 pathID 才要求管理员。
- `server/index.ts` SPA fallback：`path.resolve(clientPath, splat)` 必须落在 clientPath 内，否则回 index.html。
- `server/routes/api.ts`：上传走 `validateUploadQuery`（filename 过 `UrlsUtils.checkSinglePath`、prifix/extname 白名单）；multer fileFilter 恢复扩展名白名单（禁 html/svg/js）；下载路由按扩展名设 `X-Content-Type-Options: nosniff` + `CSP: default-src 'none'; sandbox`，非图片强制 `Content-Disposition: attachment`。
- `server/routes/pageApi.ts` / `itemApi.ts`：所有读写要求登录且页面/元件属于当前用户（403）；getPageList 只返回自己的页面，单个损坏页跳过而不是整体 500；initPages 失败回滚新页。
- `server/utils/safeUrl.ts`：`assertPublicUrl` 拦内网/回环/链路本地地址（含 DNS 解析结果），url.ts 与 img.ts 都用它；url.ts 限 3 次重定向、2MB、15s；img.ts 限 2MB、禁 svg。
- `server/stores/users.ts`：secondCode 用 sha256 + timingSafeEqual 比较；user.jsonc 原子写；updateUser 清缓存；getUserList 不再泄露 secondCode；overCancelUser 至少保留一个用户。

## P1/P2 体验
- `src/App.vue` / `src/stores/data.ts`：启动链路 try/finally，失败也会结束 loading；JSON.parse 全部兜底；空页面列表不再抛。
- `src/components/ItemView.vue`：未知元件类型渲染占位；异步组件带 loading/error/超时。
- `src/items/WWWItem/index.vue`：协议前缀判断修正。
- `src/components/Loading.vue`：z-index 修正 + 始终 fixed。
- `src/components/FloatBtn.vue`：touchmove passive:false + preventDefault、touchcancel、卸载清理监听。
- `src/items/MemoItem/index.vue`：保存失败回滚输入。
- `common/apis/tools/transFetch.ts`：15s 超时、401 单列、非 JSON 兜底。
- `src/layout/home.vue`：keep-alive 加 max=5。

## 工程
- `tsconfig.option.json`：exclude 生成的 `auto-imports.d.ts`/`components.d.ts`（它们曾把全部 .vue 拉进没有 @/* 映射的 option 工程，制造 80+ 假错误与 TS6307）。
- `tsconfig.app.json` 仍 `strict: false`；实测 strict 全开会新增 399 个错误，建议单独立项再迁。
- `scripts/security-check.mjs`：14 条断言（首启、穿越、401、越权 403、上传校验）。

## 已知遗留
- `/files/items/...` 仍不鉴权（`<img>` 无法带自定义头），靠 nosniff+attachment 防 XSS。
- 全仓零单元测试；只有安全回归脚本。
