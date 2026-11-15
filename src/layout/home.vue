<template>
    <n-flex style="gap: 0; width: 100%; height: 100%" vertical>
        <div class="content">
            <keep-alive :max="5">
                <page v-if="currentPage" :key="dataStore.switchPageUUID" :pageUUID="dataStore.switchPageUUID"></page>
            </keep-alive>
        </div>
        <NavBar :pages="dataStore.pageList" :model-value="dataStore.switchPageUUID" @select="switchPage" />
    </n-flex>
    <loading v-if="dataStore.fullLoading" :title="dataStore.fullLoadingTitle"></loading>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { computed, onMounted } from "vue";
import page from "./page.vue";
import Loading from "@/components/Loading.vue";
import NavBar from "@/components/NavBar.vue";

const dataStore = useDataStore();

const currentPage = computed(() => {
    if (!dataStore.pageList || !dataStore.pageList.length) {
        return null;
    }
    return dataStore.pageList.find((page) => page.uuid === dataStore.switchPageUUID);
});

const switchPage = (item: PageType) => {
    if (item.uuid === dataStore.switchPageUUID) {
        return;
    }
    dataStore.switchPageUUID = item.uuid;
    dataStore.save();
};

onMounted(() => {});
</script>
<style scoped>
.content {
    flex: 1;
    overflow: auto;
    scrollbar-width: none;
    position: relative;
}
</style>
