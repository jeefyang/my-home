<template>
    <n-modal
        :show="show"
        preset="card"
        class="page-edit-modal"
        :title="isEdit ? '编辑页面' : '新增页面'"
        :bordered="false"
        :mask-closable="!saving"
        :style="{ width: '92%', maxWidth: '420px' }"
        @update:show="(value: boolean) => emit('update:show', value)"
    >
        <n-flex vertical :size="12">
            <div class="field">
                <div class="field-label">标题</div>
                <n-input
                    v-model:value="title"
                    maxlength="20"
                    show-count
                    clearable
                    placeholder="页面标题，1–20 个字"
                    :status="error && !title.trim() ? 'error' : undefined"
                    @keyup.enter="submit"
                />
            </div>
            <div class="field">
                <div class="field-label">图标</div>
                <IconPicker v-model="icon" />
            </div>
            <n-alert v-if="error" type="error" :bordered="false" :show-icon="false">{{ error }}</n-alert>
        </n-flex>
        <template #footer>
            <n-flex justify="end" :size="8">
                <n-button :disabled="saving" @click="emit('update:show', false)">取消</n-button>
                <n-button type="primary" :loading="saving" @click="submit">{{ isEdit ? "保存" : "添加" }}</n-button>
            </n-flex>
        </template>
    </n-modal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import IconPicker from "./IconPicker.vue";
import { isSvgIcon, isValidTextIcon } from "@/utils/pageIcon";

const props = withDefaults(
    defineProps<{
        show: boolean;
        page?: PageType | null;
        saving?: boolean;
    }>(),
    { page: null, saving: false }
);

const emit = defineEmits<{
    (e: "update:show", value: boolean): void;
    (e: "save", payload: { title: string; icon: string }): void;
}>();

const title = ref("");
const icon = ref("");
const error = ref("");
const isEdit = computed(() => !!props.page);

watch(
    () => props.show,
    (show) => {
        if (!show) {
            return;
        }
        title.value = props.page?.title || "";
        icon.value = props.page?.icon || "";
        error.value = "";
    }
);

const submit = () => {
    if (props.saving) {
        return;
    }
    const nextTitle = title.value.trim();
    if (!nextTitle) {
        error.value = "请输入页面标题";
        return;
    }
    if (Array.from(nextTitle).length > 20) {
        error.value = "标题最多 20 个字";
        return;
    }
    const nextIcon = icon.value.trim();
    if (nextIcon && !isSvgIcon(nextIcon) && !isValidTextIcon(nextIcon)) {
        error.value = "图标只能是内置图标，或 1–4 个字符的 emoji / 单字";
        return;
    }
    error.value = "";
    // icon 传空字符串表示“清除图标”，服务端 updatePage 会按删除处理
    emit("save", { title: nextTitle, icon: nextIcon });
};
</script>
<style scoped>
.field-label {
    margin-bottom: 6px;
    font-size: 12px;
    opacity: 0.72;
}
</style>
