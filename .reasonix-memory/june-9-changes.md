# 2026-06-09 改动

## 今日提交（660a474）

**"增加图标"** — 给现有的元件加上图标文件：
- `public/items/BookmarkItem/icon.png`
- `public/items/MemoItem/icon.png`
- `public/items/WWWItem/icon.png`
- `common/utils/itemRouterouterList.ts` — 各条目添加 `icon` 字段指向对应图片
- `src/layout/page.vue` — 图标显示逻辑微调

## 当前未暂存改动（5 个文件）

### src/assets/main.css
- 新增 `.box` 基础样式（`width: 100%`）
- 新增移动端（`@media (width <768px)`）强制全宽规则：
  - `.box` / `.group_btn` / `.group_icon` / `.group_box` 全部 `width: 100% !important; min-width: 100% !important`

### src/components/PageConfigModal.vue — 大重构
- 改用 `n-collapse` / `n-collapse-item` 替代平铺卡片，分组/元件支持展开折叠
- 新增 **分组样式** 配置（支持 `max-height`、`min-width`）+ 清空按钮
- 新增 **元件样式** 配置 + 清空按钮
- 新增 **元件配置清空** 功能（`clearItemOption`）
- 新增 **分组全展开 / 全折叠**、**元件全展开 / 全折叠** 按钮
- 追加分组/元件功能移到折叠面板底部
- 分组 title 显示在面板 header，元件 title 显示在子面板 header
- 删除元件前弹窗确认
- 文字统一 "项目" → "元件"

### src/items/ExampleItem/index.vue
- 新增 `display: ItemDisplayType` prop（同步其他元件规范）

### src/items/WWWItem/index.vue
- 新增 `display: ItemDisplayType` prop

### src/layout/page.vue
- btn 分组：`<n-card>` 添加 `:style="group.style"` 绑定
- icon 分组：同上
- box 分组：合并 `group.style` 和 `item.style` 绑定
- widthBox 分组：同上
- fullPage 分组：同上
