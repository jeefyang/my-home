<template>
    <n-flex justify="center" align="center" style="gap: 30px" class="mb-2">
        <n-button quaternary type="info" size="small"><n-icon :component="Refresh"></n-icon></n-button>
        <n-button quaternary type="info" size="small" :disabled="!!searchKey" @click="toAdd"><n-icon :component="AddComment"></n-icon></n-button>
        <n-button quaternary type="info" size="small" :disabled="!!searchKey"><n-icon :component="DocumentImport"></n-icon></n-button>
        <n-button quaternary type="info" size="small"><n-icon :component="Edit"></n-icon></n-button>
        <n-button quaternary type="info" size="small"><n-icon :component="Settings"></n-icon></n-button>
    </n-flex>
    <n-input placeholder="请输入搜索" clearable @change="updateSearch"></n-input>
    <template v-if="filterData.length > 0">
        <n-flex vertical>
            <n-card v-for="item in filterData" :key="item.uuid">
                <div>{{ item.title }}</div>
            </n-card>
        </n-flex>
    </template>
    <template v-else>
        <n-empty class="mt-30" description="暂无书签数据"> </n-empty>
    </template>
    <x-modal v-model:show="showAdd" title="添加书签">
        <div>url:</div>
        <div class="line">
            <n-input v-model:value="addForm.url" placeholder="请输入url"></n-input>
            <n-button type="info" size="small">检测</n-button>
        </div>
        <div>标题:</div>
        <n-input v-model:value="addForm.title" placeholder="请输入网页标题"></n-input>
        <div v-if="!addForm.isFolder">图标:</div>
        <div class="line" v-if="!addForm.isFolder">
            <n-input v-model:value="addForm.icon" placeholder="接受图片url和base64"></n-input>
            <n-icon style="width: 32px" size="20" v-if="addForm.icon">
                <img :src="UrlUtils.checkImgUrl(addForm.icon, `./api/files/items/${props.item.type}-${props.item.uuid}/${dataStore.pathid}`)" class="icon" />
            </n-icon>
        </div>
        <div class="line mt-2">
            <div>是否文件夹:</div>
            <n-switch v-model:value="addForm.isFolder"></n-switch>
        </div>
        <template #footer>
            <n-flex>
                <n-button @click="showAdd = false">取消</n-button>
                <n-button type="primary">添加</n-button>
            </n-flex>
        </template>
    </x-modal>
</template>
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import type { BookmarkCollectionType, BookmarkType } from "..";
import { Edit, Refresh } from "@vicons/tabler";
import { AddComment, Settings, DocumentImport } from "@vicons/carbon";
import { itemFetch } from "@/utils/jFetch";
import { useDataStore } from "@/stores/data";
import { useMessage } from "naive-ui";
import XModal from "@/components/XModal.vue";
import { UrlUtils } from "@/utils/url";

const dataStore = useDataStore();
const msg = useMessage();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    bookmark: BookmarkType;
}>();

const emits = defineEmits(["update:bookmark"]);
const searchKey = ref("");
const filterData = ref(<BookmarkCollectionType[]>[]);
const dataList = ref(<BookmarkCollectionType[]>[]);
const showAdd = ref(false);

const modelBookmark = computed({
    get() {
        return props.bookmark;
    },
    set(val) {
        emits("update:bookmark", val);
    }
});

const addForm = reactive({
    url: "",
    title: "",
    icon: "",
    isFolder: false
});

const toAdd = () => {
    Object.keys(addForm).forEach((key) => {
        addForm[key] = "";
    });
    addForm.isFolder = false;
    showAdd.value = true;
};

const setSort = () => {
    filterData.value = [...dataList.value];
};

const updateSearch = (v: string) => {
    searchKey.value = v;
    setSort();
};

const initData = async () => {
    const res = await itemFetch.request("getItemData", { itemType: props.item.type, itemUUID: props.item.uuid, filename: `collection-${props.bookmark.uuid}.json` });
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    dataList.value = res.data ? JSON.parse(res.data) : [];
    setSort();
};

onMounted(() => {
    initData();
});
</script>
<style lang="scss" scoped></style>
