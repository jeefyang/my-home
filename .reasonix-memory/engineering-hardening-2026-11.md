# 2026-11 工程化与性能优化

承接 [安全加固](security-hardening-2026-11.md)，本轮在功能不变的前提下把工程闸门和首屏体验补齐。

## 提交（aa09deb 之后共 9 个）

| commit | 内容 |
| --- | --- |
| 6fae1e2 | fix(server): 收紧鉴权与上传边界，杜绝越权、路径穿越与 SSRF |
| bb2a50b | fix(client): 启动容错、未知元件兜底与移动端交互修复 |
| 9453db1 | chore: 恢复类型检查闸门，请求层加超时，新增安全回归脚本 |
| b607875 | refactor(server): 页面读缓存与用户缓存修复，移除无效依赖 |
| 3495b94 | perf(server): 启用 gzip 与静态资源缓存策略 |
| fb898d8 | perf(client): 主题缓存本地化并与页面初始化并行 |
| 5675648 | chore(types): 开启 strict 并把 399 个类型错误收口 |
| 47e2689 | perf(client): 页面元件分批挂载，首屏不再一次创建全部组件 |
| 2802a99 | test: 引入 vitest，为安全纯函数补 44 条单元测试 |

## 关键点

- `pnpm verify` = `vue-tsc --build && vitest run && pnpm build && node scripts/security-check.mjs`，提交前的唯一闸门。
- strict 开启后历史代码只补类型：`!` 断言、`?? ""`、循环内判空，不改运行时行为。模板里对可能为空的 `curPage/selectGroup` 用 `!`。
- `page.vue` 分批挂载：每分组先渲染 24 个，其余用 `requestIdleCallback`（回落 16ms setTimeout）每次 +24，切换 pageUUID 时重置预算。最终 DOM 与一次性挂载一致，不做虚拟滚动。
- `server/stores/pages.ts` 有 mtime 读缓存 `pageCache`，写/删后 delete；`users.ts` 用 sha256 + timingSafeEqual 比口令，写盘走 tmp+rename。
- 主题配置存在 localStorage，`initTheme()` 与 `initPages()` 用 `Promise.all` 并行。

## 坑

- pnpm 在 Windows 上遇到 `ERR_PNPM_IGNORED_BUILDS` 会生成占位的 `pnpm-workspace.yaml`（值为字符串 `set this to true or false`），之后任何 `pnpm exec` 都会在 deps status check 崩溃，删掉即可；装依赖时加 `--ignore-scripts`。
- 本机 git 走 https 时 schannel 报 `SEC_E_NO_CREDENTIALS`，改用 `"C:/Program Files/Git/cmd/git.exe"` 可绕过。
- 提交信息含换行时必须 `git commit -F 文件`，`-m` 不会转义。
