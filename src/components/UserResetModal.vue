<template>
    <n-modal
        :show="show"
        preset="card"
        class="reset-modal"
        title="重置二次码"
        :bordered="false"
        :mask-closable="!saving"
        :closable="!saving"
        :style="{ width: '92%', maxWidth: '420px' }"
        @update:show="(value: boolean) => !saving && emit('update:show', value)"
    >
        <n-flex vertical :size="14">
            <div class="hint">
                重置后对方下一次请求会要求重新登录。<span v-if="user">目标：{{ user.name }}</span>
            </div>

            <n-radio-group v-model:value="mode" :disabled="saving">
                <n-flex vertical :size="8">
                    <n-radio value="random">随机生成（推荐）</n-radio>
                    <n-radio value="manual">手动输入</n-radio>
                    <n-radio value="clear">清除二次码</n-radio>
                </n-flex>
            </n-radio-group>

            <n-input
                v-if="mode === 'manual'"
                v-model:value="secondCode"
                type="password"
                show-password-on="click"
                placeholder="输入新的二次码"
                :disabled="saving"
                @keyup.enter="submit"
            />

            <n-alert v-if="mode === 'clear'" type="warning" :bordered="false">
                该用户将只需 pathID 登录。
            </n-alert>
            <n-alert v-else-if="mode === 'random'" type="info" :bordered="false">
                由服务端生成，保存后只展示一次。
            </n-alert>

            <n-alert v-if="displayError" type="error" :bordered="false" :show-icon="false">{{ displayError }}</n-alert>
        </n-flex>
        <template #footer>
            <n-flex justify="end" :size="8">
                <n-button :disabled="saving" @click="emit('update:show', false)">取消</n-button>
                <n-button type="primary" :loading="saving" @click="submit">
                    {{ mode === "clear" ? "清除" : "重置" }}
                </n-button>
            </n-flex>
        </template>
    </n-modal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";

type ResetMode = "random" | "manual" | "clear";

const props = withDefaults(
    defineProps<{
        show: boolean;
        user?: AdminUserItem | null;
        saving?: boolean;
        error?: string;
    }>(),
    { user: null, saving: false, error: "" }
);

const emit = defineEmits<{
    (e: "update:show", value: boolean): void;
    (e: "submit", payload: { uuid: string; secondCode?: string; cleared: boolean }): void;
}>();

const mode = ref<ResetMode>("random");
const secondCode = ref("");
const localError = ref("");

const displayError = computed(() => props.error || localError.value);

watch(
    () => props.show,
    (show) => {
        if (!show) {
            return;
        }
        mode.value = "random";
        secondCode.value = "";
        localError.value = "";
    }
);

function submit() {
    if (props.saving || !props.user) {
        return;
    }
    if (mode.value === "manual" && !secondCode.value.trim()) {
        localError.value = "请输入二次码，或改为随机生成";
        return;
    }
    localError.value = "";
    const payload =
        mode.value === "clear"
            ? { uuid: props.user.uuid, secondCode: "", cleared: true }
            : mode.value === "manual"
              ? { uuid: props.user.uuid, secondCode: secondCode.value, cleared: false }
              : { uuid: props.user.uuid, cleared: false };
    emit("submit", payload);
}
</script>
<style scoped>
.hint {
    font-size: 12px;
    line-height: 1.6;
    opacity: 0.68;
}
</style>
