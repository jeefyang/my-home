<template>
    <n-drawer
        :show="show"
        placement="bottom"
        height="80%"
        :mask-closable="!busy"
        @update:show="(value: boolean) => emit('update:show', value)"
    >
        <n-drawer-content title="导航管理" closable :native-scrollbar="false">
            <div class="manager">
                <section class="section">
                    <div class="section-head">
                        <span class="section-title">预览</span>
                        <span v-if="overflow" class="section-hint">超过 5 个，可左右滑动</span>
                    </div>
                    <div class="preview-box">
                        <NavBar
                            :pages="dataStore.pageList"
                            :model-value="dataStore.switchPageUUID"
                            preview
                            @select="onPreviewSelect"
                        />
                    </div>
                </section>

                <section class="section">
                    <div class="section-head">
                        <span class="section-title">页面（{{ dataStore.pageList.length }}）</span>
                        <span class="section-hint">顺序即底部导航顺序</span>
                    </div>
                    <n-empty v-if="!dataStore.pageList.length" description="还没有页面，先添加一个吧" />
                    <div v-else class="page-list">
                        <div
                            v-for="(page, index) in dataStore.pageList"
                            :key="page.uuid"
                            class="page-row"
                            :class="{ 'is-current': page.uuid === dataStore.switchPageUUID }"
                        >
                            <span class="row-icon" aria-hidden="true">
                                <span v-if="isSvgIcon(page.icon)" class="row-svg" v-html="page.icon"></span>
                                <span v-else-if="page.icon" class="row-text">{{ page.icon }}</span>
                                <span v-else class="row-placeholder">{{ firstChar(page.title) }}</span>
                            </span>
                            <div class="row-main">
                                <div class="row-title">
                                    <span class="row-name">{{ page.title }}</span>
                                    <n-tag v-if="page.isDefault" size="tiny" :bordered="false">默认</n-tag>
                                    <n-tag v-if="page.uuid === dataStore.switchPageUUID" size="tiny" type="primary" :bordered="false">当前</n-tag>
                                </div>
                                <div class="row-sub">{{ index + 1 }} / {{ dataStore.pageList.length }}</div>
                            </div>
                            <n-flex :size="2" :wrap="false" class="row-actions">
                                <n-button
                                    quaternary
                                    circle
                                    size="small"
                                    :disabled="index === 0 || busy"
                                    aria-label="上移"
                                    title="上移"
                                    @click="move(index, -1)"
                                >
                                    <template #icon><n-icon :component="ArrowUp" /></template>
                                </n-button>
                                <n-button
                                    quaternary
                                    circle
                                    size="small"
                                    :disabled="index === dataStore.pageList.length - 1 || busy"
                                    aria-label="下移"
                                    title="下移"
                                    @click="move(index, 1)"
                                >
                                    <template #icon><n-icon :component="ArrowDown" /></template>
                                </n-button>
                                <n-button quaternary circle size="small" :disabled="busy" aria-label="编辑" title="编辑" @click="openEdit(page)">
                                    <template #icon><n-icon :component="CreateOutline" /></template>
                                </n-button>
                                <n-button
                                    quaternary
                                    circle
                                    size="small"
                                    type="error"
                                    :disabled="dataStore.pageList.length <= 1 || busy"
                                    aria-label="删除"
                                    title="删除"
                                    @click="remove(page, index)"
                                >
                                    <template #icon><n-icon :component="TrashOutline" /></template>
                                </n-button>
                            </n-flex>
                        </div>
                    </div>
                </section>
            </div>
            <template #footer>
                <n-button type="primary" block :disabled="busy" @click="openAdd">
                    <template #icon><n-icon :component="Add" /></template>
                    新增页面
                </n-button>
            </template>
        </n-drawer-content>
    </n-drawer>
    <PageEditModal v-model:show="showEdit" :page="editingPage" :saving="savingEdit" @save="saveEdit" />
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { Add, ArrowDown, ArrowUp, CreateOutline, TrashOutline } from "@vicons/ionicons5";
import NavBar from "./NavBar.vue";
import PageEditModal from "./PageEditModal.vue";
import { useDataStore } from "@/stores/data";
import { isSvgIcon } from "@/utils/pageIcon";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "update:show", value: boolean): void }>();

const dataStore = useDataStore();
const msg = useMessage();
const dialog = useDialog();

const busy = ref(false);
const showEdit = ref(false);
const savingEdit = ref(false);
const editingPage = ref<PageType | null>(null);

const overflow = computed(() => dataStore.pageList.length > 5);

const firstChar = (title: string) => Array.from(title.trim())[0] || "页";

const onPreviewSelect = (page: PageType) => {
    if (page.uuid === dataStore.switchPageUUID) {
        return;
    }
    dataStore.switchPageUUID = page.uuid;
    dataStore.save();
};

const openAdd = () => {
    editingPage.value = null;
    showEdit.value = true;
};

const openEdit = (page: PageType) => {
    editingPage.value = page;
    showEdit.value = true;
};

const saveEdit = async (payload: { title: string; icon: string }) => {
    savingEdit.value = true;
    try {
        const result = editingPage.value
            ? await dataStore.updatePage(editingPage.value.uuid, payload)
            : await dataStore.addPage(payload);
        if (!result.ok) {
            msg.error(result.msg || "保存失败");
            return;
        }
        showEdit.value = false;
        msg.success(result.msg || "已保存");
    } finally {
        savingEdit.value = false;
    }
};

const move = async (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= dataStore.pageList.length) {
        return;
    }
    const list = dataStore.pageList.slice();
    const [item] = list.splice(index, 1);
    if (!item) {
        return;
    }
    list.splice(target, 0, item);
    busy.value = true;
    try {
        const result = await dataStore.updatePageOrder(list.map((page) => page.uuid));
        if (!result.ok) {
            msg.error(result.msg || "调整顺序失败");
        }
    } finally {
        busy.value = false;
    }
};

const remove = async (page: PageType, index: number) => {
    if (dataStore.pageList.length <= 1) {
        return;
    }
    const fallback = dataStore.pageList[index + 1] ?? dataStore.pageList[index - 1];
    const content =
        page.uuid === dataStore.switchPageUUID
            ? `删除《${page.title}》后将切换到《${fallback?.title || "其他页面"}》，确定删除吗？`
            : `确定删除《${page.title}》吗？页面内的分组和元件会一并删除。`;
    const confirmed = await new Promise<boolean>((resolve) => {
        dialog.warning({
            title: "删除页面",
            content,
            positiveText: "删除",
            negativeText: "取消",
            onPositiveClick: () => resolve(true),
            onNegativeClick: () => resolve(false),
            onClose: () => resolve(false)
        });
    }).catch(() => false);
    if (!confirmed) {
        return;
    }
    busy.value = true;
    try {
        const result = await dataStore.deletePage(page.uuid);
        if (!result.ok) {
            msg.error(result.msg || "删除失败");
            return;
        }
        msg.success(result.msg || "已删除");
    } finally {
        busy.value = false;
    }
};
</script>
<style scoped>
.manager {
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 640px;
    margin: 0 auto;
    width: 100%;
}

.section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
}

.section-title {
    font-size: 13px;
    font-weight: 600;
}

.section-hint {
    font-size: 11px;
    opacity: 0.55;
}

.preview-box {
    padding: 0 4px;
    border-radius: 12px;
    background: rgba(127, 127, 127, 0.06);
    overflow: hidden;
}

.page-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.page-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.06);
}

.page-row.is-current {
    background: rgba(127, 127, 127, 0.14);
}

.row-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    flex: 0 0 28px;
    border-radius: 8px;
    background: rgba(127, 127, 127, 0.12);
    overflow: hidden;
}

.row-svg,
.row-svg :deep(svg) {
    display: block;
    width: 18px;
    height: 18px;
}

.row-text {
    font-size: 17px;
    line-height: 1;
}

.row-placeholder {
    font-size: 13px;
}

.row-main {
    flex: 1;
    min-width: 0;
}

.row-title {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
}

.row-name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 13px;
}

.row-sub {
    font-size: 11px;
    opacity: 0.5;
}

.row-actions {
    flex: 0 0 auto;
}

@media (max-width: 360px) {
    .row-actions :deep(.n-button) {
        width: 26px;
    }
}
</style>
