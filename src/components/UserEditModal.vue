<template>
    <n-modal
        :show="show"
        preset="card"
        class="user-edit-modal"
        :title="isEdit ? '编辑用户' : '新增用户'"
        :bordered="false"
        :mask-closable="!saving"
        :closable="!saving"
        :style="{ width: '92%', maxWidth: '460px' }"
        @update:show="(value: boolean) => !saving && emit('update:show', value)"
    >
        <n-flex vertical :size="12">
            <div class="field">
                <div class="field-label">名称</div>
                <n-input
                    v-model:value="name"
                    show-count
                    :maxlength="50"
                    clearable
                    :placeholder="isEdit ? '请输入名称' : '留空按类型默认'"
                    :disabled="saving"
                />
                <div v-if="submitted && nameError" class="field-error">{{ nameError }}</div>
            </div>

            <div class="field">
                <div class="field-label">类型</div>
                <n-radio-group v-model:value="type" :disabled="saving || isSelf">
                    <n-radio-button value="user">用户</n-radio-button>
                    <n-radio-button value="admin">管理员</n-radio-button>
                </n-radio-group>
                <div v-if="isSelf" class="field-hint">不能修改自己的类型</div>
            </div>

            <div class="field">
                <div class="field-label">路径 ID（pathID）</div>
                <n-input
                    v-if="!isEdit"
                    v-model:value="pathID"
                    clearable
                    placeholder="8–20 位，留空自动生成"
                    :disabled="saving"
                />
                <n-input v-else :value="user?.pathID || ''" readonly />
                <div v-if="isEdit" class="field-hint">创建后不可修改</div>
                <div v-if="submitted && pathIDError" class="field-error">{{ pathIDError }}</div>
                <div v-if="pathConflict" class="field-error">{{ pathConflict }}</div>
            </div>

            <div v-if="!isEdit" class="field">
                <div class="field-label">二次码（可选）</div>
                <n-radio-group v-model:value="secondMode" :disabled="saving">
                    <n-flex :size="12" :wrap="true">
                        <n-radio value="empty">留空（不设置）</n-radio>
                        <n-radio value="manual">手动输入</n-radio>
                        <n-radio value="random">随机生成</n-radio>
                    </n-flex>
                </n-radio-group>
                <n-input
                    v-if="secondMode === 'manual'"
                    v-model:value="secondCode"
                    class="second-input"
                    type="password"
                    show-password-on="click"
                    placeholder="输入二次码"
                    :disabled="saving"
                />
                <div v-if="secondMode === 'random'" class="field-hint">将生成 12 位随机二次码，创建后只展示一次。</div>
                <div v-if="submitted && secondError" class="field-error">{{ secondError }}</div>
            </div>

            <div v-else class="field">
                <div class="field-label">二次码</div>
                <div class="field-hint">二次码只写不读，管理端无法查看当前值。</div>
                <div v-if="isSelf" class="field-hint">请在「路由设置」中修改自己的二次码。</div>
                <n-button v-else secondary size="small" :disabled="saving" @click="emit('reset', user!)">
                    重置二次码
                </n-button>
            </div>

            <n-alert v-if="error" type="error" :bordered="false" :show-icon="false">{{ error }}</n-alert>
        </n-flex>
        <template #footer>
            <n-flex justify="end" :size="8">
                <n-button :disabled="saving" @click="emit('update:show', false)">取消</n-button>
                <n-button type="primary" :loading="saving" @click="submit">{{ isEdit ? "保存" : "创建" }}</n-button>
            </n-flex>
        </template>
    </n-modal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { nanoid } from "nanoid";
import { validateUserPathID, validateUserName } from "@/utils/userAdmin";

type SecondMode = "empty" | "manual" | "random";

type SavePayload =
    | {
          mode: "create";
          type: UserTypeType;
          name?: string;
          pathID?: string;
          secondCode?: string;
      }
    | {
          mode: "edit";
          uuid: string;
          name: string;
          type: UserTypeType;
      };

const props = withDefaults(
    defineProps<{
        show: boolean;
        user?: AdminUserItem | null;
        currentUUID?: string;
        saving?: boolean;
        error?: string;
        pathConflict?: string;
    }>(),
    { user: null, currentUUID: "", saving: false, error: "", pathConflict: "" }
);

const emit = defineEmits<{
    (e: "update:show", value: boolean): void;
    (e: "save", payload: SavePayload): void;
    (e: "reset", user: AdminUserItem): void;
}>();

const name = ref("");
const type = ref<UserTypeType>("user");
const pathID = ref("");
const secondMode = ref<SecondMode>("empty");
const secondCode = ref("");
const submitted = ref(false);

const isEdit = computed(() => !!props.user);
const isSelf = computed(() => !!props.user && props.user.uuid === props.currentUUID);
const nameError = computed(() => validateUserName(name.value, isEdit.value));
const pathIDError = computed(() => (isEdit.value ? "" : validateUserPathID(pathID.value)));
const secondError = computed(() => (secondMode.value === "manual" && !secondCode.value.trim() ? "请输入二次码" : ""));

watch(
    () => props.show,
    (show) => {
        if (!show) {
            return;
        }
        name.value = props.user?.name || "";
        type.value = props.user?.type || "user";
        pathID.value = "";
        secondMode.value = "empty";
        secondCode.value = "";
        submitted.value = false;
    }
);

function submit() {
    if (props.saving) {
        return;
    }
    submitted.value = true;
    if (nameError.value || pathIDError.value || secondError.value) {
        return;
    }
    if (isEdit.value && props.user) {
        emit("save", {
            mode: "edit",
            uuid: props.user.uuid,
            name: name.value.trim(),
            type: type.value
        });
        return;
    }
    emit("save", {
        mode: "create",
        type: type.value,
        name: name.value.trim() || undefined,
        pathID: pathID.value.trim() || undefined,
        secondCode:
            secondMode.value === "random"
                ? nanoid(12)
                : secondMode.value === "manual"
                  ? secondCode.value
                  : undefined
    });
}
</script>
<style scoped>
.field-label {
    margin-bottom: 6px;
    font-size: 12px;
    opacity: 0.72;
}

.field-hint {
    margin-top: 5px;
    font-size: 11px;
    line-height: 1.5;
    opacity: 0.52;
}

.field-error {
    margin-top: 5px;
    color: #d03050;
    font-size: 12px;
    line-height: 1.4;
}

.second-input {
    margin-top: 8px;
}
</style>
