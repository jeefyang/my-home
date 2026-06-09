<template>
    <!-- @vue-ignore -->
    <n-config-provider :theme-overrides="themeOverrides" style="width: 100%; height: 100%">
        <div class="parent" ref="parentRef">
            <template v-if="curPage">
                <div v-for="group in curPage.itemGroupList" :key="group.uuid" :class="{ group_full_parent: group.display == 'fullPage' }">
                    <!-- 按钮分组  -->
                    <div v-if="group.display == 'btn'" class="mb-2 group_btn">
                        <n-card class="btnGroup group_btn mb-2" content-class="flex flex-gap-1 flex-wrap width-100">
                            <n-button type="primary" v-for="item in group.list" :key="item.uuid" @click="toItem(group, item)">{{ getItemTitle(item) }}</n-button>
                        </n-card>
                    </div>

                    <!-- 图标分组 -->
                    <div v-else-if="group.display == 'icon'" class="mb-2 group_icon">
                        <n-card class="btnGroup group_btn mb-2" content-class="flex flex-gap-1 flex-wrap width-100">
                            <n-flex class="width-43px mb-2"  vertical align="center" style="gap:0" v-for="item in group.list" :key="item.uuid">
                                <n-button tertiary type="primary" circle @click="toItem(group, item)" style="overflow: hidden">
                                    <n-image preview-disabled v-if="getItemIcon(item)" :src="getItemAbsIcon(item)"></n-image>
                                    <div v-else>{{ getItemTitle(item)[0] }}</div>
                                </n-button>
                                <n-ellipsis style="max-width: 43px">
                                    {{ getItemTitle(item) }}
                                </n-ellipsis>
                            </n-flex>
                        </n-card>
                    </div>

                    <!-- 自适应盒子分组 -->
                    <div v-else-if="group.display == 'box'" class="mb-2 flex flex-gap-2 flex-wrap">
                        <n-card class="group_box" v-for="item in group.list" :key="item.uuid" content-class="group_box_content">
                            <item-view :item="item" :pageUUID="curPage.uuid" :itemGroupUUID="group.uuid" :display="group.display"></item-view>
                        </n-card>
                    </div>

                    <!-- 宽度盒子分组(占满屏幕宽度) -->
                    <div v-else-if="group.display == 'widthBox'" class="group_widthBox" style="height: 100%; display: flex; flex-direction: column">
                        <n-card v-for="item in group.list" :key="item.uuid" class="mb-2" style="height: 100%; display: flex; flex-direction: column; overflow: hidden">
                            <item-view
                                :item="item"
                                :pageUUID="curPage.uuid"
                                :itemGroupUUID="group.uuid"
                                :display="group.display"
                                style="height: 100%; display: flex; flex-direction: column"
                            ></item-view>
                        </n-card>
                    </div>
                    <!-- 全屏分组 -->
                    <div v-else-if="group.display == 'fullPage'" class="group_full">
                        <n-card style="flex: 1; display: flex; flex-direction: column; overflow: auto" v-for="item in group.list" :key="item.uuid" content-class="group_full_content">
                            <item-view
                                :item="item"
                                :pageUUID="curPage.uuid"
                                :itemGroupUUID="group.uuid"
                                :display="group.display"
                                style="height: 100%; display: flex; flex-direction: column"
                            ></item-view>
                        </n-card>
                    </div>
                </div>
                <float-btn
                    v-model:x="dataStore.floatBtnX"
                    v-model:y="dataStore.floatBtnY"
                    is-bottom
                    is-right
                    display-type="absolute"
                    :parentBox="parentRef"
                    @move-end="dataStore.save()"
                    @tap="openOption"
                >
                    <n-button type="primary" circle size="small">
                        <n-icon size="20" :component="IosOptions"> </n-icon>
                    </n-button>
                </float-btn>
            </template>
        </div>
        <tool-bar :pageUUID="props.pageUUID" v-model:show="showOption"></tool-bar>
    </n-config-provider>
    <x-modal v-model:show="showItem" :maskClosable="false" display-directive="show" :title="getItemTitle(selectItem)" titleClass="fs-12 fw-bold" :isScroll="false">
        <keep-alive :max="10">
            <component
                v-if="selectItem?.uuid"
                :is="ItemView"
                :key="selectItem.uuid"
                :item="selectItem"
                :pageUUID="curPage.uuid"
                :itemGroupUUID="selectGroup.uuid"
                :display="selectGroup.display"
                style="height: 100%; display: flex; flex-direction: column"
            ></component>
        </keep-alive>
    </x-modal>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { pageFetch } from "@/utils/jFetch";
import { ItemRouterList } from "@common/utils/itemRouterouterList";
import { useThemeVars, type GlobalThemeOverrides } from "naive-ui";
import { computed, defineAsyncComponent, KeepAlive, onMounted, ref, watch } from "vue";
import ItemView from "@/components/ItemView.vue";
import FloatBtn from "@/components/FloatBtn.vue";
import ToolBar from "@/components/ToolBar.vue";
import XModal from "@/components/XModal.vue";
import { IosOptions, IosClose } from "@vicons/ionicons4";
import { UrlUtils } from "@/utils/url";

const dataStore = useDataStore();
const themeVars = useThemeVars();
const themeOverrides = ref(<GlobalThemeOverrides>null);
const showItem = ref(false);
const selectItem = ref(<ItemType>null);
const selectGroup = ref(<ItemGroupType>null);

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

const toItem = (group: ItemGroupType, item: ItemType) => {
    selectItem.value = item;
    selectGroup.value = group;
    showItem.value = true;
};

const getItemTitle = (item: ItemType): string => {
    if (!item) {
        return "";
    }
    if (item?.options?.title) {
        return item.options.title;
    }
    const data = ItemRouterList[item.type]!;
    return data?.title || "unknown";
};

const getItemIcon = (item: ItemType): string => {
    if (!item) {
        return "";
    }
    if (item?.options?.icon) {
        return item.options.icon;
    }
    const data = ItemRouterList[item.type]!;
    return data?.icon || "";
};

const openOption = () => {
    setTimeout(() => {
        showOption.value = true;
    }, 100);
};

const getItemAbsIcon = (item: ItemType): string => {
    const url = getItemIcon(item);
    if (!url) {
        return "";
    }
    const data = ItemRouterList[item.type]!;
    return UrlUtils.checkImgUrl(url, `/items/${data.component}`);
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
    position: relative;
    top: 0;
    padding: 5px;
    /* padding-bottom: 20px; */
}
</style>
