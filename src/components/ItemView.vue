<template>
    <div :class="`view-${props.display}`">
        <component :is="lazyComponent" :item="props.item" :pageUUID="props.pageUUID" :itemGroupUUID="props.itemGroupUUID" :display="props.display" />
    </div>
</template>
<script lang="ts">
// 在模块作用域创建一个缓存池，避免重复定义相同组件
import { defineAsyncComponent, h } from "vue";
import { ItemRouterList } from "@common/utils/itemRouterouterList";

const asyncComponentCache: Record<string, any> = {};

/** 轻量占位组件：加载中 / 加载失败 / 未知类型 */
function createFallback(text: string) {
    return {
        name: "ItemFallback",
        render: () => h("div", { class: "item-fallback" }, text)
    };
}

function getAsyncComponent(type: string) {
    if (!asyncComponentCache[type]) {
        const target = ItemRouterList[type];
        if (!target || !target.component) {
            // 配置里出现未注册的类型时给出占位，不能让整页渲染失败
            console.warn("未知的元件类型:", type);
            asyncComponentCache[type] = createFallback(`未知元件类型：${type || "空"}`);
        } else {
            asyncComponentCache[type] = defineAsyncComponent({
                loader: () => import(`@/items/${target.component}/index.vue`),
                loadingComponent: createFallback("加载中..."),
                errorComponent: createFallback("元件加载失败"),
                delay: 150,
                timeout: 15000
            });
        }
    }
    return asyncComponentCache[type];
}
</script>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { computed } from "vue";

const dataStore = useDataStore();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    display: ItemDisplayType;
}>();

// 使用 computed 获取真正的异步组件
const lazyComponent = computed(() => getAsyncComponent(props.item?.type));
</script>
<style lang="css" scoped>
.view-box {
    height: 100%;
    position: relative;
}
.item-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    min-height: 32px;
    font-size: 12px;
    opacity: 0.6;
}
</style>
