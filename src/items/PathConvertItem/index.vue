<template>
    <div class="ps-wrap">
        <n-divider v-if="props.display != 'btn' && props.display != 'icon'" style="margin-top: 0; margin-bottom: 6px" dashed>
            <div style="font-size: 12px">{{ props.item?.options?.title || "路径符号转换" }}</div>
        </n-divider>

        <div class="ps-options">
            <n-flex justify="space-between" align="center">
                <n-radio-group v-model:value="target" size="small">
                    <n-radio-button value="/">→ /</n-radio-button>
                    <n-radio-button value="\\">→ \</n-radio-button>
                    <n-radio-button value="\\\\">→ \\</n-radio-button>
                </n-radio-group>
                <n-flex align="center" size="small">
                    <n-button size="tiny" quaternary @click="pasteInput"><template #icon><n-icon :component="Clipboard" size="14" /></template></n-button>
                    <n-button size="tiny" quaternary type="error" @click="clearInput"><template #icon><n-icon :component="Trash" size="14" /></template></n-button>
                </n-flex>
            </n-flex>
        </div>

        <div class="ps-body">
            <div class="ps-panel ps-panel-input">
                <span class="ps-label">原路径</span>
                <n-input v-model:value="inputText" type="textarea" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="粘贴路径..." class="ps-input" />
                <n-button type="primary" size="small" style="margin-top:4px;width:100%" @click="convert">转换 →</n-button>
            </div>

            <div class="ps-panel ps-panel-output">
                <span class="ps-label">转换结果</span>
                <div class="ps-output" ref="outputRef">
                    <n-flex class="ps-output-actions" size="small">
                        <n-button quaternary size="tiny" type="warning" @click="copyOutput" title="复制"><template #icon><n-icon :component="Copy" size="14" /></template></n-button>
                    </n-flex>
                    <div v-if="outputText" class="ps-result" v-text="outputText"></div>
                    <div v-else class="ps-placeholder">转换后的路径将显示在这里</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Clipboard, Copy, Trash } from "@vicons/tabler";
import { useMessage } from "naive-ui";

const msg = useMessage();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    display: ItemDisplayType;
}>();

const inputText = ref("");
const outputText = ref("");
const outputRef = ref<HTMLElement | null>(null);
const target = ref<"/" | "\\" | "\\\\">("/");

const pasteInput = async () => {
    try { inputText.value = await navigator.clipboard.readText(); msg.success("已粘贴"); }
    catch { msg.error("无法读取剪贴板"); }
};

const clearInput = () => { inputText.value = ""; outputText.value = ""; };

const copyOutput = async () => {
    if (!outputText.value) { msg.warning("没有内容可复制"); return; }
    try { await navigator.clipboard.writeText(outputText.value); msg.success("已复制"); }
    catch {
        const ta = document.createElement("textarea");
        ta.value = outputText.value; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
        msg.success("已复制");
    }
};

const convert = () => {
    const raw = inputText.value;
    if (!raw) { msg.warning("请输入路径"); return; }
    // 先将各种斜杠统一为 /
    let unified = raw.replace(/\\\\/g, "/").replace(/\\/g, "/");
    // 再替换为目标符号
    if (target.value === "/") {
        outputText.value = unified;
    } else if (target.value === "\\") {
        outputText.value = unified.replace(/\//g, "\\");
    } else {
        outputText.value = unified.replace(/\//g, "\\\\");
    }
};
</script>

<style scoped>
.ps-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.ps-options { padding: 0 8px 4px; flex: none; }
.ps-body { display: flex; flex-direction: column; gap: 6px; padding: 0 8px 8px; flex: 1; min-height: 0; overflow: hidden; }
.ps-panel { display: flex; flex-direction: column; }
.ps-panel-input { flex: none; }
.ps-panel-output { flex: 1; min-height: 0; }
.ps-label { font-size: 12px; font-weight: 600; color: #888; margin-bottom: 4px; }
.ps-output { flex: 1; min-height: 0; background: #1e1e2e; border-radius: 6px; padding: 10px 12px; padding-top: 28px; font-family: "Cascadia Code","Fira Code","JetBrains Mono",monospace; font-size: 12px; line-height: 1.6; color: #cdd6f4; overflow-y: auto; position: relative; }
.ps-output-actions { position: absolute; top: 4px; right: 4px; opacity: 0; transition: opacity 0.15s; z-index: 1; gap: 2px; }
.ps-output:hover .ps-output-actions, .ps-output-actions:focus-within { opacity: 1; }
@media (hover: none) { .ps-output-actions { opacity: 1; top: 6px; right: 6px; } }
.ps-output::-webkit-scrollbar { width: 6px; }
.ps-output::-webkit-scrollbar-track { background: transparent; }
.ps-output::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
.ps-output::-webkit-scrollbar-thumb:hover { background: #585b70; }
.ps-result { white-space: pre-wrap; word-break: break-all; }
.ps-placeholder { color: #585b70; text-align: center; padding: 32px 0; }
</style>
