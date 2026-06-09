# 2026-06-09 第二波改动

## QuickAccessItem 快捷访问网址元件

**新增文件**：`src/items/QuickAccessItem/index.vue`

**主界面**：
- 网格排列图标按钮，标题在图标下方，超长省略
- 无图标时显示标题首字
- 左上角齿轮配置按钮

**配置弹窗**：
- 每个网址可编辑标题、URL、图标
- 添加 / 删除 / 置顶（移至第0位）功能
- 导入：弹窗输入框粘贴 JSON（支持数组或单对象），与 BookmarkItem 复制数据对接
- 图标上传：上传按钮支持选择文件上传
- 图标转换：base64/外链 → 上传到服务器转为文件名存储
- 取消功能：不点保存自动恢复到打开前的数据
- 保存按钮带 loading 状态
- 所有 myUpload 调用带 pathid/secondcode 认证头

**数据存储**：`itemFetch.request("getItemData/updateItemData", { filename: "siteList.json" })`
**图标预览**：通过 `UrlUtils.checkImgUrl` 转换，服务器文件名 → 文件 URL
**导入**：改为弹窗输入框粘贴 JSON，替代剪贴板读取（兼容性更好）

## BookmarkItem 右键菜单新增"复制数据"

**文件**：`src/items/BookmarkItem/components/SingleBookmarkItem.vue`

- 非文件夹书签右键菜单新增"复制数据"按钮（`Code` 图标）
- 功能：复制 `{ title, url, icon }` JSON 到剪贴板
- 图标处理：服务器存储的文件名 → 自动转为 base64 嵌入 JSON
- 与 QuickAccessItem 导入功能对接

## 注册

`common/utils/itemRouterouterList.ts` 新增 `quickAccess` 条目
