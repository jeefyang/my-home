# MagnetItem 磁力链接补全元件

**文件**：`src/items/MagnetItem/index.vue`

**功能**：
- 输入磁力链接或 Info Hash，补全为完整的磁力链接
- 支持多种输入格式：
  - 纯 Info Hash（32-40 位 hex）
  - 完整 `magnet:?xt=urn:btih:...` 链接
  - 截断/不完整的 hash
- Tracker 开关：可启用/禁用常用 Tracker 列表（14 个公共 Tracker）
- 自动去重：已有 Tracker 不重复添加
- 复制按钮 + 直接打开链接按钮
- 3 个内置样例
- 纯客户端处理，无需服务端存储

**注册**：`common/utils/itemRouterouterList.ts` 添加 `magnet` 条目
