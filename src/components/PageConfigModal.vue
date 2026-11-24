<template>
    <XModal v-model:show="modelShow" class="pageConfigModal">
        <template #header>
            <div class="cfg-head">
                <div class="cfg-head__title">{{ modalTitle }}</div>
                <div class="cfg-head__actions">
                    <n-button size="small" type="primary" :loading="pendingStructure" @click="addGroup">添加分组</n-button>
                    <n-button size="small" quaternary @click="toggleAll">{{ allOpen ? "折叠全部" : "展开全部" }}</n-button>
                </div>
                <n-button class="cfg-head__close" quaternary circle size="tiny" aria-label="关闭" @click="modelShow = false">
                    <template #icon>
                        <n-icon size="20"><IosClose /></n-icon>
                    </template>
                </n-button>
            </div>
        </template>

        <div class="cfg">
            <div v-if="!groupList.length" class="empty">
                <p class="empty__text">这一页还没有分组，先添加一个再往里放元件。</p>
                <n-button size="small" type="primary" :loading="pendingStructure" @click="addGroup">添加第一个分组</n-button>
            </div>

            <section v-for="group in groupList" :key="group.uuid" class="group">
                <header class="group__head">
                    <button type="button" class="group__toggle" :aria-expanded="!!openGroups[group.uuid!]" @click="toggleGroup(group)">
                        <svg class="chevron" :class="{ 'is-open': openGroups[group.uuid!] }" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        <span class="group__title">{{ groupDraft(group).title || "未命名分组" }}</span>
                        <span class="chip">{{ displayShortLabel(groupDraft(group).display) }}</span>
                        <span class="group__count">{{ (group.list || []).length }} 个元件</span>
                    </button>
                    <n-button size="tiny" text type="error" @click="askDeleteGroup(group)">删除分组</n-button>
                </header>

                <div v-show="openGroups[group.uuid!]" class="group__body">
                    <div class="form-grid">
                        <label class="field">
                            <span class="field__label">分组名称</span>
                            <n-input v-model:value="groupDraft(group).title" placeholder="例如：常用工具" />
                        </label>
                        <label class="field">
                            <span class="field__label">显示方式</span>
                            <n-select v-model:value="groupDraft(group).display" :options="displayTypeList" />
                        </label>
                        <label class="field">
                            <span class="field__label">最大高度</span>
                            <n-input v-model:value="groupDraft(group).maxHeight" placeholder="如 400px，留空不限制" />
                        </label>
                        <label class="field">
                            <span class="field__label">最小宽度</span>
                            <n-input v-model:value="groupDraft(group).minWidth" placeholder="如 320px，留空不限制" />
                        </label>
                    </div>

                    <div v-if="groupDirty(group)" class="actions">
                        <span class="actions__hint">未保存</span>
                        <n-button size="small" type="primary" :loading="pendingGroup[group.uuid!]" @click="saveGroup(group)">保存分组</n-button>
                    </div>

                    <div class="items">
                        <div class="items__head">
                            <span class="items__title">元件</span>
                            <n-dropdown trigger="click" :options="itemTypeOptions" @select="(key) => addItem(group, String(key))">
                                <n-button size="small" :loading="pendingStructure">添加元件</n-button>
                            </n-dropdown>
                        </div>

                        <p v-if="!(group.list || []).length" class="items__empty">还没有元件，从上面的下拉框选一个类型添加。</p>

                        <article v-for="item in group.list" :key="item.uuid" class="item">
                            <header class="item__head">
                                <button type="button" class="item__toggle" :aria-expanded="!!openItems[item.uuid!]" @click="toggleItem(item)">
                                    <svg class="chevron" :class="{ 'is-open': openItems[item.uuid!] }" width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                                        <path d="m6 4 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                                    </svg>
                                    <span class="item__title">{{ itemDraft(item).title || itemTitle(item) }}</span>
                                    <span class="item__type">{{ itemTypeLabel(item) }}</span>
                                </button>
                                <n-button size="tiny" text type="error" @click="askDeleteItem(group, item)">删除</n-button>
                            </header>

                            <div v-show="openItems[item.uuid!]" class="item__body">
                                <div class="form-grid">
                                    <label class="field">
                                        <span class="field__label">标题覆盖</span>
                                        <n-input v-model:value="itemDraft(item).title" :placeholder="itemTitle(item)" />
                                    </label>
                                    <label class="field">
                                        <span class="field__label">图标地址</span>
                                        <n-input v-model:value="itemDraft(item).icon" placeholder="留空使用默认图标" />
                                    </label>
                                    <label class="field">
                                        <span class="field__label">最大高度</span>
                                        <n-input v-model:value="itemDraft(item).maxHeight" placeholder="如 400px，留空不限制" />
                                    </label>
                                    <label class="field">
                                        <span class="field__label">最小宽度</span>
                                        <n-input v-model:value="itemDraft(item).minWidth" placeholder="如 320px，留空不限制" />
                                    </label>
                                </div>

                                <div v-if="itemDirty(item)" class="actions">
                                    <span class="actions__hint">未保存</span>
                                    <n-button size="small" type="primary" :loading="pendingItem[item.uuid!]" @click="saveItem(group, item)">保存元件</n-button>
                                </div>
                            </div>
                        </article>
                    </div>
                </div>
            </section>
        </div>

        <template #footer>
            <n-button @click="modelShow = false">返回</n-button>
        </template>
    </XModal>
</template>
<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import XModal from "./XModal.vue";
import { useDataStore } from "@/stores/data";
import { ItemRouterList } from "@common/utils/itemRouterouterList";
import { itemFetch } from "@/utils/jFetch";
import { useDialog, useMessage, useThemeVars } from "naive-ui";
import { IosClose } from "@vicons/ionicons4";

const dataStore = useDataStore();
const themeVars = useThemeVars();
const primaryColor = computed(() => themeVars.value.primaryColor);
const msg = useMessage();
const dialog = useDialog();

const props = defineProps<{
    show: boolean;
    pageUUID: string;
}>();

const emits = defineEmits(["update:show"]);

const displayTypeList: { label: string; value: ItemDisplayType }[] = [
    { label: "按钮", value: "btn" },
    { label: "图标", value: "icon" },
    { label: "盒子 · 自适应宽度", value: "box" },
    { label: "盒子 · 撑满宽度", value: "widthBox" },
    { label: "全页面", value: "fullPage" }
];

const displayShort: Record<ItemDisplayType, string> = {
    btn: "按钮",
    icon: "图标",
    box: "自适应",
    widthBox: "撑满",
    fullPage: "全页"
};

const itemTypeOptions = Object.entries(ItemRouterList)
    .filter(([, item]) => !item.isHide)
    .map(([type, item]) => ({
        label: `${item.title}${item.desc ? `（${item.desc}）` : ""}`,
        key: type
    }));

type GroupDraft = { title: string; display: ItemDisplayType; maxHeight: string; minWidth: string };
type ItemDraft = { title: string; icon: string; maxHeight: string; minWidth: string };

const groupDrafts = reactive<Record<string, GroupDraft>>({});
const itemDrafts = reactive<Record<string, ItemDraft>>({});
const openGroups = reactive<Record<string, boolean>>({});
const openItems = reactive<Record<string, boolean>>({});
const pendingGroup = reactive<Record<string, boolean>>({});
const pendingItem = reactive<Record<string, boolean>>({});
const pendingStructure = ref(false);

const curPage = computed(() => dataStore.pageList.find((item) => item.uuid === props.pageUUID));
const groupList = computed(() => curPage.value?.itemGroupList ?? []);
const modalTitle = computed(() => {
    const title = curPage.value?.title?.trim();
    if (!title) {
        return "页面设置";
    }
    // 标题栏不被长页面名撑开，超出部分用省略号
    return `页面设置 · ${title.length > 12 ? `${title.slice(0, 12)}…` : title}`;
});

const modelShow = computed({
    get: () => props.show,
    set: (val) => {
        emits("update:show", val);
    }
});

const styleText = (style: MyStyleType | undefined, key: string) => {
    const value = style ? (style as Record<string, unknown>)[key] : undefined;
    return value == null ? "" : String(value);
};

const groupDraft = (group: ItemGroupType): GroupDraft => {
    const uuid = group.uuid!;
    let draft = groupDrafts[uuid];
    if (!draft) {
        draft = {
            title: group.title || "",
            display: group.display,
            maxHeight: styleText(group.style, "max-height"),
            minWidth: styleText(group.style, "min-width")
        };
        groupDrafts[uuid] = draft;
    }
    return draft;
};

const itemDraft = (item: ItemType): ItemDraft => {
    const uuid = item.uuid!;
    let draft = itemDrafts[uuid];
    if (!draft) {
        draft = {
            title: item.options?.title || "",
            icon: item.options?.icon || "",
            maxHeight: styleText(item.style, "max-height"),
            minWidth: styleText(item.style, "min-width")
        };
        itemDrafts[uuid] = draft;
    }
    return draft;
};

/** 空值表示不限制，直接删掉键，别把空字符串写进样式 */
const buildStyle = (base: MyStyleType | undefined, maxHeight: string, minWidth: string) => {
    const style: Record<string, unknown> = { ...(base || {}) };
    const put = (key: string, raw: string) => {
        const value = raw.trim();
        if (value) {
            style[key] = value;
        } else {
            delete style[key];
        }
    };
    put("max-height", maxHeight);
    put("min-width", minWidth);
    return style as unknown as MyStyleType;
};

const groupDirty = (group: ItemGroupType) => {
    const draft = groupDraft(group);
    return (
        draft.title.trim() !== (group.title || "") ||
        draft.display !== group.display ||
        draft.maxHeight.trim() !== styleText(group.style, "max-height") ||
        draft.minWidth.trim() !== styleText(group.style, "min-width")
    );
};

const itemDirty = (item: ItemType) => {
    const draft = itemDraft(item);
    return (
        draft.title.trim() !== (item.options?.title || "") ||
        draft.icon.trim() !== (item.options?.icon || "") ||
        draft.maxHeight.trim() !== styleText(item.style, "max-height") ||
        draft.minWidth.trim() !== styleText(item.style, "min-width")
    );
};

const replaceGroup = (uuid: string, next: ItemGroupType) => {
    const list = curPage.value?.itemGroupList;
    const index = list?.findIndex((group) => group.uuid === uuid) ?? -1;
    if (list && index !== -1) {
        list[index] = next;
    }
};

const replaceItem = (groupUUID: string, itemUUID: string, next: ItemType) => {
    const group = curPage.value?.itemGroupList.find((item) => item.uuid === groupUUID);
    const index = group?.list.findIndex((item) => item.uuid === itemUUID) ?? -1;
    if (group && index !== -1) {
        group.list[index] = next;
    }
};

const syncGroupDraft = (group: ItemGroupType) => {
    groupDrafts[group.uuid!] = {
        title: group.title || "",
        display: group.display,
        maxHeight: styleText(group.style, "max-height"),
        minWidth: styleText(group.style, "min-width")
    };
};

const syncItemDraft = (item: ItemType) => {
    itemDrafts[item.uuid!] = {
        title: item.options?.title || "",
        icon: item.options?.icon || "",
        maxHeight: styleText(item.style, "max-height"),
        minWidth: styleText(item.style, "min-width")
    };
};

const resetDrafts = () => {
    for (const key of Object.keys(groupDrafts)) delete groupDrafts[key];
    for (const key of Object.keys(itemDrafts)) delete itemDrafts[key];
    for (const key of Object.keys(openGroups)) delete openGroups[key];
    for (const key of Object.keys(openItems)) delete openItems[key];

    for (const group of groupList.value) {
        const uuid = group.uuid!;
        groupDraft(group);
        openGroups[uuid] = true;
        for (const item of group.list || []) {
            itemDraft(item);
            openItems[item.uuid!] = false;
        }
    }
};

watch(
    [() => props.show, () => props.pageUUID],
    ([show]) => {
        if (show) {
            resetDrafts();
        }
    },
    { immediate: true, flush: "sync" }
);

const toggleGroup = (group: ItemGroupType) => {
    openGroups[group.uuid!] = !openGroups[group.uuid!];
};

const toggleItem = (item: ItemType) => {
    openItems[item.uuid!] = !openItems[item.uuid!];
};

const expandAll = (open: boolean) => {
    for (const group of groupList.value) {
        openGroups[group.uuid!] = open;
        for (const item of group.list || []) {
            openItems[item.uuid!] = open;
        }
    }
};

/** 所有分组都展开时，按钮变成“折叠全部”，避免并排两个按钮 */
const allOpen = computed(() => groupList.value.length > 0 && groupList.value.every((group) => !!openGroups[group.uuid!]));

const toggleAll = () => expandAll(!allOpen.value);

const displayShortLabel = (display: ItemDisplayType) => displayShort[display] || display;
const itemMeta = (item: ItemType) => ItemRouterList[item.type];
const itemTitle = (item: ItemType) => item.options?.title || itemMeta(item)?.title || item.type;
const itemTypeLabel = (item: ItemType) => {
    const meta = itemMeta(item);
    if (!meta) {
        return item.type;
    }
    return meta.desc ? `${meta.title} · ${meta.desc}` : meta.title;
};

const addGroup = async () => {
    const page = curPage.value;
    if (!page) {
        return msg.error("页面不存在");
    }
    pendingStructure.value = true;
    const res = await itemFetch.request("addItemGroup", {
        pageUUID: props.pageUUID,
        obj: { display: "box", title: "新建分组" },
        insertIndex: groupList.value.length
    });
    pendingStructure.value = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    page.itemGroupList.push(res.data!);
    groupDraft(res.data!);
    openGroups[res.data!.uuid!] = true;
    msg.success(res.msg!);
};

const addItem = async (group: ItemGroupType, type: string) => {
    if (!type || !ItemRouterList[type]) {
        return msg.error("请选择正确的元件类型");
    }
    pendingStructure.value = true;
    const res = await itemFetch.request("addItem", {
        pageUUID: props.pageUUID,
        itemGroupUUID: group.uuid!,
        obj: { type },
        insertIndex: (group.list || []).length
    });
    pendingStructure.value = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    group.list.push(res.data!);
    itemDraft(res.data!);
    openItems[res.data!.uuid!] = true;
    msg.success(res.msg!);
};

const saveGroup = async (group: ItemGroupType) => {
    const uuid = group.uuid!;
    const draft = groupDraft(group);
    if (!draft.title.trim()) {
        return msg.error("分组名称不能为空");
    }
    pendingGroup[uuid] = true;
    const res = await itemFetch.request("updateItemGroup", {
        pageUUID: props.pageUUID,
        obj: {
            ...group,
            title: draft.title.trim(),
            display: draft.display,
            style: buildStyle(group.style, draft.maxHeight, draft.minWidth)
        }
    });
    pendingGroup[uuid] = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    replaceGroup(uuid, res.data!);
    syncGroupDraft(res.data!);
    msg.success(res.msg!);
};

const saveItem = async (group: ItemGroupType, item: ItemType) => {
    const uuid = item.uuid!;
    const draft = itemDraft(item);
    const options: Partial<ItemOptionType> = {};
    if (draft.title.trim()) {
        options.title = draft.title.trim();
    }
    if (draft.icon.trim()) {
        options.icon = draft.icon.trim();
    }

    pendingItem[uuid] = true;
    const res = await itemFetch.request("updateItem", {
        pageUUID: props.pageUUID,
        obj: {
            ...item,
            options,
            style: buildStyle(item.style, draft.maxHeight, draft.minWidth)
        }
    });
    pendingItem[uuid] = false;
    if (res.code != 200) {
        return msg.error(res.msg!);
    }
    replaceItem(group.uuid!, uuid, res.data!);
    syncItemDraft(res.data!);
    msg.success(res.msg!);
};

const askDeleteGroup = (group: ItemGroupType) => {
    dialog.warning({
        title: "删除分组",
        content: `删除“${group.title}”及其中的 ${(group.list || []).length} 个元件？此操作不可撤销。`,
        positiveText: "删除",
        negativeText: "取消",
        positiveButtonProps: { type: "error" },
        onPositiveClick: async () => {
            pendingStructure.value = true;
            const res = await itemFetch.request("deleteItemGroup", { pageUUID: props.pageUUID, uuid: group.uuid! });
            pendingStructure.value = false;
            if (res.code != 200) {
                return msg.error(res.msg!);
            }
            const list = curPage.value?.itemGroupList;
            const index = list?.findIndex((item) => item.uuid === group.uuid) ?? -1;
            if (list && index !== -1) {
                list.splice(index, 1);
            }
            delete groupDrafts[group.uuid!];
            msg.success(res.msg!);
        }
    });
};

const askDeleteItem = (group: ItemGroupType, item: ItemType) => {
    dialog.warning({
        title: "删除元件",
        content: `确定删除“${itemTitle(item)}”？此操作不可撤销。`,
        positiveText: "删除",
        negativeText: "取消",
        positiveButtonProps: { type: "error" },
        onPositiveClick: async () => {
            pendingStructure.value = true;
            const res = await itemFetch.request("deleteItem", { pageUUID: props.pageUUID, uuid: item.uuid! });
            pendingStructure.value = false;
            if (res.code != 200) {
                return msg.error(res.msg!);
            }
            const target = curPage.value?.itemGroupList.find((g) => g.uuid === group.uuid);
            const index = target?.list.findIndex((c) => c.uuid === item.uuid) ?? -1;
            if (target && index !== -1) {
                target.list.splice(index, 1);
            }
            delete itemDrafts[item.uuid!];
            msg.success(res.msg!);
        }
    });
};
</script>
<style scoped>
.cfg {
    --cfg-line: rgba(255, 255, 255, 0.09);
    --cfg-surface: rgba(255, 255, 255, 0.035);
    --cfg-muted: rgba(255, 255, 255, 0.56);
    --cfg-accent: v-bind(primaryColor);
    --cfg-radius: 8px;
}

.cfg-head {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px 12px;
    margin-bottom: 12px;
    padding-right: 34px;
}

.cfg-head__title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 16px;
    font-weight: 600;
}

.cfg-head__actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.cfg-head__close {
    position: absolute;
    top: -6px;
    right: -6px;
}

.empty {
    padding: 32px 20px;
    border: 1px dashed var(--cfg-line);
    border-radius: var(--cfg-radius);
    text-align: center;
}

.empty__text {
    margin: 0 0 14px;
    font-size: 13px;
    color: var(--cfg-muted);
}

.group {
    border: 1px solid var(--cfg-line);
    border-radius: var(--cfg-radius);
    background: var(--cfg-surface);
}

.group + .group {
    margin-top: 12px;
}

.group__head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 10px 4px 8px;
}

.group__toggle {
    flex: 1;
    min-width: 0;
    min-height: 48px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.group__toggle:focus-visible,
.item__toggle:focus-visible {
    outline: 2px solid var(--cfg-accent);
    outline-offset: 2px;
    border-radius: 4px;
}

.chevron {
    flex: 0 0 auto;
    color: var(--cfg-muted);
    transition: transform 0.2s ease;
}

.chevron.is-open {
    transform: rotate(90deg);
}

.group__title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 14px;
    font-weight: 600;
}

.chip {
    flex: 0 0 auto;
    padding: 1px 8px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--cfg-accent) 16%, transparent);
    color: var(--cfg-accent);
    font-size: 11px;
    line-height: 18px;
}

.group__count {
    flex: 0 0 auto;
    font-size: 12px;
    color: var(--cfg-muted);
}

.group__body {
    padding: 2px 16px 16px;
    border-top: 1px solid var(--cfg-line);
}

.form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 16px;
    padding-top: 14px;
}

.field {
    display: grid;
    gap: 6px;
    min-width: 0;
}

.field__label {
    font-size: 12px;
    color: var(--cfg-muted);
}

.actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 14px;
}

.actions__hint {
    font-size: 12px;
    color: var(--cfg-accent);
}

.items {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid var(--cfg-line);
}

.items__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.items__title {
    font-size: 13px;
    font-weight: 600;
}

.items__empty {
    margin: 14px 0 0;
    font-size: 13px;
    color: var(--cfg-muted);
}

.item {
    border-top: 1px solid var(--cfg-line);
}

.item:first-of-type {
    margin-top: 10px;
}

.item__head {
    display: flex;
    align-items: center;
    gap: 8px;
}

.item__toggle {
    flex: 1;
    min-width: 0;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
}

.item__title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
}

.item__type {
    flex: 0 0 auto;
    font-size: 11px;
    color: var(--cfg-muted);
}

.item__body {
    padding: 0 0 14px 22px;
}

.item__body .form-grid {
    padding-top: 0;
}

@media (max-width: 560px) {
    .form-grid {
        grid-template-columns: minmax(0, 1fr);
    }

    .cfg-head {
        padding-right: 40px;
    }

    .cfg-head__actions {
        flex: 1 1 100%;
        justify-content: flex-end;
    }

    .cfg-head__actions :deep(.n-button) {
        flex: none;
    }

    .item__body {
        padding-left: 0;
    }

    .pageConfigModal :deep(.n-button) {
        min-height: 44px;
    }

    .cfg :deep(.n-input),
    .cfg :deep(.n-base-selection) {
        min-height: 44px;
    }
}
</style>
