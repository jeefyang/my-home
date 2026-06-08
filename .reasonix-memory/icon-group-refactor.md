---
name: icon-group-refactor
title: icon 分组图标支持
description: page.vue icon 分组重构为圆形图标按钮+文字，支持图标显示
metadata:
  type: project
---

## page.vue icon 分组重构：支持图标显示

**文件**：`src/layout/page.vue`

原先是纯文字按钮，改为**圆形图标按钮 + 下方文字**：
- 显示 item 的图标（优先 `item.options.icon`，回退到 `ItemRouterList[type].icon`）
- 无图标时显示标题首字
- 文字用 `n-ellipsis` 限制单行显示

**新增函数**：
- `getItemIcon(item)` — 获取图标 URL
- `getItemAbsIcon(item)` — 调用 `UrlUtils.checkImgUrl` 转绝对路径

**CSS**：`src/assets/main.css` 新增 `.singe-line` 单行省略 class

**类型**：`types/index.d.ts` 新增 `ItemGroupType.displayTitle` 字段
