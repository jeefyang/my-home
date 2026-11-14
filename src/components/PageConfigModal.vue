<template>
    <XModal v-model:show="modelShow" class="pageConfigModal" title="页面设置" isItem>
        <div class="line">
            <n-select v-model:value="cacheGroupInsetDisplay" :options="displayTypeList"></n-select>
            <n-button size="tiny" type="primary" @click="addItemGroup(cacheGroupInsetDisplay, 0)"> 插入分组 </n-button>
        </div>
        <n-collapse v-model:expanded-names="cacheGroup.expandedList" :trigger-areas="['arrow', 'main']">
            <n-collapse-item v-for="(group, gindex) in groupList" :key="group.uuid" :name="group.uuid">
                <!-- 元件组列表 -->
                <n-card :style="{ borderColor: themeVars.primaryColor }" class="mb-2">
                    <n-flex vertical class="mb-2">
                        <div>分组名称:</div>
                        <div class="line">
                            <n-input
                                :value="cacheGroup.title[group.uuid!] == undefined ? group.title : cacheGroup.title[group.uuid!]"
                                @update:value="(v) => (cacheGroup.title[group.uuid!] = v)"
                            ></n-input>
                            <n-button size="tiny" @click="updateGroupTitle(group)">更新</n-button>
                        </div>
                        <div>分组显示类型:</div>
                        <div class="line">
                            <n-select
                                :value="cacheGroup.display[group.uuid!] == undefined ? group.display : cacheGroup.display[group.uuid!]"
                                :options="displayTypeList"
                                @update:value="(v) => (cacheGroup.display[group.uuid!] = v)"
                            ></n-select>
                            <n-button size="tiny" @click="updateGroupDisplay(group)">更新</n-button>
                        </div>
                        <!-- 分组样式 -->
                        <n-flex justify="space-between">
                            <div>分组样式:</div>
                            <n-button type="error" size="tiny" @click="clearGroupStyle(group)">清空</n-button>
                        </n-flex>
                        <div class="line" v-for="(styleItem, styleIndex) in cacheGroup.style" :key="styleItem.name">
                            <!-- @vue-ignore -->
                            <n-input
                                :value="styleItem.obj[group.uuid!] == undefined ? group?.style?.[styleItem.name] || '' : styleItem.obj[group.uuid!]"
                                :placeholder="`${styleItem.name} ${styleItem.desc || ''}`"
                                @update:value="(v) => (styleItem.obj[group.uuid!] = v)"
                            ></n-input>
                            <n-button size="tiny" @click="updateGroupStyle(group, styleIndex)">更新</n-button>
                        </div>
                        <!-- 插入 -->
                        <div class="line">
                            <n-select v-model:value="cacheGroup.insertItemType[group.uuid!]" :options="selectTypeList"></n-select>
                            <n-button size="tiny" type="info" @click="addItem(group, cacheGroup.insertItemType[group.uuid!], 0)"> 插入元件 </n-button>
                        </div>
                    </n-flex>
                    <!-- 元件列表 -->
                    <template v-if="group.list && group.list.length > 0">
                        <n-collapse v-model:expanded-names="cacheGroup.groupItemExpandedList[group.uuid!]" :trigger-areas="['arrow', 'main']">
                            <n-collapse-item v-for="(item, index) in group.list" :key="item.uuid" :name="item.uuid" class="mb-2" style="margin-left: 2px">
                                <n-card :style="{ borderColor: themeVars.infoColor }">
                                    <div>类型:{{ ItemRouterList[item.type]!.title }}{{ ItemRouterList[item.type]!.desc ? `(${ItemRouterList[item.type]!.desc})` : "" }}</div>
                                    <!-- 元件配置 -->
                                    <n-flex justify="space-between">
                                        <div>元件配置:</div>
                                        <n-button type="error" size="tiny" @click="clearItemOption(group, item)">清空</n-button>
                                    </n-flex>
                                    <div class="line mb-2" v-for="(option, index) in cacheItem.options" :key="option.name">
                                        <n-input
                                            :placeholder="option.name"
                                            :value="cacheItem.options[index]!.obj[item.uuid!] == undefined ? item?.options?.[option.name] : cacheItem.options[index]!.obj[item.uuid!]"
                                            @update:value="(v) => (cacheItem.options[index]!.obj[item.uuid!] = v)"
                                        ></n-input>
                                        <n-button size="tiny" @click="updateItemOption(group, item, option.name, index)">更新</n-button>
                                    </div>
                                    <!-- 元件样式 -->
                                    <n-flex justify="space-between">
                                        <div>元件样式:</div>
                                        <n-button type="error" size="tiny" @click="clearItemStyle(group, item)">清空</n-button>
                                    </n-flex>
                                    <div class="line" v-for="(styleItem, styleIndex) in cacheItem.style" :key="styleItem.name">
                                        <!-- @vue-ignore -->
                                        <n-input
                                            :value="styleItem.obj[item.uuid!] == undefined ? item?.style?.[styleItem.name] || '' : styleItem.obj[item.uuid!]"
                                            :placeholder="`${styleItem.name} ${styleItem.desc || ''}`"
                                            @update:value="(v) => (styleItem.obj[item.uuid!] = v)"
                                        ></n-input>
                                        <n-button size="tiny" @click="updateItemStyle(group, item, styleItem.name, styleIndex)">更新</n-button>
                                    </div>
                                    <!-- 追加元件 -->
                                    <div class="line">
                                        <n-select v-model:value="cacheItem.insertItemType[item.uuid!]" :options="selectTypeList"></n-select>
                                        <n-button type="info" size="tiny" @click="addItem(group, cacheItem.insertItemType[item.uuid!], index + 1)">追加元件</n-button>
                                    </div>
                                    <n-button type="error" size="tiny" @click="deleteItem(group.uuid!, item)">删除元件</n-button>
                                </n-card>
                                <template #header>
                                    {{ item?.options?.title || ItemRouterList[item.type]!.title }}
                                </template>
                                <template #header-extra>
                                    <n-flex>
                                        <n-button size="tiny" @click="expendedFn(true, group)">元件全展开</n-button>
                                        <n-button size="tiny" @click="expendedFn(false, group)">元件全折叠</n-button>
                                    </n-flex>
                                </template>
                            </n-collapse-item>
                        </n-collapse>
                    </template>
                    <template v-else>
                        <n-empty description="快来添加元件吧"></n-empty>
                    </template>
                    <div class="line mt-2">
                        <n-select v-model:value="cacheGroup.display[group.uuid!]" :options="displayTypeList"></n-select>
                        <n-button type="primary" size="tiny" @click="addItemGroup(cacheGroup.display[group.uuid!], gindex + 1)">追加分组</n-button>
                    </div>
                    <n-button type="error" size="tiny" @click="deleteGroup(group)">删除分组</n-button>
                </n-card>
                <template #header>
                    {{ group.title }}
                </template>
                <template #header-extra>
                    <n-flex>
                        <n-button size="tiny" @click="expendedFn(true)">分组全展开</n-button>
                        <n-button size="tiny" @click="expendedFn(false)">分组全折叠</n-button>
                    </n-flex>
                </template>
            </n-collapse-item>
        </n-collapse>
        <template #footer>
            <n-button @click="modelShow = false">返回</n-button>
        </template>
    </XModal>
</template>
<script setup lang="ts">
import { computed, onActivated, reactive, ref, watch, type CSSProperties } from "vue";
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

const selectTypeList = Object.entries(ItemRouterList)
    .filter(([, item]) => {
        return !item.isHide;
    })
    .map(([, item]) => {
        return {
            label: `${item.title}${item.desc ? `(${item.desc})` : ""}`,
            value: item.type
        };
    });

const cacheGroupInsetDisplay = ref<ItemDisplayType | null>(null);

const cacheGroup = reactive({
    title: {} as { [x in string]: string },
    display: {} as { [x in string]: ItemDisplayType },
    insertItemType: {} as { [x in string]: ItemDisplayType },
    style: [
        { name: "max-height", desc: "容器最大高度", obj: {} },
        { name: "min-width", desc: "容器最大宽度", obj: {} }
    ] as { name: keyof CSSProperties; obj: { [x in string]: string }; desc?: string }[],
    expandedList: [] as string[],
    groupItemExpandedList: {} as { [x in string]: string[] }
});

const cacheItem = reactive({
    options: [
        { name: "title", obj: {} },
        { name: "icon", obj: {} }
    ] as { name: keyof ItemOptionType; obj: { [x in string]: string } }[],
    style: [
        { name: "max-height", desc: "容器最大高度", obj: {} },
        { name: "min-width", desc: "容器最大宽度", obj: {} }
    ] as { name: keyof CSSProperties; obj: { [x in string]: string }; desc?: string }[],
    insertItemType: {} as { [x in string]: ItemDisplayType }
});

const curPage = computed(() => {
    return dataStore.pageList.find((item) => item.uuid === props.pageUUID);
});

/** 当前页面下的分组列表；页面不存在时为空数组，保证模板访问安全 */
const groupList = computed(() => {
    return curPage.value?.itemGroupList ?? [];
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
    const res = await itemFetch.request("deleteItemGroup", { pageUUID: props.pageUUID, uuid: group.uuid! });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    const page = curPage.value!;
    const index = page.itemGroupList.findIndex((g) => g.uuid == group.uuid);
    if (index != -1) {
        page.itemGroupList.splice(index, 1);
    }
    msg.success(res.msg!);
};

const updateGroupTitle = async (group: ItemGroupType) => {
    const groupUUID = group.uuid!;
    const title = cacheGroup.title[groupUUID];
    if (!title) {
        return msg.error("请输入分组名称");
    }
    if (title == group.title) {
        return msg.error("分组名称未修改");
    }
    dataStore.fullLoading = true;
    const res = await itemFetch.request("updateItemGroup", { pageUUID: props.pageUUID, obj: { ...group, title: title } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }

    const page = curPage.value!;
    const index = page.itemGroupList.findIndex((c) => c.uuid == group.uuid);
    if (index == -1) {
        return;
    }
    page.itemGroupList[index] = res.data!;
    msg.success(res.msg!);
};

const clearGroupStyle = async (group: ItemGroupType) => {
    dataStore.fullLoading = true;
    const res = await itemFetch.request("updateItemGroup", {
        pageUUID: props.pageUUID,
        obj: { ...group, style: {} }
    });
    dataStore.fullLoading = false;

    if (res.code != 200) {
        return msg.error(res.msg!);
    }

    const page = curPage.value!;
    const index = page.itemGroupList.findIndex((item) => item.uuid == group.uuid);
    if (index == -1) {
        return;
    }
    page.itemGroupList[index] = res.data!;
    cacheGroup.style.forEach((child) => {
        delete child.obj[group.uuid!];
    });
    msg.success(res.msg!);
};
const updateGroupStyle = async (group: ItemGroupType, styleIndex: number) => {
    const style = cacheGroup.style[styleIndex]!;
    const groupUUID = group.uuid!;
    const styleValue = style.obj[groupUUID];
    if (styleValue == group?.style?.[style.name]) {
        return msg.error("分组样式未修改");
    }
    dataStore.fullLoading = true;
    const res = await itemFetch.request("updateItemGroup", {
        pageUUID: props.pageUUID,
        obj: { ...group, style: { ...(group?.style || {}), [style.name]: styleValue } }
    });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }

    const page = curPage.value!;
    const index = page.itemGroupList.findIndex((item) => item.uuid == group.uuid);
    if (index == -1) {
        return;
    }
    page.itemGroupList[index] = res.data!;
    msg.success(res.msg!);
};

const updateGroupDisplay = async (group: ItemGroupType) => {
    const groupUUID = group.uuid!;
    const display = cacheGroup.display[groupUUID];
    if (!display) {
        return msg.error("请输入分组显示类型");
    }
    if (display == group.display) {
        return msg.error("分组显示类型未修改");
    }
    dataStore.fullLoading = true;

    const res = await itemFetch.request("updateItemGroup", { pageUUID: props.pageUUID, obj: { ...group, display: display } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }

    const page = curPage.value!;
    const index = page.itemGroupList.findIndex((item) => item.uuid == group.uuid);
    if (index == -1) {
        return;
    }
    page.itemGroupList[index] = res.data!;
    msg.success(res.msg!);
};

const addItemGroup = async (display: ItemDisplayType | null | undefined, index: number) => {
    if (!display) {
        return msg.error("请选择分组展示形式");
    }

    dataStore.fullLoading = true;

    const res = await itemFetch.request("addItemGroup", { pageUUID: props.pageUUID, obj: { display: display, title: "新建分组" }, insertIndex: index });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    const page = curPage.value!;
    page.itemGroupList.splice(index, 0, res.data!);
    msg.success(res.msg!);
};

const clearItemStyle = async (group: ItemGroupType, item: ItemType) => {
    dataStore.fullLoading = true;
    const res = await itemFetch.request("updateItem", { pageUUID: props.pageUUID, obj: { ...item, style: {} } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    const page = curPage.value!;
    const gindex = page.itemGroupList.findIndex((c) => c.uuid == group.uuid);
    if (gindex == -1) {
        return;
    }
    const groupItem = page.itemGroupList[gindex]!;
    const index = groupItem.list.findIndex((c) => c.uuid == item.uuid);
    if (index == -1) {
        return;
    }
    groupItem.list[index] = res.data!;
    cacheItem.style.forEach((child) => {
        delete child.obj[item.uuid!];
    });
    msg.success(res.msg!);
};
const updateItemStyle = async (group: ItemGroupType, item: ItemType, key: keyof CSSProperties, i: number) => {
    const cacheStyle = cacheItem.style[i]!;
    const itemUUID = item.uuid!;
    if (item?.style?.[key] && cacheStyle.obj[itemUUID] == item.style[key]) {
        return msg.error(`元件配置 ${key} 未修改`);
    }
    dataStore.fullLoading = true;
    const style = { ...(item.style || {}) };
    // @ts-expect-error
    style[key] = cacheStyle.obj[itemUUID];
    const res = await itemFetch.request("updateItem", { pageUUID: props.pageUUID, obj: { ...item, style: { ...style } } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    const page = curPage.value!;
    const gindex = page.itemGroupList.findIndex((c) => c.uuid == group.uuid);
    if (gindex == -1) {
        return;
    }
    const groupItem = page.itemGroupList[gindex]!;
    const index = groupItem.list.findIndex((c) => c.uuid == item.uuid);
    if (index == -1) {
        return;
    }
    groupItem.list[index] = res.data!;
    msg.success(res.msg!);
};

const deleteItem = async (groupUUID: string, item: ItemType) => {
    await new Promise((res, rej) => {
        dialog.warning({
            title: "删除元件",
            content: "确定删除当前元件吗?",
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
    const res = await itemFetch.request("deleteItem", { pageUUID: props.pageUUID, uuid: item.uuid! });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    const page = curPage.value!;
    const gindex = page.itemGroupList.findIndex((group) => group.uuid == groupUUID);
    if (gindex == -1) {
        return;
    }
    const groupItem = page.itemGroupList[gindex]!;
    const index = groupItem.list.findIndex((c) => item.uuid == c.uuid);
    if (index == -1) {
        return;
    }
    groupItem.list.splice(index, 1);
    msg.success(res.msg!);
};

const clearItemOption = async (group: ItemGroupType, item: ItemType) => {
    dataStore.fullLoading = true;

    const res = await itemFetch.request("updateItem", { pageUUID: props.pageUUID, obj: { ...item, options: {} } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    const page = curPage.value!;
    const gindex = page.itemGroupList.findIndex((c) => c.uuid == group.uuid);
    if (gindex == -1) {
        return;
    }
    const groupItem = page.itemGroupList[gindex]!;
    const index = groupItem.list.findIndex((c) => c.uuid == item.uuid);
    if (index == -1) {
        return;
    }
    groupItem.list[index] = res.data!;
    cacheItem.options.forEach((child) => {
        delete child.obj[item.uuid!];
    });
    msg.success(res.msg!);
};

const updateItemOption = async (group: ItemGroupType, item: ItemType, key: keyof ItemOptionType, i: number) => {
    const cacheOption = cacheItem.options[i]!;
    const itemUUID = item.uuid!;
    if (item?.options?.[key] && cacheOption.obj[itemUUID] == item.options[key]) {
        return msg.error(`元件配置 ${key} 未修改`);
    }
    dataStore.fullLoading = true;
    const options = { ...(item.options || {}) };
    options[key] = cacheOption.obj[itemUUID];
    const res = await itemFetch.request("updateItem", { pageUUID: props.pageUUID, obj: { ...item, options: { ...options } } });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    const page = curPage.value!;
    const gindex = page.itemGroupList.findIndex((c) => c.uuid == group.uuid);
    if (gindex == -1) {
        return;
    }
    const groupItem = page.itemGroupList[gindex]!;
    const index = groupItem.list.findIndex((c) => c.uuid == item.uuid);
    if (index == -1) {
        return;
    }
    groupItem.list[index] = res.data!;
    msg.success(res.msg!);
};

const addItem = async (group: ItemGroupType, type: ItemDisplayType | undefined, index: number) => {
    if (!type) {
        return msg.error("请选择添加元件类型");
    }
    if (!ItemRouterList[type]) {
        return msg.error("请选择正确添加元件类型");
    }
    dataStore.fullLoading = true;
    const res = await itemFetch.request("addItem", { pageUUID: props.pageUUID, itemGroupUUID: group.uuid!, obj: { type: type }, insertIndex: index });
    dataStore.fullLoading = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    const page = curPage.value!;
    const gindex = page.itemGroupList.findIndex((c) => c.uuid == group.uuid);
    if (gindex == -1) {
        return;
    }
    page.itemGroupList[gindex]!.list.splice(index, 0, res.data!);
    msg.success(res.msg!);
};

const expendedFn = (turn: boolean, group?: ItemGroupType) => {
    if (!group) {
        if (!turn) {
            cacheGroup.expandedList = [];
            return;
        }
        cacheGroup.expandedList = groupList.value.map((item) => item.uuid!);

        return;
    }
    const groupUUID = group.uuid!;
    if (!turn) {
        cacheGroup.groupItemExpandedList[groupUUID] = [];
        return;
    }
    cacheGroup.groupItemExpandedList[groupUUID] = group.list.map((item) => item.uuid!);
    return;
};

watch(
    () => modelShow.value,
    () => {
        cacheGroupInsetDisplay.value = null;
        cacheGroup.title = {};
        cacheGroup.display = {};
        cacheGroup.insertItemType = {};
        cacheGroup.style.forEach((child) => {
            child.obj = {};
        });
        cacheGroup.expandedList = groupList.value.map((item) => item.uuid!);
        cacheGroup.groupItemExpandedList = {};
        for (const group of groupList.value) {
            cacheGroup.groupItemExpandedList[group.uuid!] = group.list.map((item) => item.uuid!);
        }
        cacheItem.options.forEach((child) => {
            child.obj = {};
        });
        cacheItem.style.forEach((child) => {
            child.obj = {};
        });
        cacheItem.insertItemType = {};
    }
);
</script>
<style lang="scss" scoped>
// .pageConfigModal {}
</style>
