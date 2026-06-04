# 网络/服务器配置

## JSON 请求体大小限制
`server/index.ts` 中 `express.json({ limit: '50mb' })`，默认 100kb → 50mb。
原因：导入大收藏夹（2000+书签）时 JSON 体超过 100kb 会报 `PayloadTooLargeError`。

## 生产环境 HTTPS/HTTP 双模式 helmet
根据请求协议动态切换：
- HTTPS（外网/Nginx）→ 严格 helmet()
- HTTP（局域网）→ 关掉 hsts 和 upgrade-insecure-requests

### 其他
- `app.set('trust proxy', 1)` — Nginx 反向代理必需
- 判断：`req.secure || req.headers['x-forwarded-proto'] === 'https'`
