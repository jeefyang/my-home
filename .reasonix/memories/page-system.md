# 页面管理与配置系统

## 页面结构
```
App.vue → home.vue → page.vue → ItemView.vue → {Name}Item/index.vue
             ↓
       底部 tab 切换 page
```

## 页面初始化
`dataStore.initPages()` 在 App.vue `onMounted` 中调用：
1. 如果已有 `pageUUIDList` → 调用 `getPageList` 获取已有页面
2. 如果为空 → 调用 `initPages` 从 `initPages.js` 创建默认页面
3. `initPages.js` 定义三个默认页面：收藏夹、首页（含 WWWItem）、工具

## 页面数据流
- `dataStore.pageList` — 所有页面
- `dataStore.switchPageUUID` — 当前激活页面 UUID
- 切换页面触发 `keep-alive` 重新渲染（`:key="dataStore.switchPageUUID"`）
- 用户设置保存到 `localStorage`

## ItemGroup 展示模式
`page.vue` 根据 `group.display` 使用 5 种渲染方式：
1. **btn** — `n-card` + `n-button` 按钮列表
2. **icon** — 图标按钮网格（flex-wrap）
3. **box** — 自适应宽度盒子，每项独立 n-card
4. **widthBox** — 宽度撑满，每项占整行
5. **fullPage** — 全屏，卡片占满父容器

## ItemView 动态加载
`src/components/ItemView.vue`：
```ts
const lazyComponent = defineAsyncComponent(
    () => import(`@/items/${ItemRouterList[props.item.type].component}/index.vue`)
);
```

## PageConfigModal 配置界面
`src/components/PageConfigModal.vue` 提供：
- **分组管理**：添加/删除分组，修改标题和展示类型
- **项目管理**：添加/删除元件，配置元件 option（title、icon）
- 所有 CRUD 通过 `itemFetch.request` 调用后端 API

## ToolBar 工具栏
`src/components/ToolBar.vue`：
- 底部弹出式工具栏（毛玻璃效果）
- 6 个按钮：用户设置、页面设置、项目设置、路由设置、缓存设置、登录
- 目前只有页面设置、路由设置、登录三个按钮有功能

## 页面主题配置
- 每个页面可以有自己的 `theme.json`（通过 `getPageData`/`updatePageData`）
- `page.vue` 在 `onMounted` 时加载 `theme.json` 作为 `n-config-provider` 的 `theme-overrides`
- 全局主题存储在 `data/users/{pathID}/data/themeOverrides.json`
- `src/stores/themeOverride.ts` 提供 `initThemeOverrides` 合并默认值
