# 生产环境网络配置

## 核心修复：HTTPS/HTTP 双模式 helmet

`server/index.ts` 中的 helmet 配置根据请求协议动态切换：

### HTTP（局域网环境，如 `http://192.168.1.100:4000`）
```typescript
helmet({
    hsts: false,                                       // 不强制 HTTPS
    contentSecurityPolicy: {
        directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'"],
            "img-src": ["'self'", "data:"],
            "upgrade-insecure-requests": null,         // 核心！不升级到 HTTPS
        },
    },
})
```

### HTTPS（生产环境，Nginx 反向代理）
```typescript
helmet()  // 默认严格安全策略
```

### 其他设置
- `app.set('trust proxy', 1)` — Nginx 反向代理必需，否则 `req.secure` 不正确
- 判断逻辑：`req.secure || req.headers['x-forwarded-proto'] === 'https'`
