# CryptoItem 暗号工具

**文件**：`src/items/CryptoItem/index.vue`

**功能**：
- 三模式切换：与佛论禅 / 核心价值观 / Base64
- 手动选择加密或解密，两个独立按钮
- 与佛论禅：兼容 takuron.top 版（CryptoJS OpenSSL 盐格式）
  - 算法：EVP_BytesToKey (MD5) + AES-256-CBC
  - 格式：Salted__ + 8字节盐 + 密文 → base64 → 字符替换映射
  - 前缀 "佛又曰："
  - 纯 JS MD5 实现（Web Crypto API 不支持 MD5）
- 核心价值观：hex-digit 映射（富强=0 ~ 敬业=9, 诚信=10 进位, 友善=11 字节分隔）
- Base64：编码/解码（检测非文本数据时显示 Hex）
  - 加密/解密按钮，手动选择方向
- 暗色输出框，浮动复制按钮

# MagnetItem 重构

**文件**：`src/items/MagnetItem/index.vue`

- 去掉佛论禅、核心价值观、独立百家姓 tab
- 只保留磁力链接补全（输入 hash / 磁链 / 百家姓暗号 → 输出完整磁链）
- 自动检测中文字符并用 81 字符完整映射解码
