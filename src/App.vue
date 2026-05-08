<template>
    <n-config-provider :theme="darkTheme ? darkThemePreset : undefined" style="height: 100%;">
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
import { darkTheme, darkTheme as darkThemePreset, useMessage } from "naive-ui";
import { onMounted, ref } from "vue";
import Test from "./components/test.vue";
import { itemFetch, pageFetch, userFetch } from "./utils/jFetch";
import { useDataStore } from "./stores/data";
import loading from "./layout/loading.vue";
import home from "./layout/home.vue";

const isLoading = ref(true);

onMounted(async () => {
    const dataStore = useDataStore();
    [userFetch, pageFetch, itemFetch].forEach((item) => {
        item.getHeaderFn = async () => {
            return {
                "Content-Type": "application/json",
                pathid: dataStore.pathid,
                password: dataStore.password
            };
        };
    });
    const res = await dataStore.initUser();
    if (res.code != 200) {
        console.log(res);
        return;
    }
    isLoading.value = false;
    window.addEventListener("resize", () => {
        dataStore.resize();
    });
});
</script>
<style scoped></style>
