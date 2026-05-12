<template>
    <!-- @vue-ignore -->
    <n-config-provider :theme-overrides="themeOverrides" style="width: 100%; height: 100%">
        <div class="parent" ref="parentRef">
            <template v-if="curPage">
                <div v-for="group in curPage.itemGroupList" :key="group.uuid" :class="{'group_full':group.display=='fullPage'}">
                    <!-- 按钮分组  -->
                    <div v-if="group.display == 'btn'">
                        <n-card class="btnGroup group_btn mb-2">
                            <n-button type="primary" v-for="item in group.list" :key="item.uuid">{{ getItemTitle(item)
                            }}</n-button>
                        </n-card>
                    </div>

                    <!-- 图标分组 -->
                    <div v-else-if="group.display == 'icon'" style="display: flex;flex-wrap: wrap;">
                        <n-card class="group_btn mb-2">
                            <n-button type="primary" v-for="item in group.list" :key="item.uuid">{{ getItemTitle(item)
                                }}</n-button>
                        </n-card>
                    </div>

                    <!-- 自适应盒子分组 -->
                    <div v-else-if="group.display == 'box'" class="mb-2 flex flex-gap-2 flex-wrap">
                        <n-card class="group_box" v-for="item in group.list" :key="item.uuid">
                            <item-view :item="item" :pageUUID="curPage.uuid" :itemGroupUUID="group.uuid"></item-view>
                        </n-card>
                    </div>

                    <!-- 宽度盒子分组(占满屏幕宽度) -->
                    <div v-else-if="group.display == 'widthBox'" class="group_widthBox">
                        <n-card v-for="item in group.list" :key="item.uuid" class="mb-2">
                            <item-view :item="item" :pageUUID="curPage.uuid" :itemGroupUUID="group.uuid"></item-view>
                        </n-card>
                    </div>
                    <!-- 全屏分组 -->
                    <div v-else-if="group.display == 'fullPage'" class="group_full">
                        <n-card style="flex:1" v-for="item in group.list" :key="item.uuid" class="mb-2">
                            <item-view :item="item" :pageUUID="curPage.uuid" :itemGroupUUID="group.uuid"></item-view>
                        </n-card>
                    </div>
                </div>
                <float-btn v-model:x="dataStore.floatBtnX" v-model:y="dataStore.floatBtnY" is-bottom is-right
                    display-type="absolute" :parentBox="parentRef" @move-end="dataStore.save()" @tap="openOption">
                    <n-button type="primary" circle size="small">
                        <n-icon size="20" v-html="optionIcon"> </n-icon>
                    </n-button>
                </float-btn>
            </template>
        </div>
        <tool-bar :pageUUID="props.pageUUID" v-model:show="showOption"></tool-bar>
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
import ToolBar from "@/components/ToolBar.vue";

const dataStore = useDataStore();
const themeVars = useThemeVars();
const themeOverrides = ref(<GlobalThemeOverrides>null);

const optionIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" enable-background="new 0 0 512 512" xml:space="preserve"><g><path d="M299.3,376c6.2-14.1,20.3-24,36.7-24s30.5,9.9,36.7,24H448c8.8,0,16,7.2,16,16l0,0c0,8.8-7.2,16-16,16h-75.3
		c-6.2,14.1-20.3,24-36.7,24s-30.5-9.9-36.7-24H64c-8.8,0-16-7.2-16-16l0,0c0-8.8,7.2-16,16-16H299.3z"></path><path d="M139.3,240c6.2-14.1,20.3-24,36.7-24s30.5,9.9,36.7,24H448c8.8,0,16,7.2,16,16l0,0c0,8.8-7.2,16-16,16H212.7
		c-6.2,14.1-20.3,24-36.7,24s-30.5-9.9-36.7-24H64c-8.8,0-16-7.2-16-16l0,0c0-8.8,7.2-16,16-16H139.3z"></path><path d="M299.3,104c6.2-14.1,20.3-24,36.7-24s30.5,9.9,36.7,24H448c8.8,0,16,7.2,16,16l0,0c0,8.8-7.2,16-16,16h-75.3
		c-6.2,14.1-20.3,24-36.7,24s-30.5-9.9-36.7-24H64c-8.8,0-16-7.2-16-16l0,0c0-8.8,7.2-16,16-16H299.3z"></path></g></svg>`;

const parentRef = ref(<HTMLElement>null);

const showOption = ref(false);

const props = defineProps({
    pageUUID: {
        type: String,
        required: true
    }
});

const curPage = computed(() => {
    return dataStore.pageList.find((page) => page.uuid == props.pageUUID);
});

const getItemTitle = (item: ItemType): string => {
    if (item?.option?.title) {
        return item.option.title;
    }
    const data = ItemRouterList[item.type]!;
    return data?.title || "unknown";
};

const openOption = () => {
    setTimeout(() => {
        showOption.value = true;
    }, 100);
};

onMounted(async () => {
    const themeRes = await pageFetch.request("getPageData", { pageUUID: props.pageUUID, filename: "theme.json" });
    if (themeRes.code == 200) {
        themeOverrides.value = themeRes.data ? JSON.parse(themeRes.data) : {};
    }
});
</script>

<style lang="css" scoped>
.parent {
    width: 100%;
    height: 100%;
    overflow: auto;
    scrollbar-width: none;
    /* position: relative; */
    /* padding-bottom: 20px; */
}
</style>
