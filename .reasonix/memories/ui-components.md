# UI 组件系统

## XModal 通用弹窗
`src/components/XModal.vue` — 基于 `n-modal` + `n-card` 封装的通用弹窗：
- Props: `show`, `title`, `contentMaxHeight`, `maskClosable`
- Slots: `header`, default, `footer`
- 通过 `v-model:show` 双向绑定

## FloatBtn 悬浮按钮
`src/components/FloatBtn.vue` — 功能丰富的悬浮按钮组件：

### 功能介绍
- **拖动**：长按触发拖动模式（`isScale` + `isOpacity` 视觉反馈）
- **吸附**：支持四边吸附，`adsorbLeft/Right/Top/Bottom`、`adsorbPadding`、`adsorbDistance`
- **触摸事件**：通过 `vue3-touch-events` 指令支持 swipe/longtap/press/tap/drag
- **显示模式**：`absolute` 或 `fixed` 定位
- **点击**：`@tap` 事件（穿透），`@dblclick` 支持
- **自动隐藏**：2秒无操作自动半透明

### 配置参数
```ts
props: parentBox, displayType, opacity, scale, x, y,
       adsorbLeft/Right/Top/Bottom, isAdsorb, forceAdsorb,
       adsorbPadding, adsorbDistance, isBottom, isRight
```

## Loading 全屏加载
`src/components/Loading.vue` — 全屏加载动画，支持 `title` prop 显示加载文字

## XDivider 分割线
`src/components/XDivider.vue` — 简化的 `n-divider`

## Touch 自定义指令
`src/directives/touch.ts` — 移动端长按指令 `vTouch`：
- 支持 `handlers.click` 和 `handlers.longpress`
- 600ms 判定长按
- 移动超过 10px 取消所有判定
- 拦截原生右键菜单和长按后 click
- 组件卸载时自动清理事件
