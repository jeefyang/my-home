---
name: addmark-script-fix
title: 油猴脚本刷新/页签修复
description: 油猴脚本 addMark.js：刷新按钮修复、页签名称显示
metadata:
  type: project
---

## 油猴脚本（addMark.js）修复：收藏夹刷新、页签名称显示

**文件**：`public/items/BookmarkItem/addMark.js`

**修复了两个问题**：
1. **刷新按钮不回退信息**：收藏夹UUID旁的 🔄 按钮现在获取收藏夹列表后自动调用 `load()` 重新加载书签树，之前只更新了 UUID 字段不刷新列表
2. **显示当前页签名称**：UUID 输入框下方新增蓝色文字显示当前收藏夹名称（如 "📁 我的书签"）

**新增函数**：
- `refreshBookmarkList(skipLoad)` — 通用收藏夹列表刷新，可带参数控制是否接着加载书签树
- `updateBookmarkTitle()` — 根据缓存中的收藏夹列表更新页签名称显示

**导入 JSON 也同步**：导入 JSON 切换收藏夹后自动更新页签名称
