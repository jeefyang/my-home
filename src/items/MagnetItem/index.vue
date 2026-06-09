<template>
    <div class="dc-wrap">
        <n-divider v-if="props.display != 'btn' && props.display != 'icon'" style="margin-top: 0; margin-bottom: 6px" dashed>
            <div style="font-size: 12px">{{ props.item?.options?.title || "磁力链接补全" }}</div>
        </n-divider>

        <div class="dc-options">
            <n-flex justify="space-between" align="center">
                <n-flex align="center" size="small">
                    <span class="dc-opt-label">Tracker</span>
                    <n-switch v-model:value="includeTrackers" size="small" />
                </n-flex>
                <n-flex align="center" size="small" style="gap: 4px">
                    <n-button size="tiny" quaternary @click="loadExample(0)">样例1</n-button>
                    <n-button size="tiny" quaternary @click="loadExample(1)">样例2</n-button>
                    <n-button size="tiny" quaternary @click="loadExample(2)">样例3</n-button>
                </n-flex>
            </n-flex>
        </div>

        <div class="dc-body">
            <div class="dc-panel dc-panel-input">
                <div class="dc-panel-header">
                    <span class="dc-label">磁力链接 / Info Hash</span>
                    <div style="display:flex;gap:4px">
                        <n-button quaternary size="tiny" type="info" @click="pasteInput"><template #icon><n-icon :component="Clipboard" size="14" /></template></n-button>
                        <n-button quaternary size="tiny" type="error" @click="clearInput"><template #icon><n-icon :component="Trash" size="14" /></template></n-button>
                    </div>
                </div>
                <n-input v-model:value="inputText" type="textarea" :autosize="{ minRows: 3, maxRows: 4 }" placeholder="粘贴磁力链接或 Info Hash..." class="dc-input" />
                <n-button type="primary" size="small" style="margin-top:6px;width:100%" @click="convert">补全 →</n-button>
            </div>

            <div class="dc-panel dc-panel-output">
                <div class="dc-panel-header">
                    <span class="dc-label">完成的磁力链接</span>
                </div>
                <div class="dc-output mag-output" ref="outputRef">
                    <n-flex class="dc-output-actions" size="small">
                        <n-button quaternary size="tiny" type="warning" @click="copyOutput" title="复制"><template #icon><n-icon :component="Copy" size="14" /></template></n-button>
                        <n-button quaternary size="tiny" type="info" @click="openOutput" title="打开" :disabled="!outputText"><template #icon><n-icon :component="Link" size="14" /></template></n-button>
                    </n-flex>
                    <div class="dc-line" v-for="(line, idx) in outputLines" :key="idx">
                        <span v-if="line.isComment" class="dc-comment">{{ line.text }}</span>
                        <span v-else>{{ line.text }}</span>
                    </div>
                    <div v-if="!outputText" class="dc-placeholder">补全后的链接将显示在这里</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Clipboard, Copy, Link, Trash } from "@vicons/tabler";
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
const includeTrackers = ref(true);

type OutputLine = { text: string; isComment?: boolean };
const outputLines = ref<OutputLine[]>([]);

/** 常用 Tracker 列表 */
const defaultTrackers = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://tracker.openbittorrent.com:6969/announce",
    "udp://tracker.trackerfix.com:80/announce",
    "udp://exodus.desync.com:6969/announce",
    "udp://tracker.dler.org:6969/announce",
    "udp://tracker.tiny-vps.com:6969/announce",
    "udp://open.demonii.com:1337/announce",
    "https://tracker.measureofage.com:443/announce",
    "https://tracker.foo.team:443/announce",
    "udp://tracker.leech.ie:1337/announce",
    "udp://tracker.coppersurfer.tk:6969/announce",
    "udp://tracker.pirateparty.gr:6969/announce",
    "udp://ipv4.tracker.harry.lu:80/announce",
    "udp://9.rarbg.com:2810/announce"
];

const examples = [
    "C4B7E5D5A5E5A5E5A5E5A5E5A5E5A5E5A5E5A5",
    "magnet:?xt=urn:btih:C4B7E5D5A5E5A5E5A5E5A5E5A5E5A5E5A5E5A5",
    "d5f05e7b7c7a5e5e5e5e5e5e5e5e5e5e5e5e5e5e"
];

const loadExample = (idx: number) => {
    inputText.value = examples[idx] || "";
    convert();
};

const pasteInput = async () => {
    try {
        inputText.value = await navigator.clipboard.readText();
        msg.success("已粘贴");
    } catch {
        msg.error("无法读取剪贴板");
    }
};

const clearInput = () => {
    inputText.value = "";
    outputText.value = "";
    outputLines.value = [];
};

const copyOutput = async () => {
    if (!outputText.value) { msg.warning("没有内容可复制"); return; }
    try {
        await navigator.clipboard.writeText(outputText.value);
        msg.success("已复制");
    } catch {
        const ta = document.createElement("textarea");
        ta.value = outputText.value;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        msg.success("已复制");
    }
};

const openOutput = () => {
    if (!outputText.value) return;
    window.open(outputText.value, "_blank");
};

const convert = () => {
    const raw = inputText.value.trim();
    if (!raw) { msg.warning("请先输入磁力链接或 Info Hash"); return; }

    const result = completeMagnet(raw, includeTrackers.value);
    outputText.value = result.link;
    outputLines.value = result.lines;
};

// ====== 补全逻辑 ======
function completeMagnet(input: string, addTrackers: boolean): { link: string; lines: OutputLine[] } {
    const lines: OutputLine[] = [];
    const add = (text: string, comment?: boolean) => lines.push({ text, isComment: comment });

    let hash = "";
    let existingTrs: string[] = [];

    // 1. 清理输入
    let clean = input.trim();

    // 检测是否为完整的 magnet 链接
    if (clean.startsWith("magnet:?")) {
        add("✅ 检测到完整磁力链接，解析参数...");
        const params = new URLSearchParams(clean.substring(8));
        // 提取 info hash
        const xt = params.get("xt") || "";
        if (xt.startsWith("urn:btih:")) {
            hash = xt.substring(9);
            add(`  xt (info hash): ${hash}`);
        } else {
            add("  ⚠️ 未找到 xt=urn:btih: 参数", true);
        }
        // 提取已有的 tr
        const trs = params.getAll("tr");
        for (const tr of trs) {
            existingTrs.push(tr);
            add(`  tr: ${tr}`);
        }
        if (trs.length > 0) {
            add(`  ✅ 已有 ${trs.length} 个 Tracker`);
        } else {
            add("  ⚠️ 无 Tracker", true);
        }
    } else {
        add("⚠️ 非完整磁力链接，尝试提取 Info Hash...", true);
        // 尝试提取 hash — 可能是纯 hex 字符串
        const hashMatch = clean.match(/[A-Fa-f0-9]{32,40}/);
        if (hashMatch) {
            hash = hashMatch[0].toUpperCase();
            add(`  Info Hash: ${hash}`);
        } else {
            add("  ❌ 未找到有效的 Info Hash（32-40 位 hex）", true);
            return { link: "", lines };
        }
    }

    // 2. 构建输出
    if (!hash) {
        add("❌ 无法提取 Info Hash", true);
        return { link: "", lines };
    }

    // 补全到 40 位（BTIH 标准）
    hash = hash.toUpperCase();
    if (hash.length < 40) {
        // 可能是 32 位 ed2k 或截断，补成 40
        add(`  ℹ️ Hash 长度 ${hash.length}，补全到 40 位`);
    }
    // 只取前 40 位
    hash = hash.substring(0, 40);

    add("");
    add("━━━ 生成磁力链接 ━━━");

    let magnet = `magnet:?xt=urn:btih:${hash}`;

    // 添加已有的 Tracker
    for (const tr of existingTrs) {
        magnet += `&tr=${encodeURIComponent(tr)}`;
    }

    // 添加默认 Tracker
    if (addTrackers) {
        const added: string[] = [];
        for (const tr of defaultTrackers) {
            if (!existingTrs.includes(tr)) {
                magnet += `&tr=${encodeURIComponent(tr)}`;
                added.push(tr);
            }
        }
        if (added.length > 0) {
            add(`  + ${added.length} 个默认 Tracker`);
        }
    }

    // 显示摘要
    add(`  协议: magnet:`);
    add(`  Hash: ${hash}`);
    add(`  Tracker: ${(existingTrs.length + (addTrackers ? defaultTrackers.filter(t => !existingTrs.includes(t)).length : 0))} 个`);

    return { link: magnet, lines };
}
</script>

<style scoped>
/* 复用 DockerConvertItem 的样式 */
.dc-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.dc-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 6px 8px 0;
    flex: 1;
    min-height: 0;
    overflow: hidden;
}

.dc-options {
    padding: 0 8px;
    flex: none;
}

.dc-opt-label {
    font-size: 12px;
    color: #888;
}

.dc-panel {
    display: flex;
    flex-direction: column;
}

.dc-panel-input {
    flex: none;
}

.dc-panel-output {
    flex: 1;
    min-height: 0;
}

.dc-panel-output .mag-output {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    position: relative;
}

.dc-output-actions {
    position: absolute;
    top: 4px;
    right: 4px;
    opacity: 0;
    transition: opacity 0.15s;
    z-index: 1;
    gap: 2px;
}

.mag-output:hover .dc-output-actions,
.dc-output-actions:focus-within {
    opacity: 1;
}

@media (hover: none) {
    .dc-output-actions {
        opacity: 1;
        top: 6px;
        right: 6px;
    }
}

.mag-output::-webkit-scrollbar {
    width: 6px;
}

.mag-output::-webkit-scrollbar-track {
    background: transparent;
}

.mag-output::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
}

.mag-output::-webkit-scrollbar-thumb:hover {
    background: #585b70;
}

.dc-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.dc-label {
    font-size: 12px;
    font-weight: 600;
    color: #888;
}

.mag-output {
    background: #1e1e2e;
    border-radius: 6px;
    padding: 10px 12px;
    padding-top: 28px;
    font-family: "Cascadia Code", "Fira Code", "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #cdd6f4;
}

.dc-line {
    white-space: pre-wrap;
    word-break: break-all;
}

.dc-comment {
    color: #6c7086;
    font-style: italic;
}

.dc-placeholder {
    color: #585b70;
    text-align: center;
    padding: 32px 0;
}
</style>
