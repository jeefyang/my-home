# 网络/服务器配置

## JSON 请求体大小限制
`server/index.ts` 中 `express.json({ limit: '50mb' })`
原因：导入大收藏夹（2000+书签）时 JSON 体超过默认 100kb 会报 `PayloadTooLargeError`。

## 生产环境 HTTPS/HTTP 双模式 helmet
根据请求协议动态切换安全策略：
```ts
if (isHttps) {
    helmet() // 严格模式
} else {
    helmet({ hsts: false, contentSecurityPolicy: { ... } }) // 局域网宽松模式
}
```
- HTTPS（外网/Nginx）→ 严格 `helmet()`
- HTTP（局域网）→ 关掉 `hsts` 和 `upgrade-insecure-requests`
- 判断：`req.secure || req.headers['x-forwarded-proto'] === 'https'`
- `app.set('trust proxy', 1)` — Nginx 反向代理必需

## 文件访问
- `GET /api/files/items/:itemType/:itemUUID/:filename` — 元件文件（目录名为 `{type}-{uuid}`）
- `GET /api/files/:objType/:uuid/:filename` — 用户/页面文件（`objType: users|pages`）

## 文件上传
- `POST /api/upload/file/items/:itemType/:itemUUID` — 元件文件上传
- `POST /api/upload/file/:objType/:uuid` — 用户/页面文件上传

## URL 工具
`server/utils/urls.ts` — `UrlsUtils.checkSinglePath()`
- 检查路径是否包含 `/` `\` `..` 等危险字符
- 防止路径穿越攻击，所有文件读写前调用

## 开发模式
- 默认端口 `3000`（`.env` 中 `SERVER_PORT=3002`）
- 生产端口由 PM2 配置 `6001`（见 `ecosystem.config.cjs`/enable `SERVER_PORT: 6001`）
- NODE_ENV=development 时返回完整错误栈
- 开发模式挂载内存监控插件，每 3 秒打印 RSS/Heap

## 生产部署（PM2）
- 入口：`dist/server/index.cjs`
- 每 3 天自动重启（cron: `0 0 1-31/3 * *`）
- 内存超 1G 自动重启
- `wait_ready: true` + `listen_timeout: 10000`
- `max_restarts: 10` + `min_uptime: 5s` 防死循环
