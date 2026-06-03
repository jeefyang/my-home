<template>
    <XModal v-model:show="modelShow" class="pageConfigModal">
        <template #header>
            <div>页面设置</div>
        </template>
        <div class="line">
            <n-select v-model:value="cacheGroupInsetDisplay" :options="displayTypeList"></n-select>
            <n-button size="tiny" type="primary" @click="addItemGroup(cacheGroupInsetDisplay, 0)"> 插入分组 </n-button>
        </div>
        <!-- 项目组列表 -->
        <n-card v-for="(group, gindex) in curPage.itemGroupList" :key="group.uuid" :style="{ borderColor: themeVars.primaryColor }" class="mb-2">
            <n-flex vertical class="mb-2">
                <div>分组名称:</div>
                <div class="line">
                    <n-input :value="cacheGroup.title[group.uuid] == undefined ? group.title : cacheGroup.title[group.uuid]" @update:value="(v) => (cacheGroup.title[group.uuid] = v)"></n-input>
                    <n-button size="tiny" @click="updateGroupTitle(group)">更新</n-button>
                </div>
                <div>分组显示类型:</div>
                <div class="line">
                    <n-select
                        :value="cacheGroup.display[group.uuid] == undefined ? group.display : cacheGroup.display[group.uuid]"
                        :options="displayTypeList"
                        @update:value="(v) => (cacheGroup.display[group.uuid] = v)"
                    ></n-select>
                    <n-button size="tiny" @click="updateGroupDisplay(group)">更新</n-button>
                </div>
                <div class="line">
                    <n-select v-model:value="cacheGroup.insertItemType[group.uuid]" :options="selectTypeList"></n-select>
                    <n-button size="tiny" type="info" @click="addItem(group, cacheGroup.insertItemType[group.uuid], 0)"> 插入项目 </n-button>
                </div>
            </n-flex>
            <!-- 项目列表 -->
            <template v-if="group.list && group.list.length > 0">
                <n-card v-for="(item, index) in group.list" :key="item.uuid" :style="{ borderColor: themeVars.infoColor }" class="mb-2">
                    <div>类型:{{ ItemRouterList[item.type].title }}{{ ItemRouterList[item.type].desc ? `(${ItemRouterList[item.type].desc})` : "" }}</div>
                    <div>元件配置:</div>
                    <div class="line mb-2" v-for="(option, index) in cacheItem.options" :key="option.name">
                        <n-input
                            :placeholder="option.name"
                            :value="cacheItem.options[index].obj[item.uuid] == undefined ? item?.options?.[option.name] : cacheItem.options[index].obj[item.uuid]"
                            @update:value="(v) => (cacheItem.options[index].obj[item.uuid] = v)"
                        ></n-input>
                        <n-button size="tiny" @click="updateItemOption(group, item, option.name, index)">更新</n-button>
                    </div>
                    <div class="line">
                        <n-select v-model:value="cacheItem.insertItemType[item.uuid]" :options="selectTypeList"></n-select>
                        <n-button type="info" size="tiny" @click="addItem(group, cacheItem.insertItemType[item.uuid], index + 1)">追加项目</n-button>
                    </div>
                    <n-button type="error" size="tiny" @click="deleteItem(group.uuid, item)">删除项目</n-button>
                </n-card>
            </template>
            <template v-else>
                <n-empty description="快来添加项目吧"></n-empty>
            </template>
            <div class="line">
                <n-select v-model:value="cacheGroup.display[group.uuid]" :options="displayTypeList"></n-select>
                <n-button type="primary" size="tiny" @click="addItemGroup(cacheGroup.display[group.uuid], gindex + 1)">追加分组</n-button>
            </div>
            <n-button type="error" size="tiny" @click="deleteGroup(group)">删除分组</n-button>
        </n-card>
        <template #footer>
            <n-button @click="modelShow = false">返回</n-button>
        </template>
    </XModal>
</template>
<script setup lang="ts">
import { computed, onActivated, reactive, ref, watch } from "vue";
import XModal from "./XModal.vue";
import { useDataStore } from "@/stores/data";
import { ItemRouterList } from "@common/utils/itemRouterouterList";
import { itemFetch } from "@/utils/jFetch";
import { useDialog, useMessage, useThemeVars } from "naive-ui";

const dataStore = useDataStore();
const themeVars = useThemeVars();
const msg = useMessage();
const dialog = useDialog();

const props = defineProps<{
    show: boolean;
    pageUUID: string;
}>();

const emits = defineEmits(["update:show"]);

const displayTypeList: { label: string; value: ItemDisplayType }[] = [
    { label: "按钮", value: "btn" },
    { label: "盒子(宽度自适应)", value: "box" },
    { label: "盒子(宽度撑满)", value: "widthBox" },
    { label: "全页面", value: "fullPage" },
    { label: "图标", value: "icon" }
];

const selectTypeList = Object.keys(ItemRouterList)
    .filter((key) => {
        const item = ItemRouterList[key];
        return !item.isHide;
    })
    .map((key) => {
        const item = ItemRouterList[key];
        return {
            label: `${item.title}${item.desc ? `(${item.desc})` : ""}`,
            value: item.type
        };
    });

const cacheGroupInsetDisplay = ref(<ItemDisplayType>null);

const cacheGroup = reactive({
    title: {} as { [x in string]: string },
    display: {} as { [x in string]: ItemDisplayType },
    insertItemType: {} as { [x in string]: ItemDisplayType }
});

const cacheItem = reactive({
    options: [
        { name: "title", obj: {} },
        { name: "icon", obj: {} }
    ] as { name: keyof ItemOptionType; obj: { [x in string]: string } }[],

    insertItemType: {} as { [x in string]: ItemDisplayType }
});

const curPage = computed(() => {
    return dataStore.pageList.find((item) => item.uuid === props.pageUUID);
});

const modelShow = computed({
    get: () => props.show,
    set: (val) => {
        emits("update:show", val);
    }
});

const deleteGroup = async (group: ItemGroupType) => {
    await new Promise((res, rej) => {
        dialog.warning({
            title: "删除分组",
            content: "确定删除当前分组吗?",
            positiveText: "确定",
            negativeText: "取消",
            onPositiveClick: () => {
                res(undefined);
            },
            onNegativeClick: () => {
                rej();
            }
        });
    });
    dataStore.fullLoading = true;
    const res = await itemFetch.request("deleteItemGroup", { pageUUID: props.pageUUID, uuid: group.uuid });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    const index = curPage.value.itemGroupList.findIndex((g) => g.uuid == group.uuid);
    if (index != -1) {
        curPage.value.itemGroupList.splice(index, 1);
    }
    msg.success(res.msg);
};

const deleteItem = async (groupUUID: string, item: ItemType) => {
    await new Promise((res, rej) => {
        dialog.warning({
            title: "删除项目",
            content: "确定删除当前项目吗?",
            positiveText: "确定",
            negativeText: "取消",
            onPositiveClick: () => {
                res(undefined);
            },
            onNegativeClick: () => {
                rej();
            }
        });
    });
    dataStore.fullLoading = true;
    const res = await itemFetch.request("deleteItem", { pageUUID: props.pageUUID, uuid: item.uuid });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    const gindex = curPage.value.itemGroupList.findIndex((group) => group.uuid == groupUUID);
    if (gindex == -1) {
        return;
    }
    const index = curPage.value.itemGroupList[gindex].list.findIndex((c) => item.uuid == c.uuid);
    if (index == -1) {
        return;
    }
    curPage.value.itemGroupList[gindex].list.splice(index, 1);
    msg.success(res.msg);
};

const updateItemOption = async (group: ItemGroupType, item: ItemType, key: keyof ItemOptionType, i: number) => {
    if (item?.options?.[key] && cacheItem.options[i].obj[item.uuid] == item.options[key]) {
        return msg.error(`元件配置 ${key} 未修改`);
    }
    dataStore.fullLoading = true;
    const options = { ...(item.options || {}) };
    options[key] = cacheItem.options[i].obj[item.uuid];
    const res = await itemFetch.request("updateItem", { pageUUID: props.pageUUID, obj: { ...item, options: { ...options } } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    const gindex = curPage.value.itemGroupList.findIndex((c) => c.uuid == group.uuid);
    if (gindex == -1) {
        return;
    }
    const index = curPage.value.itemGroupList[gindex].list.findIndex((c) => c.uuid == item.uuid);
    if (index == -1) {
        return;
    }
    curPage.value.itemGroupList[gindex].list[index] = res.data;
    msg.success(res.msg);
};

const updateGroupTitle = async (group: ItemGroupType) => {
    if (!cacheGroup.title[group.uuid]) {
        return msg.error("请输入分组名称");
    }
    if (cacheGroup.title[group.uuid] == group.title) {
        return msg.error("分组名称未修改");
    }
    dataStore.fullLoading = true;
    const res = await itemFetch.request("updateItemGroup", { pageUUID: props.pageUUID, obj: { ...group, title: cacheGroup.title[group.uuid] } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg);
    }

    const index = curPage.value.itemGroupList.findIndex((c) => c.uuid == group.uuid);
    if (index == -1) {
        return;
    }
    curPage.value.itemGroupList[index] = res.data;
    msg.success(res.msg);
};

const updateGroupDisplay = async (group: ItemGroupType) => {
    if (!cacheGroup.display[group.uuid]) {
        return msg.error("请输入分组显示类型");
    }
    if (cacheGroup.display[group.uuid] == group.display) {
        return msg.error("分组显示类型未修改");
    }
    dataStore.fullLoading = true;

    const res = await itemFetch.request("updateItemGroup", { pageUUID: props.pageUUID, obj: { ...group, display: cacheGroup.display[group.uuid] } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg);
    }

    const index = curPage.value.itemGroupList.findIndex((item) => item.uuid == group.uuid);
    if (index == -1) {
        return;
    }
    curPage.value.itemGroupList[index] = res.data;
    msg.success(res.msg);
};

const addItemGroup = async (display: ItemDisplayType, index: number) => {
    if (!display) {
        return msg.error("请选择分组展示形式");
    }

    dataStore.fullLoading = true;

    const res = await itemFetch.request("addItemGroup", { pageUUID: props.pageUUID, obj: { display: display, title: "新建分组" }, insertIndex: index });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    curPage.value.itemGroupList.splice(index, 0, res.data);
    msg.success(res.msg);
};

const addItem = async (group: ItemGroupType, type: string, index: number) => {
    if (!type) {
        return msg.error("请选择添加项目类型");
    }
    if (!ItemRouterList[type]) {
        return msg.error("请选择正确添加项目类型");
    }
    dataStore.fullLoading = true;
    const res = await itemFetch.request("addItem", { pageUUID: props.pageUUID, itemGroupUUID: group.uuid, obj: { type: type }, insertIndex: index });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    const gindex = curPage.value.itemGroupList.findIndex((item) => item.uuid == group.uuid);
    if (gindex == -1) {
        return;
    }
    curPage.value.itemGroupList[gindex].list.splice(index, 0, res.data);
    msg.success(res.msg);
};

watch(
    () => modelShow.value,
    () => {
        cacheGroupInsetDisplay.value = null;
        for (let key in cacheGroup) {
            cacheGroup[key] = {};
        }
        for (let key in cacheItem) {
            if (key == "options") {
                for (let i in cacheItem.options) {
                    cacheItem.options[i].obj = {};
                }
            } else {
                cacheItem[key] = {};
            }
        }
    }
);
</script>
<style lang="scss" scoped>
// .pageConfigModal {}
</style>
