---
name: memoitem-mobile-interaction
title: MemoItem 移动端交互
description: MemoItem：移动端点击切换操作按钮、双击复制文本
metadata:
  type: project
---

## MemoItem 移动端交互优化

**文件**：`src/items/MemoItem/index.vue`

**问题**：移动端 hover 变成"粘性hover"，操作按钮出现后去不掉。

**修复**：
1. **桌面**（`@media (hover: hover)`）：hover 显示操作按钮，行为不变
2. **移动端**（`@media (hover: none)`）：按钮默认隐藏，**点击记录**切换显示编辑/删除按钮（`activeIdx` 标记，再点收起）
3. **双击文本**：直接复制内容并提示"已复制"
4. **菜单保留复制按钮**：复制功能在菜单中也可见，不双击也可通过按钮操作
5. **精简**：去掉未使用的 `confirmDeleteWrap` / `originalConfirmDelete` 死代码
