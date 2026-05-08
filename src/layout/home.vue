<template>
    <n-flex style="gap: 0; width: 100%; height: 100%" vertical>
        <div style="flex: 1">
            <span>收藏夹收藏夹</span>
        </div>
        <div class="bottom">
            <div class="bottomBtn" v-for="item in dataStore.pageList" :key="item.uuid">
                {{ item.title }}
            </div>
        </div>
    </n-flex>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { computed, onMounted } from "vue";

const dataStore = useDataStore();

onMounted(() => {});
</script>
<style scoped>
.bottom {
    height: 50px;
    flex-flow: nowrap;
    overflow-x: auto;
    gap: 0;
    display: flex;
    scrollbar-width: none;
}

.bottomBtn {
    flex: 1;
    min-width: 90px;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
}
</style>
