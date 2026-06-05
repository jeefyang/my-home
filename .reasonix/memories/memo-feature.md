# 备忘录元件（MemoItem）

## 文件
- `src/items/MemoItem/index.vue` — 主元件（约255行）

## 数据存储
- `data/items/memo-{uuid}/data/memoList.json`
- 数据结构：`MemoType[]`
  ```ts
  type MemoType = { uuid: string; content: string; createTime: number; modifyTime: number }
  ```

## 实现功能
- **对话历史展示**：从上到下排列，最新在最下方
- **自动滚动到底部**：发送新消息后 `scrollToBottom()`
- **用户滚动检测**：如果用户手动向上滚动，则自动滚动暂停（`isUserScrolling` 标记）
- **每条记录操作**：复制（旧式 `document.execCommand`）、编辑、删除
- **输入框**：`textarea` 支持 `minRows: 1, maxRows: 2`，Enter 发送（`@keydown` 拦截）
- **工具栏**：刷新按钮（重新加载数据）、清空按钮（确认后清空所有）
- **编辑弹窗**：独立 `XModal`，支持多行编辑
- **删除确认**：单条删除 / 全部清空两个模式

## 样式
- 简洁卡片风格，单条记录有 `1px` 边框 + 8px 圆角
- 操作按钮（复制/编辑/删除）hover 时显示（`opacity: 0 → 1`）
- 时间戳格式化：`YYYY-MM-DD HH:mm`
