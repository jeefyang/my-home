---
name: unstaged-changes-june-6-part2
title: 2026-06-06 未暂存改动
description: 当前未暂存的 4 个文件改动详情
metadata:
  type: project
---

## 当前未暂存改动（4 个文件）

### common/utils/itemRouterouterList.ts
- DockerConvertItem 注册新增 `icon: "icon.png"` 字段（ItemRouterType 扩展了 icon 支持）

### src/assets/main.css
- 新增 `.singe-line` class：`text-overflow: ellipsis; overflow: hidden; word-break: break-all; white-space: nowrap;`

### src/layout/page.vue
- **icon 分组重构**：圆形图标按钮 + 下方文字，替代原来的纯文字按钮
- icon 按钮显示 item 图标（通过 `getItemIcon` / `getItemAbsIcon`），无图标时显示标题首字
- 新增 `getItemIcon(item)` 函数：优先取 `item.options.icon`，回退到 `ItemRouterList[type].icon`
- 新增 `getItemAbsIcon(item)` 函数：调用 `UrlUtils.checkImgUrl` 转绝对路径
- 引入 `UrlUtils` from `@/utils/url`
- 引入 `n-image` 组件显示图标

### types/index.d.ts
- `ItemGroupType` 新增 `displayTitle?: string` 字段（显示用的标题）
- `title` 注释更新为"标题(区分用的)"
