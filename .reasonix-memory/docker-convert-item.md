---
name: docker-convert-item
title: DockerConvertItem 转换元件
description: DockerConvertItem 元件：docker run → docker-compose 转换器
metadata:
  type: project
---

## 新增 DockerConvertItem 元件（"docker run → docker-compose" 转换器）

**文件**：`src/items/DockerConvertItem/index.vue`

**功能**：
- 解析 docker run 命令并输出 docker-compose.yml
- 支持 ports/volumes/environment/restart/network/link/entrypoint/workdir/user/hostname/dns/cap_add/privileged/memory/cpus/tty/stdin_open/label 等常见参数
- 命名卷自动检测并生成顶层 volumes 声明
- `version: '3'` 开关（默认关闭，新版 compose 不需要 version）
- 复制按钮（浮动在输出框右上角） + 下载为文件按钮
- 3 个内置样例（nginx/mysql/node）
- 输入输出面板上下布局，整体无滚动条，输出框内部独立滚动
- 暗色终端风格输出区域

**注册**：`common/utils/itemRouterouterList.ts` 添加 `dockerConvert` 条目，`component: "DockerConvertItem"`
