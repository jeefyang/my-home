---
name: vconsole-and-copy-dom-2026-11
title: 2026-11 移动端调试与复制容器修复
description: vConsole 开发期调试面板 + Utils.copyStr 支持指定 DOM 挂载容器（MemoItem 适配）
metadata:
  type: project
---

## 2026-11 移动端调试与复制容器修复

### 1. vConsole 开发期调试面板

**文件**：`src/main.ts`、`package.json`（新增 `vconsole@^3.15.1`）

- `import VConsole from 'vconsole'`，`app.mount('#app')` 之后 `if (process.env.NODE_ENV == 'development') new VConsole();`
- 目的：手机真机调试时看 console / 网络 / 存储，生产构建不启用
- 新增 `pnpm-workspace.yaml`：`allowBuilds: { '@parcel/watcher': true, core-js: true }`，放行 pnpm 的 postinstall 构建脚本（vconsole 带入 core-js）

### 2. Utils.copyStr 支持指定挂载容器

**文件**：`src/utils/index.ts`、`src/items/MemoItem/index.vue`

- 参数对象新增可选 `dom?: HTMLElement`
- `execCommand` 降级路径的 textarea 容器优先级：`obj?.dom` → `document.activeElement?.parentNode` → `document.body`
- 原因：MemoItem 移动端点击/长按时 `document.activeElement` 不稳定，textarea 挂到意外节点导致复制失败；改为显式传入组件根节点
- MemoItem：模板根 div 加 `ref="memoRef"`，`const memoRef = ref<HTMLElement | undefined>(undefined)`，`copyMsg` 调用 `Utils.copyStr(msg, text, { successMsg: "已复制", dom: memoRef.value })`
- 顺带去掉 textarea `cssText` 末尾多余分号（无行为变化）
