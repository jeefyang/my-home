<template>
    <n-modal
        :show="show"
        preset="card"
        class="credential-modal"
        :title="local?.title || '账号凭据'"
        :bordered="false"
        :mask-closable="false"
        :closable="false"
        :close-on-esc="false"
        :style="{ width: '92%', maxWidth: '460px' }"
        @update:show="onUpdateShow"
    >
        <n-flex v-if="local" vertical :size="14">
            <n-alert type="error" :bordered="false">
                {{ local.secondCode ? "请立即复制，关闭后不再显示。" : "pathID 可在列表中查看；本次未设置二次码。" }}
            </n-alert>
            <div class="login-link-hint">
                登录链接包含 pathID 与二次码，请只发给该用户。
            </div>

            <div class="credential-row">
                <span class="credential-label">用户名称</span>
                <span class="credential-value">{{ local.name }}</span>
            </div>
            <div class="credential-row">
                <span class="credential-label">pathID</span>
                <span class="credential-value mono">{{ local.pathID }}</span>
                <n-button quaternary circle size="small" title="复制 pathID" aria-label="复制 pathID" @click="copy(local.pathID)">
                    <template #icon><n-icon :component="CopyOutline" /></template>
                </n-button>
            </div>
            <div class="credential-row">
                <span class="credential-label">二次码</span>
                <span class="credential-value mono">{{ local.secondCode || "未设置" }}</span>
                <n-button
                    v-if="local.secondCode"
                    quaternary
                    circle
                    size="small"
                    title="复制二次码"
                    aria-label="复制二次码"
                    @click="copy(local.secondCode!)"
                >
                    <template #icon><n-icon :component="CopyOutline" /></template>
                </n-button>
            </div>
        </n-flex>
        <template #footer>
            <n-flex justify="end" :size="8" wrap class="credential-actions">
                <n-button @click="close">我已保存，关闭</n-button>
                <n-button @click="copyAll">
                    <template #icon><n-icon :component="CopyOutline" /></template>
                    复制全部
                </n-button>
                <n-button ref="copyButton" type="primary" @click="copyLoginLink">
                    <template #icon><n-icon :component="LinkOutline" /></template>
                    复制登录链接
                </n-button>
            </n-flex>
        </template>
    </n-modal>
</template>
<script setup lang="ts">
import { nextTick, ref, watch } from "vue";
import { useMessage } from "naive-ui";
import { CopyOutline, LinkOutline } from "@vicons/ionicons5";
import { buildLoginLink } from "@/utils/userAdmin";

type Credential = {
    title: string;
    name: string;
    pathID: string;
    secondCode?: string;
};

const props = defineProps<{
    show: boolean;
    credential?: Credential | null;
}>();

const emit = defineEmits<{ (e: "update:show", value: boolean): void }>();
const msg = useMessage();
const local = ref<Credential | null>(null);
const copyButton = ref<any>(null);

watch(
    () => props.show,
    async (show) => {
        if (!show) {
            local.value = null;
            return;
        }
        local.value = props.credential ? { ...props.credential } : null;
        await nextTick();
        copyButton.value?.$el?.focus?.();
    }
);

function close() {
    local.value = null;
    emit("update:show", false);
}

function onUpdateShow(value: boolean) {
    if (!value) {
        close();
    }
}

async function writeClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    }
    catch {
        // 浏览器拒绝剪贴板权限时走降级路径
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    let ok = false;
    try {
        ok = document.execCommand("copy");
    }
    catch {
        ok = false;
    }
    document.body.removeChild(textarea);
    return ok;
}

async function copy(text: string) {
    const ok = await writeClipboard(text);
    if (ok) {
        msg.success("已复制");
    }
    else {
        msg.warning("复制失败，请手动选中复制");
    }
}

async function copyAll() {
    if (!local.value) {
        return;
    }
    const second = local.value.secondCode || "未设置";
    await copy(`pathID: ${local.value.pathID}\n二次码: ${second}`);
}

async function copyLoginLink() {
    if (!local.value) {
        return;
    }
    const link = buildLoginLink(window.location.href, local.value.pathID, local.value.secondCode);
    const ok = await writeClipboard(link);
    if (ok) {
        msg.success("登录链接已复制");
    }
    else {
        msg.warning("复制失败，请手动选中复制");
    }
}
</script>
<style scoped>
.login-link-hint {
    margin-top: -6px;
    font-size: 12px;
    line-height: 1.5;
    opacity: 0.58;
}

.credential-actions {
    flex-wrap: wrap;
}

.credential-row {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 34px;
    padding: 6px 10px;
    border-radius: 8px;
    background: rgba(127, 127, 127, 0.08);
}

.credential-label {
    width: 72px;
    flex: 0 0 72px;
    font-size: 12px;
    opacity: 0.62;
}

.credential-value {
    flex: 1;
    min-width: 0;
    overflow-wrap: anywhere;
    user-select: text;
}

.mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
