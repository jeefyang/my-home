# 搜索元件（WWWItem）

## 文件
- `src/items/WWWItem/index.vue` — 主元件

## 数据存储
- `data/items/www-{uuid}/data/engineList.json`
- 数据结构：`EngineType[]`
  ```ts
  type EngineType = {
    name: string;      // 搜索引擎名称
    icon: string;      // 图标 URL（base64 或文件名）
    url: string;       // 搜索路径，$$key$$ 替换关键字
    uuid: string;
    _iconUrl?: string;  // 仅用于图标生成，不保存
    isDefault?: boolean;
  }
  ```

## 实现功能
- **搜索框**：`n-input`，支持 `clearable`、`round`，Enter 搜索
- **搜索引擎切换**：底部按钮列表，每个引擎显示首字符或 icon 图标
- **自定义 URL 模式**：切换索引为 -1 时直接作为 URL 访问（自动补 `http://`）
- **新开/跳转**：`window.open`（新标签）或 `window.location.href`（当前标签）
- **搜索引擎管理弹窗**：
  - 添加/删除/排序引擎
  - 配置名称、图标（url/base64）、搜索路径
  - **图标生成器**：输入网址自动获取 favicon（调用 `toolsImgFetch.favicon`）
- **初始化**：`onMounted` 加载引擎列表，自动选择默认引擎或第一个

## 引擎图标显示
`UrlUtils.checkImgUrl(item.icon, './api/files/users/${dataStore.pathid}')`
- data:/http:/https: 开头 → 直接使用
- / 开头 → 拼接 prefix
- 其他 → prefix + '/' + 图标文件名
