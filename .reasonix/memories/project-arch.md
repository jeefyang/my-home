# 项目架构关键信息

## 类型系统
- `types/index.d.ts` 定义了所有全局类型
- **重要**：`option` 属性已统一更名为 `options`（UserType、ItemGroupType、PageType、ItemType）
- `ItemOptionType` 当前字段：`title: string`、`icon: string`

## 元件配置系统
- `src/components/PageConfigModal.vue` 中的元件配置面板支持动态 options
- 每个元件可配置 title、icon 等，通过 `updateItemOption` 保存到服务器
- 元件读取配置：`props.item?.options?.title`

## 元件注册
- `common/utils/itemRouterouterList.ts` 注册所有元件
- key 必须与 type 一致

目前已注册：
- `"www"` — 搜索元件（WWWItem）
- `"bookmark"` — 书签元件（BookmarkItem）
- `"memo"` — 备忘录元件（MemoItem）
