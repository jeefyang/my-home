# 2026-06-09/10 修复：复制工具 + 各处适配

## 新增复制工具类

`src/utils/index.ts` — `Utils.copyStr` 静态方法：
- 三层降级：Clipboard API → `execCommand`（挂在 `activeElement.parentNode`）→ `window.prompt`
- 弹窗模式下 append 到焦点元素父节点，而非 `document.body`，解决弹窗内复制失败问题
- 参数：msg 实例、文本内容、可选的成功/失败/空消息

## 各处同步

- CryptoItem、DockerConvertItem、MagnetItem、PathConvertItem 等改为调用 `Utils.copyStr`
- XModal、page.vue、BookmarkItem 等同步修改
