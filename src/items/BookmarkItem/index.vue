<template>
    <div v-if="dataList && dataList.length > 0">
        <n-tabs :bar-width="28" type="line" class="custom-tabs">
            <template #prefix>
                <n-button size="tiny" quaternary type="primary">
                    <n-icon :component="IosRefresh"></n-icon>
                </n-button>
            </template>
            <n-tab-pane v-for="(bookmark, index) in dataList" :key="bookmark.uuid" :name="bookmark.uuid" :tab="bookmark.title">
                <SingleBookmarkItem :item="props.item" :pageUUID="props.pageUUID" :itemGroupUUID="props.itemGroupUUID" v-model:bookmark="dataList[index]"></SingleBookmarkItem>
            </n-tab-pane>
            <template #suffix>
                <n-flex>
                    <n-button size="tiny" quaternary type="primary">
                        <n-icon :component="Add12Filled"></n-icon>
                    </n-button>
                </n-flex>
            </template>
        </n-tabs>
    </div>
    <n-flex v-else style="width: 100%; height: 100%; position: absolute; top: 0" align="center" justify="center">
        <n-empty style>
            <n-flex vertical>
                <div>快添加新的收藏夹吧</div>
                <n-button type="primary">添加收藏夹</n-button>
            </n-flex>
        </n-empty>
    </n-flex>
</template>
<script setup lang="ts">
import { Subtract12Filled, Add12Filled } from "@vicons/fluent";
import { IosRefresh } from "@vicons/ionicons4";
import type { BookmarkType } from ".";
import { ref, onMounted } from "vue";
import SingleBookmarkItem from "./components/SingleBookmarkItem.vue";
import { itemFetch } from "@/utils/jFetch";
import { useMessage } from "naive-ui";
import { nanoid } from "nanoid";

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
}>();

const dataList = ref(<BookmarkType[]>[]);
const filename = "bookmarkList.json";

const msg = useMessage();

const toAdd = async () => {
    const list = [...dataList.value, { title: "新建收藏夹", uuid: nanoid(10), sortid: 0 }];

    const res = await itemFetch.request("updateItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename: filename,
        content: JSON.stringify(list)
    });
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    dataList.value = list;
    return msg.success(res.msg);
};

const init = async () => {
    const res = await itemFetch.request("getItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename: filename
    });
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    dataList.value = res.data ? JSON.parse(res.data) : [];
};

onMounted(() => {
    init();
});
</script>
<style lang="scss" scoped></style>
