<template>
    <n-drawer
        :show="show"
        placement="bottom"
        height="80%"
        :mask-closable="!drawerBusy"
        :closable="!drawerBusy"
        :close-on-esc="!drawerBusy"
        @update:show="updateShow"
    >
        <n-drawer-content title="用户管理" :native-scrollbar="false">
            <div class="manager">
                <div class="summary">
                    共 {{ store.list.length }} 个用户，其中 {{ adminCount }} 个管理员
                </div>

                <n-alert v-if="adminCount <= 1 && !store.loading && !store.error && store.errorCode !== 403" type="info" :bordered="false">
                    只有你一个管理员，可新增用户或其他管理员。
                </n-alert>

                <n-skeleton v-if="store.loading" text :repeat="3" height="58px" class="skeleton" />

                <n-result v-else-if="store.errorCode === 403" status="403" title="无权访问" description="只有管理员可以管理用户。" />

                <template v-else>
                    <n-alert v-if="listError" type="error" :bordered="false">
                        <n-flex align="center" justify="space-between" :size="8">
                            <span>{{ listError }}</span>
                            <n-button size="tiny" secondary @click="store.load()">重试</n-button>
                        </n-flex>
                    </n-alert>

                    <n-empty v-if="!store.list.length && !listError" description="暂无用户" class="empty" />

                    <div v-else class="user-list">
                        <div
                            v-for="user in store.list"
                            :key="user.uuid"
                            class="user-row"
                            :class="{ 'is-self': user.uuid === currentUUID }"
                        >
                            <n-avatar round :size="34" class="avatar">{{ userInitial(user.name) }}</n-avatar>
                            <div class="row-main">
                                <div class="row-title">
                                    <span class="row-name">{{ user.name }}</span>
                                    <n-tag v-if="user.uuid === currentUUID" size="tiny" :bordered="false">我</n-tag>
                                    <n-tag
                                        size="tiny"
                                        :bordered="false"
                                        :type="user.type === 'admin' ? 'warning' : 'default'"
                                    >
                                        {{ user.type === "admin" ? "管理员" : "用户" }}
                                    </n-tag>
                                </div>
                                <div class="row-sub">
                                    <span class="mono">{{ user.pathID }}</span>
                                    <span class="dot">·</span>
                                    <span>{{ formatUserDate(user.createTime) }}</span>
                                    <span class="dot">·</span>
                                    <span>{{ user.pageUUIDList.length }} 页</span>
                                </div>
                            </div>
                            <n-flex :size="2" :wrap="false" class="row-actions">
                                <n-button
                                    quaternary
                                    circle
                                    size="small"
                                    :disabled="busy"
                                    :title="`编辑 ${user.name}`"
                                    :aria-label="`编辑 ${user.name}`"
                                    @click="openEdit(user)"
                                >
                                    <template #icon><n-icon :component="CreateOutline" /></template>
                                </n-button>
                                <n-button
                                    quaternary
                                    circle
                                    size="small"
                                    type="error"
                                    :disabled="user.uuid === currentUUID || busy"
                                    :title="user.uuid === currentUUID ? '不能删除自己' : `删除 ${user.name}`"
                                    :aria-label="user.uuid === currentUUID ? '不能删除自己' : `删除 ${user.name}`"
                                    @click="removeUser(user)"
                                >
                                    <template #icon><n-icon :component="TrashOutline" /></template>
                                </n-button>
                            </n-flex>
                        </div>
                    </div>
                </template>
            </div>

            <template #footer>
                <n-button type="primary" block :disabled="busy || store.errorCode === 403" @click="openCreate">
                    <template #icon><n-icon :component="Add" /></template>
                    新增用户
                </n-button>
            </template>
        </n-drawer-content>
    </n-drawer>

    <UserEditModal
        v-model:show="showEdit"
        :user="editingUser"
        :current-uuid="currentUUID"
        :saving="editSaving"
        :error="editError"
        :path-conflict="pathIDConflict"
        @save="saveUser"
        @reset="openReset"
    />
    <UserResetModal
        v-model:show="showReset"
        :user="resetUser"
        :saving="resetSaving"
        :error="resetError"
        @submit="submitReset"
    />
    <UserCredentialModal v-model:show="showCredential" :credential="credential" />
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useDialog, useMessage } from "naive-ui";
import { Add, CreateOutline, TrashOutline } from "@vicons/ionicons5";
import UserEditModal from "./UserEditModal.vue";
import UserResetModal from "./UserResetModal.vue";
import UserCredentialModal from "./UserCredentialModal.vue";
import { useDataStore } from "@/stores/data";
import { useUserAdminStore } from "@/stores/userAdmin";
import { formatUserDate, userInitial } from "@/utils/userAdmin";

type Credential = {
    title: string;
    name: string;
    pathID: string;
    secondCode?: string;
};

const props = defineProps<{ show: boolean }>();
const emit = defineEmits<{ (e: "update:show", value: boolean): void }>();

const store = useUserAdminStore();
const dataStore = useDataStore();
const msg = useMessage();
const dialog = useDialog();

const busy = ref(false);
const showEdit = ref(false);
const editSaving = ref(false);
const editError = ref("");
const pathIDConflict = ref("");
const editingUser = ref<AdminUserItem | null>(null);

const showReset = ref(false);
const resetSaving = ref(false);
const resetError = ref("");
const resetUser = ref<AdminUserItem | null>(null);

const showCredential = ref(false);
const credential = ref<Credential | null>(null);

const currentUUID = computed(() => dataStore.user?.uuid || "");
const adminCount = computed(() => store.list.filter(user => user.type === "admin").length);
const drawerBusy = computed(() => busy.value);
const listError = computed(() =>
    store.errorCode === 401 ? "登录已失效，请刷新页面重新登录" : store.error
);

watch(
    () => props.show,
    (show) => {
        if (show) {
            editError.value = "";
            pathIDConflict.value = "";
            void store.load();
        }
    }
);

function updateShow(value: boolean) {
    if (drawerBusy.value) {
        return;
    }
    emit("update:show", value);
}

function openCreate() {
    editingUser.value = null;
    editError.value = "";
    pathIDConflict.value = "";
    showEdit.value = true;
}

function openEdit(user: AdminUserItem) {
    editingUser.value = user;
    editError.value = "";
    pathIDConflict.value = "";
    showEdit.value = true;
}

function actionError(code?: number, message?: string) {
    if (code === 401) {
        return "登录已失效，请刷新页面重新登录";
    }
    if (code === 404) {
        void store.load();
        return "该用户已不存在，列表已刷新";
    }
    return message || "操作失败";
}

async function saveUser(payload: any) {
    if (editSaving.value) {
        return;
    }
    editSaving.value = true;
    editError.value = "";
    pathIDConflict.value = "";
    try {
        if (payload.mode === "create") {
            const result = await store.create({
                type: payload.type,
                name: payload.name,
                pathID: payload.pathID,
                secondCode: payload.secondCode
            });
            if (!result.ok) {
                const message = actionError(result.code, result.msg);
                if (result.code === 409 && /path\s*id|路径/i.test(result.msg || "")) {
                    pathIDConflict.value = message;
                }
                else {
                    editError.value = message;
                }
                return;
            }
            showEdit.value = false;
            credential.value = {
                title: "账号已创建",
                name: result.data!.user.name,
                pathID: result.data!.user.pathID,
                secondCode: result.data!.secondCode
            };
            showCredential.value = true;
            return;
        }

        // 自己只提交名称；服务端禁止任何管理员修改自己的类型
        const patch = payload.uuid === currentUUID.value
            ? { name: payload.name }
            : { name: payload.name, type: payload.type };
        const result = await store.update(payload.uuid, patch);
        if (!result.ok) {
            editError.value = actionError(result.code, result.msg);
            return;
        }
        showEdit.value = false;
        if (payload.uuid === currentUUID.value && dataStore.user) {
            dataStore.user = { ...dataStore.user, name: payload.name };
        }
        msg.success("已保存");
    }
    finally {
        editSaving.value = false;
    }
}

function openReset(user: AdminUserItem) {
    showEdit.value = false;
    resetUser.value = user;
    resetError.value = "";
    showReset.value = true;
}

async function submitReset(payload: { uuid: string; secondCode?: string; cleared: boolean }) {
    if (resetSaving.value) {
        return;
    }
    resetSaving.value = true;
    resetError.value = "";
    try {
        const result = await store.resetSecondCode(payload.uuid, payload.secondCode);
        if (!result.ok) {
            resetError.value = actionError(result.code, result.msg);
            return;
        }
        showReset.value = false;
        if (payload.cleared || result.data?.cleared) {
            msg.success("二次码已清除");
            return;
        }
        credential.value = {
            title: "二次码已重置",
            name: result.data!.user.name,
            pathID: result.data!.user.pathID,
            secondCode: result.data!.secondCode
        };
        showCredential.value = true;
    }
    finally {
        resetSaving.value = false;
    }
}

async function removeUser(user: AdminUserItem) {
    if (user.uuid === currentUUID.value || busy.value) {
        return;
    }
    const confirmed = await new Promise<boolean>((resolve) => {
        dialog.warning({
            title: "删除用户",
            content: `确定删除「${user.name}」吗？该用户有 ${user.pageUUIDList.length} 个页面，页面内全部组件数据一并删除，不可恢复。`,
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
        const result = await store.remove(user.uuid);
        if (!result.ok) {
            msg.error(actionError(result.code, result.msg));
            return;
        }
        msg.success("已删除用户");
        for (const warning of result.data?.warnings || []) {
            msg.warning(warning, { duration: 6000 });
        }
    }
    finally {
        busy.value = false;
    }
}
</script>
<style scoped>
.manager {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-width: 640px;
    margin: 0 auto;
    width: 100%;
}

.summary {
    font-size: 12px;
    opacity: 0.58;
}

.skeleton {
    padding: 10px 0;
}

.empty {
    padding: 40px 0;
}

.user-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.user-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.06);
}

.user-row.is-self {
    background: rgba(127, 127, 127, 0.14);
}

.avatar {
    flex: 0 0 auto;
    background: rgba(127, 127, 127, 0.16);
    font-size: 14px;
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
    font-weight: 500;
}

.row-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 2px;
    font-size: 11px;
    opacity: 0.55;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.dot {
    opacity: 0.5;
}

.row-actions {
    flex: 0 0 auto;
}

@media (max-width: 360px) {
    .row-actions :deep(.n-button) {
        width: 26px;
    }
    .row-sub {
        gap: 4px;
    }
}
</style>
