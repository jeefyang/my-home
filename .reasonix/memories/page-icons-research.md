# 页面图标的来源与渲染契约

> research 票 #2（wayfinder:research）。实测环境：node v22.20.0 / pnpm 11.25.0 / Windows(MSYS)，@vicons 0.13.0，vue 3.5.35，naive-ui 2.44.1。结论行末的 `文件:行` 即一手证据。

## 结论速览

1. **取 SVG 字符串最省事的路线是「构建期 SSR」**：用依赖树里已有的 `vue/server-renderer` 把 `@vicons/<pkg>/es/<Icon>.js` 的默认导出渲染成字符串，产物落成 JSON 提交进仓库；@vicons 包里没有 raw `.svg`（`find node_modules/@vicons -name '*.svg'` = 0），运行时渲染又浪费 CPU，两者都不选。
2. **体积可接受**：精选 120 个图标 = 51.2 KB raw / **8.2 KB gzip** / 7.0 KB brotli（均值 485 B/个）；142 个 = 77.2 KB / 12.1 KB gzip。静态 JSON 直接进包是合理的，按图标集拆 6 个动态 chunk 只省首屏、不省总字节。
3. **许可证全部允许随源码分发**：tabler/fluent/ionicons/antd 为 MIT，carbon/material 为 Apache-2.0；但 **@vicons 各包里没有任何 LICENSE/COPYING/NOTICE 文件**，必须由我们自己带一份第三方声明。
4. **判别用「前缀 `<`」而不是新增 `iconType`**：现有 `PageType.icon` 只可能是 SVG（initPages.js:16/23/34 全是 `<svg …>`），前缀判断零迁移、渲染分支一行；`iconType` 只能作为将来的可选提示字段。
5. **「只允许选择器产物 + emoji」不足以自动免疫 v-html**：`v-html` 走 `innerHTML`（vue.esm-browser.js:11563-11568），MDN 明确 `<script>` 不执行但 `<img onerror>` 会执行；必须同时做（a）emoji 分支用文本插值、（b）写入侧结构白名单校验、（c）不允许 `foreignObject/on*/use href/image href`。

## 0. 现有契约（不要重复调查，这里只固定证据）

| 事实 | 证据 |
| --- | --- |
| 页面图标 = `PageType.icon?: string`，存整段 SVG | `types/index.d.ts:53-69` |
| 渲染：`<n-icon size="18" :color="…"><span v-html="item.icon"></span></n-icon>`，仅当 `item.icon` 为真 | `src/layout/home.vue:10-13`（v-html 在 :12，全仓唯一一处 v-html） |
| 默认图标是 ionicons4 序列化形状（`xmlns`+`xmlns:xlink`+`viewBox="0 0 512 512"`+`path fill="currentColor"`） | `src/utils/initPages.js:16`、`:23`、`:34` |
| 持久化无校验：`updatePage(uuid, obj)` 直接 `{...page, ...obj}` 写盘 | `server/stores/pages.ts:127-142`（merge 在 :134），API 形状见 `common/apis/page.ts:14` |
| `ItemOptionType.icon`（`types/index.d.ts:85-89`）**不是**同一契约：它是图片 URL，喂给 `<n-image :src>` | `src/layout/page.vue:19`，`getItemIcon` :214-223，`getItemAbsIcon` :232+ |
| 目前没有「页面级图标」编辑器，PageConfigModal 只有 item 的 title/icon | `src/components/PageConfigModal.vue:179-183` |

> 结论：图标选择器只应写 `PageType.icon`；不要碰 `ItemOptionType.icon`，否则会把 SVG 塞进 `n-image` 的 src。

## 1. 从 @vicons 取 SVG 字符串（Q1）

### 三条路线实测

| 路线 | 可行性 | 结论 |
| --- | --- | --- |
| 包内 raw `.svg` 文件 | ✗ 不存在 | `@vicons/*` 只发编译后的组件，`find node_modules/@vicons -name '*.svg'` 计数 0；`Pkg/<Name>.js` 是 CJS 渲染函数，`Pkg/es/<Name>.js` 是 ESM，属性全部内联在 `createElementBlock` 里 |
| 运行时渲染（浏览器里 `h(Icon)`+`innerHTML`） | ✓ 但要挂载/卸载 | 每个图标多一次 VNode→DOM→字符串，选择器一屏 120 个就是 120 次挂载；且拿不到稳定字符串做 diff |
| **构建期 SSR（推荐）** | ✓ 无新依赖 | `vue/server-renderer` 已在依赖树：`node_modules/.pnpm/vue@3.5.35_*/node_modules/vue/server-renderer/index.js`，直接 `import { renderToString } from 'vue/server-renderer'` |

### 最小可复现脚本

实测脚本（本次调查用过的就是这段，去掉统计后即为生成器）：

```js
// scripts/gen-page-icons.mjs  —— node scripts/gen-page-icons.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const CATA = {
  tabler:   ['Home', 'Settings', /* … */],
  carbon:   ['Home', /* … */],
  material: ['HomeOutlined', /* … */],
}
const out = {}
for (const [pkg, names] of Object.entries(CATA)) {
  const dir = fs.realpathSync(path.join('node_modules', '@vicons', pkg))
  for (const n of names) {
    // 关键：import es/ 而不是包根，否则 default 是 { default: Component }
    const mod = await import(pathToFileURL(path.join(dir, 'es', n + '.js')).href)
    const html = await renderToString(createSSRApp({ render: () => h(mod.default) }))
    out[n] = { from: pkg + '/' + n, svg: normalize(html) }
  }
}
fs.writeFileSync('src/assets/page-icons.json', JSON.stringify(out))

function normalize(svg) {
  // 1) 去掉从未被引用的 xmlns:xlink（7 个包里 `grep xlink:href` = 0，约省 48 B/个）
  // 2) 补可访问性：SSR 产物没有 role/aria-*
  return svg
    .replace(/\s+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/, '')
    .replace('<svg ', '<svg aria-hidden="true" focusable="false" ')
}
```

### 坑（全部实测）

1. **CJS/ESM 双 default**：`import('@vicons/tabler/Home.js')` 的 `default` 是 `{ default: Component }`（根目录文件是 CJS，`exports.default = defineComponent(...)`）；`import('@vicons/tabler/es/Home.js')` 的 `default` 才是组件本身。生成器只从 `es/` 取。
2. **不要从 barrel 导入**：`<pkg>/es/index.js` 把全量图标再导出（tabler = 1518 行），dev 下会让 Vite 预构建全量扫描，生产依赖 tree-shaking 兜底，没必要冒险。
3. **SSR 属性固定为三项**：`xmlns`、`xmlns:xlink`、`viewBox`；没有 `width/height`（各集合 viewBox 尺寸不同：tabler 24、antd 1024、ionicons4 512…），也**没有 `role`、`aria-hidden`、`focusable`** —— 前者由 n-icon 的 CSS 兜住，后两者要自己补。
4. **颜色是 `currentColor`**：所有 7 个包渲染出来都是 `fill="currentColor"`（tabler 是 `stroke="currentColor" fill="none"`），所以 `n-icon :color` 生效（home.vue:10 已用它做 active 高亮）；别在生成期把颜色固化成 `#000`。
5. **尺寸靠 CSS**：`.n-icon{width:1em;height:1em;fill:currentColor}`、`.n-icon svg{width:1em;height:1em}`（`node_modules/naive-ui/es/icon/src/styles/index.cssr.mjs:6-24`），`n-icon` 根元素另外带 `role="img"`（`node_modules/naive-ui/es/icon/src/Icon.mjs:83`）。
6. **属性顺序稳定**：Vue 把 svg 属性 hoist 成常量、子节点顺序即源文件顺序，所以同一版本重复生成是字节级稳定的，可以放心把 JSON 提交进仓库做 diff。
7. **统计口径**：`Buffer.byteLength(html)` 才是落盘字节；`html.length` 在含中文 label 时不可比。

## 2. 体积与引入方式（Q2）

### 单图标大小（每包随机抽 100 个，SSR 字节）

| 包 | 图标总数 | 100 个合计 | 均值 | 最小/最大 |
| --- | --- | --- | --- | --- |
| tabler | 1520 | 37.1 KB | 380 B | 233 / 588 |
| material | 10557 | 42.4 KB | 434 B | — |
| carbon | 1900 | 52.1 KB | 534 B | — |
| ionicons5 | 1334 | 60.3 KB | 618 B | — |
| fluent | 10072 | 62.3 KB | 638 B | 1911 |
| antd | 791 | 72.3 KB | 740 B | 2306 |
| ionicons4 | 698 | 80.8 KB | 827 B | — |

### 精选集合（`{label: {from, svg}}` JSON）

| 集合 | 个数 | raw | gzip | brotli |
| --- | --- | --- | --- | --- |
| 需求上限 | 120 | **51.2 KB** | **8.2 KB** | 7.0 KB |
| 本次候选（153 个名字命中 142） | 142 | 77.2 KB | 12.1 KB | 10.3 KB |
| 规范化后（去 xlink + 补 aria） | 142 | 76.5 KB | 12.1 KB | — |

- 均值 485 B/图标；规范化不省字节（省下的 48 B/个被 `aria-hidden="true" focusable="false"` 吃回去），**规范化的理由是合法性与 a11y，不是体积**。
- 参照系：现有 `dist/client/assets` 合计 1.1 MB，最大单个 chunk `BookmarkItem` 124 KB。120 个图标 51.2 KB raw ≈ 最大 chunk 的 41%，gzip 后 8.2 KB。

### 引入方式

- **静态 JSON（推荐）**：`import PAGE_ICONS from '@/assets/page-icons.json'`，8.2 KB gzip 常驻。若选择器本身是懒加载组件（弹窗/抽屉），放进去就只随弹窗 chunk 走，零额外成本。
- **按集合动态 import（可选）**：拆成 7 个 JSON，gzip 分别为 tabler 5.5 KB(127)、carbon 2.0(18)、material 0.8(7)、antd 0.9(3)、fluent 0.7(2)、ionicons5 1.1(6)，合计 ≈11 KB —— 比整体 12.1 KB 还略大（每个 chunk 有自己的 wrapper），只买到「首屏不加载」，代价是分类切换多一次 RTT。**只有当你确实要「分类 tab 懒加载」时才拆**。
- 不建议把图标写进 TS 常量再用模板字符串拼装：JSON 可被 `JSON.parse` 直接复用（选择器、生成器、测试三方共享同一份数据），且 diff 可读。

### 选图标时的可用性事实

153 个语义名里有 11 个在 7 个集合中**全都没有**同名图标：`Chart / Zap / Chess / Life / Log / Network / Pie / Scroll / Seed / Trending / Zoom`。生成器要做同义词映射（如 ChartBar / ChartPie / Bolt / Activity / Link / Grid…），否则「80–120 个精选」会静默缩水。

## 3. 许可证（Q3）

`@vicons/*/package.json` 的 `license` 字段 + 上游 LICENSE 原文（本次全部 HTTP 200 实取）：

| 包 | package.json license | 上游许可证文件 | 版权行 |
| --- | --- | --- | --- |
| @vicons/tabler | MIT | https://github.com/tabler/tabler-icons/blob/main/LICENSE | Copyright (c) 2020-2026 Paweł Kuna |
| @vicons/fluent | MIT | https://github.com/microsoft/fluentui-system-icons/blob/main/LICENSE | Copyright (c) 2020 Microsoft Corporation |
| @vicons/ionicons4 | MIT | https://github.com/ionic-team/ionicons/blob/main/LICENSE | Copyright (c) 2015-present Ionic |
| @vicons/ionicons5 | MIT | 同上 | 同上 |
| @vicons/antd | MIT | https://github.com/ant-design/ant-design-icons/blob/master/LICENSE | Copyright (c) 2018-present Ant UED |
| @vicons/carbon | `Apache 2.0`（非 SPDX 写法） | https://github.com/carbon-design-system/carbon/blob/main/LICENSE | Apache License 2.0 |
| @vicons/material | `Apache 2.0`（非 SPDX 写法） | https://github.com/google/material-design-icons/blob/master/LICENSE | Apache License 2.0 |

关键事实：

- **@vicons 各包内没有任何 LICENSE / COPYING / NOTICE 文件**（`find` 只命中 `License.js` 之类的图标文件名，如 `tabler/License.js`），所以「随 node_modules 自带声明」不成立，必须我们自己在仓库里放第三方声明文件（例如 `.reasonix/memories/` 同级或 `THIRD-PARTY-LICENSES.md`），列出每个集合的版权行 + 许可证全文/链接。
- MIT 与 Apache-2.0 都允许随源码分发与修改后的再分发。Apache-2.0 额外要求保留版权/归属声明、随分发附带许可证副本；若上游有 NOTICE 需一并保留 —— 实测 carbon、material-design-icons、tabler、ionicons 仓库根都没有 NOTICE（404），fluentui-system-icons 有 `NOTICE`（第三方材料声明）。
- 只抽取图标 **path 数据**重新序列化成 SVG 属于「复制 + 修改」，仍受原许可证约束；不能因为「只是一段路径」就当成无版权。**若要求零归属负担，唯一做法是自己画。**

## 4. 判别方式：SVG 还是 emoji（Q4）

### 现状与候选

- 现有数据：`PageType.icon` 里只存在 SVG 字符串（`initPages.js:16/23/34`），没有任何 emoji 历史数据；写入无校验（`server/stores/pages.ts:134`），所以线上可能有用户手改过的任意字符串。
- 需求：选出来的图标值要么是「选择器产物的 SVG」，要么是 emoji/单字。

| 方案 | 写法 | 迁移 | 渲染分支 | 缺点 |
| --- | --- | --- | --- | --- |
| **A. 前缀判断（推荐）** | `const isSvg = v.trimStart().startsWith('<')` | 0 | `isSvg ? v-html : {{ v }}` | 语义靠约定；非 SVG 的标记字符串会走文本分支（安全侧） |
| B. 新增 `iconType: 'svg' \| 'text'` | 字段+值 | 旧数据全部缺字段 → 仍要回退到 A | 三分支 | 增加一个可被写错的真值来源；API/存档/备份都要同步 |
| C. 存 catalog id（`tabler/Home`）+ emoji | 渲染时查表 | 旧 SVG 数据要么迁移要么走 A 回退 | 查表 + 回退 | XSS 面最小（值里不可能有标签），但 initPages 与存量页面都要迁移 |

**推荐 A**，理由：

1. 存量数据的形状已经天然二分（`<` 开头 = SVG），不需要迁移脚本，也不需要给老用户页面补字段；
2. 渲染分支最小：`home.vue:12` 一处三元即可，回退语义安全（判错只会把 SVG 当文本显示，不会把文本当 HTML 执行）；
3. `iconType` 的唯一价值是「显式意图」，可以在**将来**作为可选字段加上，但必须先有 A 的兜底，否则老数据无法解释；
4. C 是长期最干净的形态（值不可注入），但要求改 `initPages.js` 的 3 处默认值 + 所有存量页面，且要处理「服务端没有图标目录」的校验问题 —— 作为后续演进，不作为本次起点。

配套判断函数（建议放 `src/utils/icon.ts`）：

```ts
export const isSvgIcon = (v?: string) => !!v && v.trimStart().startsWith('<')
```

## 5. 只允许「选择器产物 + emoji」够不够（Q5）

### 链条证据

1. `v-html` 的实现就是把字符串塞进 `innerHTML`：`node_modules/vue/dist/vue.esm-browser.js:11563-11568` —— `if (key === "innerHTML" || key === "textContent") el[key] = key === "innerHTML" ? unsafeToTrustedHTML(value) : value`。`unsafeToTrustedHTML` 是 Trusted Types 钩子，不是净化。
2. MDN「Security considerations」原文：*"…property does prevent `<script>` elements from executing when they are injected, it is susceptible to many other ways… the following example would execute the code in the error event handler, because the `<img>` src value is not a valid image URL"*（https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML#security_considerations）。即：**`<script>` 不执行 ≠ 安全**，`onerror/onload` 一类属性照样执行。
3. Vue 官方对 `v-html` 的安全注记：*"Dynamically rendering arbitrary HTML on your website can be very dangerous… Only use v-html on trusted content and never on user-provided content."*（https://vuejs.org/api/built-in-directives.html#v-html）
4. CSP 兜不住：`server/index.ts:31-48` 只在 HTTPS 用默认 `helmet()`；HTTP 局域网分支把 `script-src` 设为 `["'self'", "'unsafe-inline'"]`（`server/index.ts:41`），内联事件处理器与内联脚本都在白名单内。`server/routes/api.ts:28` 的 `default-src 'none'; sandbox` 只作用于 API 响应，不保护页面。

### 因此必须同时覆盖的边界

- **emoji 文本里的 HTML 字符**：`<`、`>`、`&`、引号。emoji 分支必须用 `{{ icon }}`（文本节点），**不能**复用 v-html —— 否则 `<3` 会被当成标签起始，`&` 会触发实体解析。同理，emoji 允许的最长字符数要限制（例如 `[...v].length <= 4`），防止整段文字混进图标位。
- **SVG 内部的活内容**：`<script>`（innerHTML 下惰性，但不要依赖）、`on*` 事件属性、`<foreignObject>`（可套 HTML）、`<use href="data:…">`、`<image href="https://…">`（外链/追踪/借图片解析绕 CSP）、`<a href="javascript:…">`、`<style>`/`style="…url(…)"`（可破坏整页样式或做 CSS 注入）。
- **结构面**：单个图标字符串长度上限（实测最大 2306 B，取 4 KB 上限足够）、根元素必须是单一 `<svg>`、不允许注释与 CDATA（mXSS 常见载体）、`viewBox` 必须是数值。
- **写入面（真正的边界）**：`updatePage` 现在完全不校验（`server/stores/pages.ts:127-142`），任何已认证客户端都能 PUT 任意 `icon`。所以「只允许选择器产物」必须落成**服务端校验**，而不是只靠 UI 只给两个按钮。

### 建议的校验（无新依赖）

```ts
const SVG_ICON = /^<svg\b[^>]*\bviewBox="[\d.\s-]+"[^>]*>(?:(?!<\/svg>)[\s\S])*<\/svg>$/i
const FORBIDDEN = /<(script|foreignObject|use|image|style|iframe|object|embed)\b|\son[a-z]+\s*=|javascript:|data:text\/html/i
function validIcon(v: string) {
  if (v.length > 4096) return false
  if (!v.trimStart().startsWith('<')) return [...v].length <= 4 && !/[<>]/.test(v)  // emoji/单字
  return SVG_ICON.test(v) && !FORBIDDEN.test(v)
}
```

正则白名单不是完美净化器（SVG 语法太活），但它把「UI 之外的一切输入」挡在门外；配合「选择器只产出自己 JSON 里的字符串」这一事实，攻击面就只剩「已认证用户给自己页面写标签」，与当前应用「每个用户可任意编辑自己页面」的权限模型一致。

## 6. 推荐落地方案

1. `scripts/gen-page-icons.mjs`：从 `@vicons/<pkg>/es/<Name>.js` SSR 出 SVG，规范化（去 `xmlns:xlink`、补 `aria-hidden="true" focusable="false"`），写 `src/assets/page-icons.json`（`{label: {from, svg}}`）。产物提交进仓库，构建期不再跑 @vicons —— **@vicons 只保留为 devDependency，产物是普通 JSON**。
2. `IconPicker.vue`：内置 80–120 个精选（分类 tab），输出两种值 —— 选中图标 → 对应 SVG 字符串；emoji 输入 → 原样文本（校验长度与字符）。
3. 渲染：`home.vue:12` 改成 `isSvgIcon(item.icon) ? v-html : 文本插值`；emoji 分支可加 `font-size`/`line-height` 微调。
4. 写入：`updatePage` 服务端调用第 5 节的 `validIcon`，失败返回 400 且不落盘。
5. 声明：新增 `THIRD-PARTY-LICENSES.md`（7 个集合的版权行 + MIT/Apache-2.0 全文），因为 node_modules 里没有任何 LICENSE 文件。

## 7. 未解决 / 待验证

- **打包体积未能实机复核**：`pnpm exec vite build` 在本机被沙箱拦在 `[plugin externalize-deps] Error: spawn EPERM`（vite 的 `optimizeSafeRealPathSync` 需要 spawn），所以「8.2 KB gzip 进主包后首屏实际增长」只有 JSON 静态测量，没有构建后 chunk 数字。拿到构建权限后应复核一次 `dist/client/assets` 增量。
- **`@vicons` 里 11 个语义缺口**需要产品侧确认同义词映射（见 §2 末尾）。
- `iconType` 是否需要作为可选字段进入 `PageType`（SSOT 层面显式化）留待实现票决定；research 的结论是「A 够用，B 可选、非必需」。
