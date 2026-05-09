<template>
    <!-- @vue-ignore -->
    <n-config-provider :theme="darkTheme ? darkThemePreset : undefined" style="height: 100%" :theme-overrides="dataStore.themeOverrides || {}">
        <n-global-style />
        <n-dialog-provider>
            <n-message-provider>
                <loading v-if="isLoading"></loading>
                <home v-else></home>
            </n-message-provider>
        </n-dialog-provider>
    </n-config-provider>
</template>
<script setup lang="ts">
import { darkTheme, darkTheme as darkThemePreset } from "naive-ui";
import { onMounted, ref } from "vue";
import { itemFetch, pageFetch, userFetch } from "./utils/jFetch";
import { useDataStore } from "./stores/data";
import loading from "./layout/loading.vue";
import home from "./layout/home.vue";
const dataStore = useDataStore();
const isLoading = ref(true);

onMounted(async () => {
    [userFetch, pageFetch, itemFetch].forEach((item) => {
        item.getHeaderFn = async () => {
            return {
                "Content-Type": "application/json",
                pathid: dataStore.pathid,
                password: dataStore.password
            };
        };
    });
    const userRes = await dataStore.initUser();
    if (userRes.code != 200) {
        console.log(userRes);
        return;
    }
    const pageRes = await dataStore.initPages();
    if (pageRes.code != 200) {
        console.log(pageRes);
        return;
    }
    // setTimeout(() => {
    // isLoading.value = false;

    // }, 10000);
    isLoading.value = false;
    window.addEventListener("resize", () => {
        dataStore.resize();
    });
});
</script>
<style scoped></style>
