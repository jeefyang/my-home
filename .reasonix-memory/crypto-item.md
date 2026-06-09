# CryptoItem 暗号工具

**文件**：`src/items/CryptoItem/index.vue`

**功能**：
- 三模式切换：与佛论禅 / 核心价值观 / Base64
- 自动检测输入是明文还是密文，无需手动选择
- 与佛论禅：AES-256-CBC (Web Crypto API) 加密/解密，兼容 keyfc.net
- 核心价值观：base-12 编码/解码（富强=0 ~ 友善=11）
- Base64：编码/解码（检测非文本数据时显示 Hex）
- 暗色输出框，浮动复制按钮

# MagnetItem 重构

**文件**：`src/items/MagnetItem/index.vue`

- 去掉佛论禅、核心价值观、独立百家姓 tab
- 只保留磁力链接补全（输入 hash / 磁链 / 百家姓暗号 → 输出完整磁链）
- 自动检测中文字符并用 81 字符完整映射解码
