<template>
    <div :class="`view-${props.display}`">
        <component :is="lazyComponent" :item="props.item" :pageUUID="props.pageUUID" :itemGroupUUID="props.itemGroupUUID" :display="props.display" />
    </div>
</template>
<script lang="ts">
// 在模块作用域创建一个缓存池，避免重复定义相同组件
import { defineAsyncComponent } from "vue";
import { ItemRouterList } from "@common/utils/itemRouterouterList";

const asyncComponentCache: Record<string, any> = {};

function getAsyncComponent(type: string) {
    if (!asyncComponentCache[type]) {
        asyncComponentCache[type] = defineAsyncComponent(() => import(`@/items/${ItemRouterList[type].component}/index.vue`));
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
const lazyComponent = computed(() => getAsyncComponent(props.item.type));
</script>
<style lang="css" scoped>
.view-box {
    height: 100%;
    position: relative;
}
</style>
