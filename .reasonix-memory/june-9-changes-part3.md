# 2026-06-09 第三波改动

## CryptoItem 与佛论禅修复
- 改为固定 KEY/IV（`XDXDtudou@KeyFansClub^_^Encode!!` / `Potato@Key@_@=_=`）
- IV 修正为正好 16 字节
- 高位字节固定用 `BYTEMARK[0]`（'冥'），不再按模 12 取
- 纯 JS AES 实现，不依赖 Web Crypto API

## MagnetItem 百家姓映射更新
- 完整 76 映射，URL 特殊符号 13 个：薛→. 伍→- 余→_ 米→+ 贝== 姚→/ 孟→? 顾→# 尹→% 江→& 钟→* 竺→: 赖→|

## 新增 PathConvertItem 路径符号转换
- 三种目标格式互转：`/`、`\`、`\\`
- 自动统一斜杠再转换目标格式
- 纯客户端，暗色输出框 + 复制按钮
