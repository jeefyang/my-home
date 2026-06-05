# 前端 Store 层（Pinia）

## dataStore — 全局状态（src/stores/data.ts）
使用 Pinia `defineStore` 定义，名称为 `"data"`。

### 状态
- `pathid` / `secondcode` — 用户认证信息
- `user` — 当前登录用户完整信息
- `pageList` — 所有页面列表
- `switchPageUUID` — 当前激活页 UUID
- `isMobile` / `isSmallScreen` — 设备检测
- `themeOverrides` — 全局主题覆盖（Naive UI）
- `floatBtnX` / `floatBtnY` — 悬浮按钮位置
- `fullLoading` / `fullLoadingTitle` — 全屏加载状态

### 方法
- `save()` / `load()` / `clear()` — localStorage 持久化（key: `"data"`）
- `initUser()` — 调用 `getUser` API 初始化用户，同时加载 `themeOverrides.json`
- `initPages()` — 从 API 加载/初始化页面列表
- `resize()` — 响应窗口大小变化
- `turnLoading(v, title?)` — 控制全屏加载

### 持久化策略
- saveKey = `"data"`
- `save()` 序列化 `pathid`, `secondcode`, `switchPageUUID`, `floatBtnX`, `floatBtnY`
- `load()` 先读 localStorage，再读 URL 参数（URL 参数优先级更高）
- URL 参数覆盖：`?pathid=xxx&secondcode=xxx&switchPageUUID=xxx`

### 页面初始化流程
1. 如果 `user.pageUUIDList` 不为空 → 调用 `getPageList` 获取已有页面
2. 如果为空 → 调用 `initPages` API（从 `initPages.js` 创建默认页面）
3. 查找默认页面（`isDefault`）或使用第一个

## optionStore（src/stores/option.ts）
空 Store，预留。

## themeOverride（src/stores/themeOverride.ts）
不是 Store，是工具函数：
- `defaultThemeOverrides` — 默认 Naive UI 主题覆盖（Card padding 等）
- `initThemeOverrides(theme)` — 合并用户主题与默认主题（递归合并，已有值不覆盖）
