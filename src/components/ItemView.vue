<template>
    <div>
        <lazyComponent :item="props.item" :display="props.display"></lazyComponent>
    </div>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { ItemRouterList } from "@common/utils/itemRouterouterList";
import { defineAsyncComponent, ref } from "vue";

const dataStore = useDataStore();

const props = defineProps<{
    item: ItemType;
    display: ItemDisplayType;
}>();

const lazyComponent = defineAsyncComponent(() => import(`@/items/${ItemRouterList[props.item.type].component}/index.vue`));
</script>
<style lang="css" scoped></style>
