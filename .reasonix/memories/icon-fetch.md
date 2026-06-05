# 图标获取系统

## 获取策略（fetchFaviconToServer）
前端 `bookmarkUtils.ts` 依次尝试以下平台，成功即返回：
1. `favicon.im` — 最可靠，国内可访问，放第一位
2. `google` — Google favicon 服务（被墙，3s 超时跳过）
3. `duckduckgo` — DuckDuckGo 图标服务（被墙，3s 超时跳过）
4. `direct` — 直接从目标站点取 `/favicon.ico`（有 `byteLength < 100` 跳过空占位符）

## 超时控制
所有 fetch 统一使用 `FETCH_TIMEOUT = 3000`（3 秒），快速跳过被墙服务。

## 后端 favicon 服务
`server/routes/tools/img.ts` — `favicon(data)`：
- API: `POST /api/tools-img/favicon`
- 使用 `urlObj.hostname`（不含协议）构造平台 URL
- 支持输出 `base64`（直接返回 data URL）或 `url`（存到元件 files 目录）
- 文件目录：`data/items/{itemType}-{itemUUID}/files/`
- 图标文件命名：`favcon_{nanoid(10)}.{ext}`
- MIME 支持：png/jpg/gif/webp/svg/ico/vnd.microsoft.icon + application/octet-stream→ico

## 预览图（getFaviconUrl）
使用 `https://favicon.im/{hostname}` 作为在线预览（浏览器直接加载，不走服务器）。

## 油猴脚本图标获取（addMark.js）
- 先带 `crossOrigin='anonymous'` 加载，成功转 base64 上传服务器
- CORS 失败时降级为无 CORS 重试，返回图片 URL 直接引用

## 文件上传 API
- `POST /api/upload/file/items/:itemType/:itemUUID` — 上传到元件目录
- `GET /api/files/items/:itemType/:itemUUID/:filename` — 读取元件文件
