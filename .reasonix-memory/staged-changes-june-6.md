---
name: staged-changes-june-6
title: 2026-06-06 暂存改动总结
description: 最近一次提交和当前暂存改动的详细摘要
metadata:
  type: project
---

## 最近一次提交

`094caad1` — "去掉一些不必要的东西" — 清理 `.codegraph/daemon.pid`、调整 `.gitignore`（2026-06-06）

## 当前暂存改动（7 个文件，+162/-87）

**XModal.vue** — 大重构：
- 用 `<slot name="header">` + `<slot name="footer">` 替代原生 `n-card` header/footer
- 新增 props：`titleClass`、`contentMinHeight`、`isScroll`、`scrollClass`、`displayDirective`（`"if"` | `"show"`）
- 默认 title 显示关闭按钮（`IosClose` 图标）
- 内容区用 `<n-scrollbar>` 包裹（通过 `isScroll` 控制）
- layout: flex column，header / scrollable content / footer 三段

**PageConfigModal.vue** — 简化：`title="页面设置" isItem` 传给 XModal，去掉自定义 header slot

**page.vue** — 新增 Item 弹窗机制：
- `showItem` / `selectItem` / `selectGroup` 三个 ref
- `<XModal>` 包裹 `<KeepAlive :max="10">` 动态渲染 item 组件
- btn group 按钮加 `@click="toItem(group, item)"` 触发弹窗
- `getItemTitle` 加空值保护
- btn 分组改用 `content-class` + flex-gap 布局
- `.page` padding 改为 5px

**ItemView.vue** — 异步组件缓存池：
- `defineAsyncComponent` 提升到 `<script lang="ts">` 模块作用域
- `asyncComponentCache` 按 item type 缓存已加载组件
- 用 `computed` 替代每次重建

**WWWItem/index.vue** — 搜索设置弹窗改用新 XModal API + 内容包 `n-scrollbar`

**main.css** — `.group` 和 `.group_icon`：`height` → `min-height`

**uno.config.ts** — 启用 `presetWind4`，添加自定义规则：`width-*`、`height-*`、`fs-*`、`scroll-none`

## 未暂存改动：无（仅有 MemoItem/index.vue 的 LF/CRLF 行尾警告）
