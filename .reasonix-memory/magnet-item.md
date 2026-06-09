# MagnetItem 磁力链接补全元件

**文件**：`src/items/MagnetItem/index.vue`

**功能**：
- 输入磁力链接、Info Hash 或百家姓暗号，补全为完整的磁力链接
- 支持多种输入格式：
  - 纯 Info Hash（32-40 位 hex）
  - 完整 `magnet:?xt=urn:btih:...` 链接
  - 百家姓暗号（81 字符完整映射，自动检测中文字符解码）
- Tracker 开关：可启用/禁用常用 Tracker 列表（14 个公共 Tracker）
- 自动去重：已有 Tracker 不重复添加
- 复制按钮 + 直接打开链接按钮
- 3 个内置样例
- 纯客户端处理，无需服务端存储

**重构说明**：已移除佛论禅、核心价值观、独立百家姓 tab，只保留磁力链接补全功能。
