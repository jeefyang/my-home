# 图标获取

## 前端多平台轮询
`src/items/BookmarkItem/components/bookmarkUtils.ts` — `fetchFaviconToServer()`
依次尝试三个平台：Google → DuckDuckGo → favicon.im，一个成功就返回，全部失败才返回空。

## 后端 favicon 服务
`server/routes/tools/img.ts`
- 使用 `urlObj.hostname`（不含协议）构造平台 URL，兼容所有三种平台
- 支持的 MIME 类型：png/jpg/gif/webp/svg/ico/vnd.microsoft.icon
- 图标存到 `data/users/{pathID}/files/favcon_xxx.{ext}`

## 平台 URL 模板
- Google: `https://www.google.com/s2/favicons?domain={hostname}`
- DuckDuckGo: `https://icons.duckduckgo.com/ip3/{hostname}.ico`
- favicon.im: `https://favicon.im/{hostname}`
