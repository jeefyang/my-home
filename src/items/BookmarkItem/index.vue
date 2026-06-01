<template>
    <div v-if="dataList && dataList.length > 0">
        <n-tabs :bar-width="28" type="line" class="custom-tabs" v-model:value="switchTab">
            <template #prefix>
                <n-button size="tiny" quaternary type="primary" @click="refreshCurrent">
                    <n-icon :component="IosRefresh"></n-icon>
                </n-button>
            </template>

            <n-tab-pane v-for="(bookmark, index) in dataList" :key="bookmark.uuid" :name="bookmark.uuid">
                <template #tab>
                    <n-dropdown trigger="click" :options="getTabMenu(bookmark)" :show="dropdownOpen === bookmark.uuid" @update:show="v => { if(!v) dropdownOpen = '' }" @select="(key) => { onTabMenuSelect(key, bookmark, index); dropdownOpen = '' }">
                        <span style="cursor: context-menu; user-select: none; display: inline-block; padding: 0 4px" @contextmenu.prevent="dropdownOpen = bookmark.uuid">
                            {{ bookmark.title }}
                        </span>
                    </n-dropdown>
                </template>
                <SingleBookmarkItem
                    :item="props.item"
                    :pageUUID="props.pageUUID"
                    :itemGroupUUID="props.itemGroupUUID"
                    v-model:bookmark="dataList[index]"
                    :refresh-key="refreshKey"
                />
            </n-tab-pane>

            <template #suffix>
                <n-button size="tiny" quaternary type="primary" @click="toAddBookmark">
                    <n-icon :component="Add12Filled"></n-icon>
                </n-button>
            </template>
        </n-tabs>
    </div>

    <n-flex v-else style="width: 100%; height: 100%; position: absolute; top: 0" align="center" justify="center">
        <n-empty>
            <n-flex vertical>
                <div>快添加新的收藏夹吧</div>
                <n-button type="primary" @click="toAddBookmark">添加收藏夹</n-button>
            </n-flex>
        </n-empty>
    </n-flex>

    <!-- 重命名弹窗 -->
    <x-modal v-model:show="showRename" title="重命名收藏夹">
        <n-input v-model:value="renameValue" placeholder="请输入新名称" @keyup.enter="confirmRename"></n-input>
        <template #footer>
            <n-flex justify="end">
                <n-button @click="showRename = false">取消</n-button>
                <n-button type="primary" @click="confirmRename">确认</n-button>
            </n-flex>
        </template>
    </x-modal>

    <!-- 删除确认弹窗 -->
    <x-modal v-model:show="showDelete" title="删除收藏夹">
        <p>确定要删除收藏夹「{{ deleteTarget?.title }}」吗？<br>其中的所有书签数据将被永久删除。</p>
        <template #footer>
            <n-flex justify="end">
                <n-button @click="showDelete = false">取消</n-button>
                <n-button type="error" @click="confirmDelete">确认删除</n-button>
            </n-flex>
        </template>
    </x-modal>
</template>

<script setup lang="ts">
import { Add12Filled } from "@vicons/fluent";
import { IosRefresh } from "@vicons/ionicons4";
import type { BookmarkType } from ".";
import { h, ref, onMounted } from "vue";
import SingleBookmarkItem from "./components/SingleBookmarkItem.vue";
import { itemFetch } from "@/utils/jFetch";
import { useMessage } from "naive-ui";
import { nanoid } from "nanoid";
import { useDataStore } from "@/stores/data";
import XModal from "@/components/XModal.vue";

const dataStore = useDataStore();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
}>();

const dataList = ref(<BookmarkType[]>[]);
const filename = "bookmarkList.json";
const switchTab = ref("");
const refreshKey = ref(0);
const dropdownOpen = ref("");

const msg = useMessage();

// 重命名
const showRename = ref(false);
const renameValue = ref("");
const renameTarget = ref<BookmarkType | null>(null);

// 删除
const showDelete = ref(false);
const deleteTarget = ref<BookmarkType | null>(null);

const getMaxSortid = () => {
    let id = 0;
    dataList.value.forEach((item) => {
        if (id <= item.sortid) {
            id = item.sortid + 1;
        }
    });
    return id;
};

/** 刷新当前标签页内容 */
const refreshCurrent = () => {
    refreshKey.value++;
    msg.success("已刷新");
};

/** 添加新收藏夹 */
const toAddBookmark = async () => {
    const uuid = nanoid(10);
    const now = Date.now();
    const list: BookmarkType[] = [
        { title: "新建收藏夹", uuid, sortid: getMaxSortid(), creatTime: now, modifyTime: now },
        ...dataList.value
    ];

    const res = await itemFetch.request("updateItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename,
        content: JSON.stringify(list)
    });
    if (res.code != 200) return msg.error(res.msg);
    dataList.value = list;
    switchTab.value = uuid;
    return msg.success("添加成功");
};

/** 保存当前 dataList 到 API */
const saveDataList = async () => {
    const res = await itemFetch.request("updateItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename,
        content: JSON.stringify(dataList.value)
    });
    return res.code === 200;
};

/** Tab 右键菜单选项 */
const getTabMenu = (bookmark: BookmarkType) => {
    return [
        { label: "置前", key: "moveFirst", icon: () => h("span", "⬆️") },
        { label: "重命名", key: "rename", icon: () => h("span", "✏️") },
        { label: "删除", key: "delete", icon: () => h("span", "🗑️") }
    ];
};

/** Tab 菜单选择 */
const onTabMenuSelect = (key: string, bookmark: BookmarkType, index: number) => {
    if (key === "rename") {
        renameTarget.value = bookmark;
        renameValue.value = bookmark.title;
        showRename.value = true;
    } else if (key === "delete") {
        deleteTarget.value = bookmark;
        showDelete.value = true;
    } else if (key === "moveFirst") {
        // 移到第一位并设为默认
        dataList.value = dataList.value.filter(item => item.uuid !== bookmark.uuid);
        dataList.value.forEach(item => item.isDefault = false);
        bookmark.isDefault = true;
        dataList.value.unshift(bookmark);
        saveDataList();
        switchTab.value = bookmark.uuid;
        msg.success("已置前");
    }
};

/** 确认重命名 */
const confirmRename = async () => {
    if (!renameValue.value.trim()) return msg.warning("名称不能为空");
    if (!renameTarget.value) return;
    renameTarget.value.title = renameValue.value.trim();
    renameTarget.value.modifyTime = Date.now();
    const ok = await saveDataList();
    if (!ok) return msg.error("保存失败");
    showRename.value = false;
    msg.success("重命名成功");
};

/** 确认删除 */
const confirmDelete = async () => {
    if (!deleteTarget.value) return;
    const uuid = deleteTarget.value.uuid;

    // 删除对应的书签数据文件
    await itemFetch.request("deleteItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename: `collection-${uuid}.json`
    }).catch(() => {});

    dataList.value = dataList.value.filter(item => item.uuid !== uuid);
    const ok = await saveDataList();
    if (!ok) return msg.error("保存失败");

    if (switchTab.value === uuid) {
        switchTab.value = dataList.value[0]?.uuid || "";
    }
    showDelete.value = false;
    msg.success("已删除");
};

/** 初始化 */
const init = async () => {
    const res = await itemFetch.request("getItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename
    });
    if (res.code != 200) return msg.error(res.msg);
    dataList.value = res.data ? JSON.parse(res.data) : [];
    const index = dataList.value.findIndex((item) => item.isDefault);
    switchTab.value = index != -1 ? dataList.value[index].uuid : (dataList.value[0]?.uuid || "");
};

onMounted(() => {
    init();
});
</script>

<style lang="scss" scoped>
:deep(.n-tabs .n-tabs-nav__prefix) {
    padding-right: 0 !important;
    margin-right: 4px;
}
:deep(.n-tabs .n-tabs-nav__suffix) {
    padding-left: 0 !important;
    margin-left: 4px;
}
</style>
