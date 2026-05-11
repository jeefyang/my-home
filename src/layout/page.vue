<template>
    <!-- @vue-ignore -->
    <n-config-provider :theme-overrides="themeOverrides" style="width: 100%; height: 100%">
        <div class="parent" ref="parentRef">
            <template v-if="curPage">
                <div v-for="group in curPage.itemGroupList" :key="group.uuid">
                    <!-- 按钮分组  -->
                    <n-card v-if="group.display == 'btn'" class="btnGroup card">
                        <n-button type="primary" v-for="item in group.list" :key="item.uuid">{{ getItemTitle(item) }}</n-button>
                    </n-card>
                    <!-- 宽度盒子分组(占满屏幕宽度) -->
                    <n-card v-else-if="group.display == 'widthBox'" class="widthBoxGroup" style="width: 100%">
                        <item-view v-for="item in group.list" :key="item.uuid" :item="item" :pageUUID="curPage.uuid" :itemGroupUUID="group.uuid"></item-view>
                    </n-card>
                    <float-btn v-model:x="floatBtnX" v-model:y="floatBtnY" is-bottom :scale="1" is-right display-type="absolute" :parentBox="parentRef">
                        <div>123</div>
                    </float-btn>
                </div>
            </template>
        </div>
    </n-config-provider>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { pageFetch } from "@/utils/jFetch";
import { ItemRouterList } from "@common/utils/itemRouterouterList";
import { useThemeVars, type GlobalThemeOverrides } from "naive-ui";
import { computed, defineAsyncComponent, onMounted, ref, watch } from "vue";
import ItemView from "@/components/ItemView.vue";
import FloatBtn from "@/components/FloatBtn.vue";

const dataStore = useDataStore();
const themeVars = useThemeVars();
const themeOverrides = ref(<GlobalThemeOverrides>null);

const floatBtnX = ref(0);
const floatBtnY = ref(0);

const parentRef = ref(<HTMLElement>null);

const curPage = ref(<PageType>null);

const getItemTitle = (item: ItemType): string => {
    if (item?.option?.title) {
        return item.option.title;
    }
    const data = ItemRouterList[item.type]!;
    return data?.title || "unknown";
};

const initPage = async () => {
    const index = dataStore.pageList.findIndex((item) => item.uuid == dataStore.switchPageUUID);
    curPage.value = dataStore.pageList[index];
    const themeRes = await pageFetch.request("getPageData", { pageUUID: curPage.value.uuid, filename: "theme.json" });
    if (themeRes.code == 200) {
        themeOverrides.value = themeRes.data ? JSON.parse(themeRes.data) : {};
    }
};

onMounted(() => {
    watch(
        () => dataStore.switchPageUUID,
        (v) => {
            initPage();
        },
        { immediate: true }
    );
});
</script>

<style lang="css" scoped>
.parent {
    width: 100%;
    height: 100%;
    overflow: auto;
    scrollbar-width: none;
    position: relative;
}
</style>
