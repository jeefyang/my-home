<template>
    <n-flex style="gap: 0; width: 100%; height: 100%" vertical>
        <div class="content">
            <keep-alive>
                <page v-if="currentPage" :key="dataStore.switchPageUUID" :pageUUID="dataStore.switchPageUUID"></page>
            </keep-alive>
        </div>
        <div class="bottom">
            <div class="bottomBtn" v-for="item in dataStore.pageList" :key="item.uuid" @click="switchPage(item)">
                <n-icon v-if="item.icon" size="18"
                    :color="item.uuid == dataStore.switchPageUUID ? themeVars.primaryColor : undefined">
                    <!-- @vue-ignore -->
                    <span v-html="item.icon"></span>
                </n-icon>
                <div :style="{ color: item.uuid == dataStore.switchPageUUID ? themeVars.primaryColor : undefined }">{{
                    item.title }}</div>
            </div>
        </div>
    </n-flex>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { useThemeVars } from "naive-ui";
import { computed, onMounted } from "vue";
import page from "./page.vue";

const themeVars = useThemeVars();
const dataStore = useDataStore();

const currentPage = computed(() => {
    if (!dataStore.pageList || !dataStore.pageList.length) {
        return null
    }
    return dataStore.pageList.find(
        page => page.uuid === dataStore.switchPageUUID
    )
})



const switchPage = (item: PageType) => {
    dataStore.switchPageUUID = item.uuid;
};

onMounted(() => { });
</script>
<style scoped>
.content {
    flex: 1;
    overflow: auto;
    scrollbar-width: none;
}

.bottom {
    height: 40px;
    flex-flow: nowrap;
    overflow-x: auto;
    gap: 0;
    display: flex;
    scrollbar-width: none;
    margin-top: 5px;
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
