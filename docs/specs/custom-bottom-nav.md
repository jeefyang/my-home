# 自定义底部导航 规格

> 状态：draft · 2026-11-15 · 作者：wayfinder 会话
> 地图：《自定义底部导航》（wayfinder:map）
> 依据：《页面增删改的接口与顺序契约》《底部导航布局与滚动手势规格》《导航管理界面规格》《页面图标的来源与渲染契约》
> 原型：`prototype/nav-manager.html`（C 方案为验收基准）

## 1. 目标

底部导航从固定 3 页改为 **≥1 页可变**，支持新增、编辑、删除、上移/下移排序；可视区 ≤5 个时自动均分（每个 `100%/n`），>5 个时每个固定 `20%` 宽、横向滑动；图标来自内置选择器（SVG）或 emoji / 单字。

**不在本规格**：拖拽排序、图标上传 / favicon / 任意 SVG 粘贴、导航外观主题自定义、新增页复制当前页内容。

## 2. 既有事实（实现锚点）

| 事实 | 位置 |
| --- | --- |
| 底栏渲染（n-icon + v-html） | `src/layout/home.vue:9-16` |
| 底栏样式：`height:50px`、`overflow-x:auto`、`flex:1; min-width:90px` | `src/layout/home.vue:52-71` |
| `PageType` 定义 | `types/index.d.ts:53-69` |
| 顺序唯一来源 `user.pageUUIDList` | `src/stores/data.ts:119-145`；`server/routes/pageApi.ts:59-80` |
| `addPage` / `deletePage` 为 500 桩 | `server/routes/pageApi.ts:104-108`、`:131-135` |
| `updatePage` 强制 uuid、裸写盘 | `server/routes/pageApi.ts:110-129`；`server/stores/pages.ts:127-142` |
| 页面读写（tmp+rename、mtime 缓存） | `server/stores/pages.ts:13-34` |
| 工具栏 6 个圆按钮 | `src/components/ToolBar.vue:4-46` |

## 3. 数据模型

`PageType` 字段不变，不新增 `iconType`：

- `title`：`trim` 后 1–20 字；空由服务端填「新页面」。
- `icon`（可选）二选一编码：
  - **SVG**：以 `<` 开头、通过白名单校验的 SVG 片段，≤ 4096 B；
  - **文本**：1–4 个 Unicode 码点（emoji 或单字），不含 `<` `>` `&`。
  - 判别只看首字符是否为 `<`。存量三个默认页（`src/utils/initPages.js:16/23/34`）都是 SVG，零迁移。
- `isDefault`：全表最多一个 `true`；删除默认页时迁移。
- `uuid`：服务端 `nanoid(10)` 生成，客户端不可指定。
- 顺序：只由 `UserType.pageUUIDList` 决定，`page.jsonc` 内不存 order。

## 4. 接口契约

`common/apis/page.ts` 定义调整（前后端共享，类型即文档）：

| key | from | to |
| --- | --- | --- |
| `addPage` | `{ title?: string; icon?: string }` | `{ page: PageType; uuidList: string[] }` |
| `deletePage` | `{ uuid: string }` | `{ uuidList: string[] }` |
| `updatePage` | `{ uuid: string; obj: Partial<PageType> }` | `PageType` |
| `updatePageOrder`（新增） | `{ uuidList: string[] }` | `{ uuidList: string[] }` |

错误统一沿用 `{ code, msg, err? }` 形状。

### 4.1 addPage

1. 鉴权；`title` trim 后为空 → 「新页面」；长度 >20 → 400。
2. `icon` 走 `validatePageIcon`；非法 → 400，且不落任何盘。
3. `store.addPage`：生成 uuid、`itemGroupList=[]`、`isDefault=false`、`style={}`、时间戳，`mkdir` 页面目录 + `data/` + `files/`，`writePage`。
4. 新列表 `next = [...user.pageUUIDList, page.uuid]`，`updateUser` 落盘。
5. 第 4 步失败：`store.deletePage(page.uuid)` 回滚目录，返回 500。
6. 返回 `{ page, uuidList: next }`。

### 4.2 deletePage

1. 鉴权 + `requirePage`（非本人 403，不存在 404）。
2. `list.length <= 1` → 409「至少保留 1 个页面」。
3. 若删的是 `isDefault`：目标页 = 后一页，无后一页取前一页；先 `updatePage` 置 `isDefault:true`。
4. `next = list.filter(u => u !== uuid)`，`updateUser` 落盘；失败 → 回滚默认页标记，500。
5. `store.deletePage(uuid)` 删目录；失败 → 恢复 `user.pageUUIDList` 与默认页标记，500。
6. 返回 `{ uuidList: next }`。

> 先写用户列表、再删目录：中途崩溃最多留下孤儿目录，不会留下指向已删页面的死链。

### 4.3 updatePageOrder

1. 鉴权；`from.uuidList` 与原列表**集合相同且长度相同**，否则 409（并发或客户端脏数据）。
2. `updateUser` 写入；失败 500。
3. 返回 `{ uuidList }`。仅改顺序，不碰页面内容。

### 4.4 updatePage 增补

- 丢弃 `obj.uuid`（强制 `from.uuid`）与 `obj.isDefault`（默认页只由删除迁移改变）。
- `obj.icon` 存在时走 `validatePageIcon`，非法 400。
- 其余 merge 语义不变（保留 `createTime`，刷新 `modifyTime`）。

### 4.5 错误码

| code | 场景 |
| --- | --- |
| 400 | 标题超长、图标非法、body 缺字段 |
| 401 | `pathid` / `secondcode` 无效 |
| 403 | 页面不在本人 `pageUUIDList` |
| 404 | 页面目录 / `page.jsonc` 不存在 |
| 409 | 删最后一页、`updatePageOrder` 集合不一致 |
| 500 | 磁盘 IO、用户文件写入失败 |

## 5. 服务端实现

`server/stores/pages.ts`：

- 新增 `addPage(input: { title: string; icon?: string }): [PageType, any]`，复用 `writePage`。
- 新增 `deletePage(uuid): [void, any]`：`fs.rmSync(dir, { recursive: true, force: true })` + 清 `pageCache`。
- 路由层在 `server/routes/pageApi.ts` 绑定四个 handler；业务校验集中在 `server/utils/pageIcon.ts`（见 `6.3）。

## 6. 图标系统

### 6.1 生成器

`scripts/gen-page-icons.mjs`：

- 从 `@vicons/<pkg>/es/<Icon>.js` 导入（根路径 default 是 `{default: Comp}`，不可用）；
- `createSSRApp + h(Comp) + renderToString`（`vue/server-renderer` 已在依赖树）；
- `normalize`：去掉未引用的 `xmlns:xlink`，补 `aria-hidden="true" focusable="false"`；
- 输出 `src/assets/page-icons.json`：`{ [id]: { from: "tabler/Home", svg: "<svg …>" } }`。
- 语义名到包内名的别名表（Chart / Zap / Chess / Life / Log / Network / Pie / Scroll / Seed / Trending / Zoom 无同名），生成器内维护 `ALIAS`。
- 生成结果**提交进仓库**，不在 `pnpm build` 时跑，避免构建依赖 `node_modules` 版本。
- 规模：≥120 个，覆盖 6 个包（tabler / carbon / material / fluen / ionicons4 / ionicons5）；gzip ≈ 8–12 KB。

### 6.2 选择器数据

- SVG：`src/assets/page-icons.json` 全量网格，v1 不做搜索、分类、最近使用。
- emoji：`src/assets/page-symbols.ts` 导出 ≥48 个常用 emoji。
- 单字：同文件导出 ≥24 个常用汉字（首页 / 工作 / 工具 / 书签…）。
- 允许「不设图标」。

### 6.3 服务端校验 `validatePageIcon`

1. 类型为 string，长度 1–4096。
2. 非 `<` 开头：`Array.from(s).length <= 4`，且不含 `<` `>` `&` 与控制字符。
3. `<` 开头：单根 `<svg…</svg>`；标签白名单 `svg / g / path / circle / rect / line / polyline / polygon / ellipse`；属性白名单 `viewBox / fill / stroke / stroke-* / d / points / cx / cy / r / x / y / width / height / rx / ry / transform / opacity / fill-rule / clip-rule / aria-hidden / focusable`；出现 `script / foreignObject / use / image / style / href / xlink:href / on*` 任一即拒绝。
4. 拒绝返回原因字符串，路由转 400。

> 校验器是安全边界：`v-html` 走 `innerHTML`，`<img onerror>` 会执行；不能只靠 UI 选择器限制输入。

### 6.4 渲染

```vue
<n-icon v-if="isSvgIcon(icon)" size="20" :color="active ? primary : undefined">
  <span v-html="icon" />
</n-icon>
<span v-else class="navEmoji" :aria-hidden="true">{{ icon }}</span>
```

- `v-html` 只用于已通过服务端校验的 SVG；文本分支用插值，永不 `v-html`。
- `n-icon` 给 `1em` 尺寸，`svg{display:block}`；emoji 18px 视觉对齐。
- 每项按钮 `aria-label` = 标题；图标区 `aria-hidden`，避免重复朗读。

### 6.5 许可证

新增 `THIRD-PARTY-NOTICES.md`：tabler / fluent / ionicons4 / ionicons5 / antd = MIT，carbon / material = Apache-2.0；`@vicons` 包内无 LICENSE / NOTICE，声明须自行携带（fluentui 上游有 NOTICE，需随附）。

## 7. 组件结构

```
home.vue
└─ NavBar.vue                 # 底栏：布局、滑动、tablist 语义
   └─ NavManagerDrawer.vue    # 管理抽屉（C）
      ├─ PageEditModal.vue    # 新增 / 编辑共用
      │  └─ IconPicker.vue    # 三标签页：SVG / emoji / 单字
      └─ ConfirmDelete        # n-popconfirm 或 n-dialog
```

新增文件：

| 文件 | 职责 |
| --- | --- |
| `src/components/NavBar.vue` | 渲染按钮、均分/20%、渐隐、滚入视野、键盘 |
| `src/components/NavManagerDrawer.vue` | 预览 + 列表 + 新增，即时保存与回滚 |
| `src/components/PageEditModal.vue` | 标题 + 图标 + 校验 |
| `src/components/IconPicker.vue` | 三标签页网格 |
| `src/composables/useNavScroll.ts` | `can-left/right`、`ensureVisible`、resize 防抖 |
| `src/utils/pageIcon.ts` | `isSvgIcon`、客户端预校验 |
| `server/utils/pageIcon.ts` | `validatePageIcon` |

`src/stores/data.ts` 增加四个 action：`addPage / deletePage / updatePage / updatePageOrder`，统一「快照 → 调接口 → 成功落列表 / 失败回滚 + toast」。

## 8. 布局与滚动

```css
.bottom {
  height: calc(50px + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  margin-top: 5px;
  border-top: 1px solid var(--n-border-color);
}
.navWrap { position: relative; }
.nav {
  height: 50px;
  max-width: 640px;
  margin: 0 auto;
  display: flex;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}
.nav.is-scroll { scroll-snap-type: x proximity; }
.navBtn {
  flex: 0 0 auto;
  width: calc(100% / var(--nav-count, 3));
  min-width: 0;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  scroll-snap-align: start;
  border: 0;
  background: transparent;
}
.nav.is-scroll .navBtn { width: 20%; }
.navBtn .label {
  font-size: 10px;
  line-height: 1.2;
  max-width: 100%;
  padding: 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.navBtn::after {
  content: "";
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 16px;
  height: 2px;
  margin-left: -8px;
  border-radius: 1px;
  background: var(--n-primary-color);
  opacity: 0;
  transition: opacity 0.15s;
}
.navBtn[aria-selected="true"]::after { opacity: 1; }
.navWrap::before,
.navWrap::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 16px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 1;
}
.navWrap::before { left: 0; background: linear-gradient(90deg, var(--n-color), transparent); }
.navWrap::after { right: 0; background: linear-gradient(270deg, var(--n-color), transparent); }
.navWrap.can-left::before,
.navWrap.can-right::after { opacity: 1; }
```

规则：

- `n = pageList.length`；`n <= 5` 时 `--nav-count: n`，`>5` 时加 `.is-scroll` 且每项 `20%`。
- **删除** `min-width:90px`；否则 390px × 5 项 = 450px，未超 5 也溢出。
- 标题单行省略，不设最小可读宽度；按钮加 `title` 与 `aria-label`。
- >5 时左右渐隐 16px，仅在对应方向还有内容时出现；不显示滚动条。
- 滚入视野：active 变化后 `nextTick`，若按钮不完全可见则居中；首屏用 `behavior:"auto"`，其后 `prefers-reduced-motion` 为真用 `auto`，否则 `smooth`；`resize` 150ms 防抖；用户手动滑动不抢。
- 居中算法用 `scrollLeft` 计算，避免 `scrollIntoView` 连带纵向滚动页面。

## 9. 导航管理（C 方案）

- **入口**：工具栏第 7 个圆按钮（「导航管理」），图标 `ListSettings` 一类；抽屉打开时按钮高亮。
- **抽屉**：桌面 `max-width:640px` 居中、`max-height:80vh`；手机贴底全宽、最大 `90vh`，内部滚动。
- **三段**：
  1. 实时预览：1:1 复刻底栏（同 `NavBar` 只读），当前页高亮。
  2. 列表：每行图标 + 标题 + 上移 / 下移 / 编辑 / 删除；当前页带「当前」标记；首行禁用上移、末行禁用下移。
  3. 新增页面按钮；仅 1 页时删除禁用并 tooltip。
- **即时保存**：每个动作立即调接口；该行操作期间禁用并 loading；失败回滚快照 + toast；`updatePageOrder` 409 时整表重拉。
- **删除**：二次确认回显标题；删当前页先切到后一页、否则前一页，再调接口。
- **状态**：初次骨架行；空态不可能出现（至少 1 页）；错误条 + 重试。

## 10. 无障碍

- 底栏 `role="tablist"`，按钮 `role="tab"` + `aria-selected` + `aria-controls="page-panel"`；页面容器 `role="tabpanel"` + `aria-labelledby`。
- roving `tabindex`：选中项 0，其余 -1；`←/→/Home/End` 移动并激活。
- 管理抽屉 `role="dialog"` `aria-modal="true"`，焦点圈定，`Esc` 关闭；打开时焦点落在标题或新增按钮。
- 所有图标按钮有 `aria-label`；预览区 `aria-hidden="true"`。

## 11. 主题

- 选中态：SVG / 单字用 `currentColor` = `--n-primary-color`；emoji 无法改色，靠标题变色 + 2px 底部指示条表达选中。
- 指示条与渐隐统一用主题变量，暗色主题下实测对比度。
- 不改变未选中 emoji 的原色。

## 12. 边界与验收

| # | 场景 | 期望 |
| --- | --- | --- |
| 1 | 存量 3 页 | 渲染与现状一致，位置/图标不变 |
| 2 | 新增空标题 | 保存为「新页面」 |
| 3 | 3–5 页 | 每项 `100%/n`，390px 无横向溢出 |
| 4 | 6 页 | 每项 20%，可横滑，右缘渐隐；滚到末尾左缘渐隐 |
| 5 | 1920px 宽屏 | 底栏内容 640px 居中，背景通栏 |
| 6 | 删除唯一页 | 按钮禁用；服务端 409 兜底 |
| 7 | 删除当前页 | 自动切到后一页（无则前一页） |
| 8 | 删除默认页 | `isDefault` 迁移到后一页（无则前一页） |
| 9 | 上移/下移并刷新 | 顺序持久化 |
| 10 | 保存中途断网 | 列表回滚快照，toast 报错，无半写状态 |
| 11 | 非法图标（`<script>` / `onerror` / 超长） | 400，磁盘无变化 |
| 12 | emoji 图标 | 文本插值显示，颜色跟随主题文字色 |
| 13 | 键盘 | Tab 进入 tablist，←/→ 切换页面并滚入视野 |
| 14 | 抽屉 | Esc 关闭、焦点不逃逸、遮罩点击关闭 |
| 15 | 390px 宽 5 项长标题 | 单行省略，不撑破布局 |

## 13. 测试计划

- **单测（vitest）**：`validatePageIcon` 合法/非法矩阵（`<script>`、`onerror=`、`href`、`use`、超长、0 码点、5 码点、控制字符）；`ensureVisible` 纯函数化的居中目标；`updatePageOrder` 集合校验。
- **存储测试**：临时 `DATA_DIR` 下 `addPage → deletePage` 目录生命周期、`isDefault` 迁移、回滚路径。
- **接口测试**：四个 handler 的 400/403/404/409。
- **手工**：390px / 768px / 1920px 三档 + 暗色主题 + iOS Safari 边缘返回手势。

## 14. 实施顺序

1. 后端：`updatePageOrder` 注册表 + 四个 handler + `validatePageIcon` + 单测（无 UI 即可验收）。
2. 图标：生成器 + `page-icons.json` + `page-symbols.ts` + 许可声明。
3. `NavBar.vue` 抽取 + 布局/滚动（删除 `min-width:90px`）。
4. `NavManagerDrawer.vue` + `PageEditModal.vue` + `IconPicker.vue`。
5. 无障碍与主题收口。
6. 验收清单逐条过。

## 15. 已定默认

| 原模糊项 | 决定 | 理由 |
| --- | --- | --- |
| 移动端系统手势冲突 | 不拦截；`overscroll-behavior-x: contain`；仅 n>5 时可横滑；左侧 20px 内 iOS 返回手势优先 | 导航在底部 50px，冲突面小；拦截边缘手势的收益低于代价 |
| 键盘与 tablist 语义 | `role=tablist/tab` + roving tabindex + ←/→/Home/End | 原生 tab 语义即可满足，无需自定义快捷键 |
| 亮暗主题图标一致性 | 选中 = 主色 + 2px 底指示条；emoji 不改色 | emoji 是彩色位图，染色不可靠；指示条对所有类型统一 |
| 新增页复制当前页内容 | v1 不做 | 保持 `addPage` 契约最小；需要时新开 effort |

## 16. Out of scope

- 拖拽排序（移动端与滚动冲突）。
- 图标上传、网址抓 favicon、粘贴任意 SVG。
- 底栏外观主题（背景 / 字体 / 圆角）自定义。
- 多用户并发编辑页面顺序（当前单用户、LWW）。
- 新增页复制当前页内容。

## 17. 参考

- 原型：`prototype/nav-manager.html`（`?v=C`）。
- 图标调研：`.reasonix/memories/page-icons-research.md`（分支 `research/page-icons`）。
- 接口 / 布局 / 管理三份 resolution 在各票评论区。
