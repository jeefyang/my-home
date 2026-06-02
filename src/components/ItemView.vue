<template>
    <div :class="`view-${props.display}`">
        <lazyComponent :item="props.item" :pageUUID="props.pageUUID" :itemGroupUUID="props.itemGroupUUID"> </lazyComponent>
    </div>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { ItemRouterList } from "@common/utils/itemRouterouterList";
import { defineAsyncComponent, ref } from "vue";

const dataStore = useDataStore();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    display: ItemDisplayType;
}>();

const lazyComponent = defineAsyncComponent(() => import(`@/items/${ItemRouterList[props.item.type].component}/index.vue`));
</script>
<style lang="css" scoped>
.view-box {
    height: 100%;
    position: relative;
}
</style>
