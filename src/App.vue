<template>
    <!-- @vue-ignore -->
    <n-config-provider :theme="darkTheme ? darkThemePreset : undefined" style="height: 100%" :theme-overrides="dataStore.themeOverrides || {}">
        <n-global-style />
        <n-dialog-provider>
            <n-message-provider>
                <loading v-if="isLoading"></loading>
                <home v-else></home>
                <LoginModal v-model:show="showLogin" forceLogin></LoginModal>
            </n-message-provider>
        </n-dialog-provider>
    </n-config-provider>
</template>
<script setup lang="ts">
import { darkTheme, darkTheme as darkThemePreset } from "naive-ui";
import { onMounted, ref } from "vue";
import { itemFetch, pageFetch, toolsImgFetch, toolsUrlFetch, userFetch } from "./utils/jFetch";
import { useDataStore } from "./stores/data";
import home from "./layout/home.vue";
import Loading from "./components/Loading.vue";
import LoginModal from "./components/LoginModal.vue";

const dataStore = useDataStore();
const isLoading = ref(true);
const showLogin = ref(false);

onMounted(async () => {
    [userFetch, pageFetch, itemFetch, toolsImgFetch, toolsUrlFetch].forEach((item) => {
        item.getHeaderFn = async () => {
            return {
                "Content-Type": "application/json",
                pathid: dataStore.pathid || "",
                secondcode: dataStore.secondcode || ""
            };
        };
    });
    try {
        const userRes = await dataStore.initUser();
        if (userRes.code != 200) {
            console.log(userRes);
            showLogin.value = true;
            return;
        }
        const pageRes = await dataStore.initPages();
        if (pageRes.code != 200) {
            console.warn("初始化页面失败", pageRes);
        }
    } catch (err) {
        console.error("应用初始化失败", err);
    } finally {
        // 无论初始化成功与否都必须收起全屏 loading，否则用户会卡在启动页
        isLoading.value = false;
    }
    window.addEventListener("resize", () => {
        dataStore.resize();
    });
});
</script>
<style scoped></style>
