<template>
    <div class="dc-wrap">
        <n-divider v-if="props.display != 'btn' && props.display != 'icon'" style="margin-top: 0; margin-bottom: 6px" dashed>
            <div style="font-size: 12px">{{ props.item?.options?.title || "暗号工具" }}</div>
        </n-divider>

        <div class="dc-options">
            <n-flex justify="space-between" align="center">
                <n-radio-group v-model:value="mode" size="small">
                    <n-radio-button value="buddha">与佛论禅</n-radio-button>
                    <n-radio-button value="values">核心价值观</n-radio-button>
                    <n-radio-button value="base64">Base64</n-radio-button>
                </n-radio-group>
                <n-flex align="center" size="small" style="gap: 4px">
                    <n-button size="tiny" quaternary @click="loadExample">示例</n-button>
                </n-flex>
            </n-flex>
        </div>

        <div class="dc-body">
            <div class="dc-panel dc-panel-input">
                <div class="dc-panel-header">
                    <span class="dc-label">{{ inputLabel }}</span>
                    <div style="display:flex;gap:4px">
                        <n-button quaternary size="tiny" type="info" @click="pasteInput"><template #icon><n-icon :component="Clipboard" size="14" /></template></n-button>
                        <n-button quaternary size="tiny" type="error" @click="clearInput"><template #icon><n-icon :component="Trash" size="14" /></template></n-button>
                    </div>
                </div>
                <n-input v-model:value="inputText" type="textarea" :autosize="{ minRows: 3, maxRows: 4 }" :placeholder="inputPlaceholder" class="dc-input" />
                <n-button type="primary" size="small" style="margin-top:6px;width:100%" @click="convert">转换 →</n-button>
            </div>

            <div class="dc-panel dc-panel-output">
                <div class="dc-panel-header">
                    <span class="dc-label">{{ outputLabel }}</span>
                </div>
                <div class="dc-output mag-output" ref="outputRef">
                    <n-flex class="dc-output-actions" size="small">
                        <n-button quaternary size="tiny" type="warning" @click="copyOutput" title="复制"><template #icon><n-icon :component="Copy" size="14" /></template></n-button>
                    </n-flex>
                    <div class="dc-line" v-for="(line, idx) in outputLines" :key="idx">
                        <span v-if="line.isComment" class="dc-comment">{{ line.text }}</span>
                        <span v-else>{{ line.text }}</span>
                    </div>
                    <div v-if="!outputText" class="dc-placeholder">{{ outputPlaceholder }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { Clipboard, Copy, Trash } from "@vicons/tabler";
import { useMessage } from "naive-ui";

const msg = useMessage();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    display: ItemDisplayType;
}>();

const mode = ref<"buddha" | "values" | "base64">("buddha");
const inputText = ref("");
const outputText = ref("");
const outputRef = ref<HTMLElement | null>(null);

type OutputLine = { text: string; isComment?: boolean };
const outputLines = ref<OutputLine[]>([]);

const inputLabel = computed(() => {
    switch (mode.value) {
        case "buddha": return "明文 / 佛曰密文";
        case "values": return "明文 / 核心价值观暗号";
        case "base64": return "明文 / Base64";
    }
});
const outputLabel = computed(() => {
    switch (mode.value) {
        case "buddha": return "加密 / 解密结果";
        case "values": return "编码 / 解码结果";
        case "base64": return "编码 / 解码结果";
    }
});
const inputPlaceholder = computed(() => {
    switch (mode.value) {
        case "buddha": return "输入明文或 佛曰：...";
        case "values": return "输入明文或核心价值观暗号...";
        case "base64": return "输入明文或 Base64 编码...";
    }
});
const outputPlaceholder = computed(() => "转换结果将显示在这里");

const examples: Record<string, string> = {
    buddha: "hello world",
    values: "hello",
    base64: "hello world"
};

const loadExample = () => {
    inputText.value = examples[mode.value] || "";
    convert();
};

const pasteInput = () => msg.error("无法读取剪贴板");

const clearInput = () => {
    inputText.value = "";
    outputText.value = "";
    outputLines.value = [];
};

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

const convert = async () => {
    const raw = inputText.value.trim();
    if (!raw) { msg.warning("请输入内容"); return; }

    switch (mode.value) {
        case "buddha": {
            try {
                const r = await processBuddha(raw);
                outputText.value = r.text;
                outputLines.value = r.lines;
            } catch (e: any) { msg.error("处理失败: " + (e.message || e)); }
            break;
        }
        case "values": {
            const r = processValues(raw);
            outputText.value = r.text;
            outputLines.value = r.lines;
            break;
        }
        case "base64": {
            const r = processBase64(raw);
            outputText.value = r.text;
            outputLines.value = r.lines;
            break;
        }
    }
};

// ===================================================================
// 与佛论禅 (AES-256-CBC via Web Crypto API)
// ===================================================================
const buddhaChars = "滅苦娑婆耶陀跋多漫若波羅蜜亦說此經已還祇樹給孤獨園爾時須菩提聞說是深解義趣涕淚悲泣而白佛言希有世尊如來善護念諸菩薩善付囑處汝今諦聽當為汝告男子女人發阿耨多羅三藐三菩提心應如是住降伏其命須菩提於意云何可以相見不也世尊不可身相即非名行住坐臥來生法者種諸善根無量百千萬劫乃至算數譬喻何況其所得福德如河沙數所說受持讀誦悉為人演說其福勝供養承事我皆隨喜菩提亦無實虛故是諸恒所有果實則有最第一希有功德經典所在之處即為是塔若尊重弟子";
const buddhaHigh = "日月星辰天人阿修羅";

function bytesToBuddha(bytes: Uint8Array): string {
    let result = "佛曰：";
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte < 128) { result += buddhaChars[byte]; }
        else { const low = byte - 128; result += buddhaHigh[low % buddhaHigh.length] + buddhaChars[Math.floor(low / buddhaHigh.length) % buddhaChars.length]; }
    }
    return result;
}

function buddhaToBytes(text: string): Uint8Array {
    let clean = text.replace(/^佛曰[：:]?/, "").trim();
    const bytes: number[] = [];
    let i = 0;
    while (i < clean.length) {
        const ch = clean[i];
        const idx = buddhaHigh.indexOf(ch);
        if (idx >= 0) {
            i++;
            if (i < clean.length) {
                const lowIdx = buddhaChars.indexOf(clean[i]);
                if (lowIdx >= 0) bytes.push(128 + idx + lowIdx * buddhaHigh.length);
            }
        } else {
            const bIdx = buddhaChars.indexOf(ch);
            if (bIdx >= 0) bytes.push(bIdx);
        }
        i++;
    }
    return new Uint8Array(bytes);
}

async function buddhaEncrypt(text: string): Promise<string> {
    const keyData = new TextEncoder().encode("keyfc");
    const keyHash = await crypto.subtle.digest("SHA-256", keyData);
    const keyArr = new Uint8Array(keyHash);
    const key = await crypto.subtle.importKey("raw", keyArr.slice(0, 32).buffer as ArrayBuffer, { name: "AES-CBC" }, false, ["encrypt"]);
    const iv = keyArr.slice(16, 32).buffer as ArrayBuffer;
    const data = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv }, key, data);
    return bytesToBuddha(new Uint8Array(encrypted));
}

async function buddhaDecrypt(text: string): Promise<string> {
    const keyData = new TextEncoder().encode("keyfc");
    const keyHash = await crypto.subtle.digest("SHA-256", keyData);
    const keyArr = new Uint8Array(keyHash);
    const key = await crypto.subtle.importKey("raw", keyArr.slice(0, 32).buffer as ArrayBuffer, { name: "AES-CBC" }, false, ["decrypt"]);
    const iv = keyArr.slice(16, 32).buffer as ArrayBuffer;
    const bytes = buddhaToBytes(text);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, bytes);
    return new TextDecoder().decode(decrypted);
}

async function processBuddha(text: string): Promise<{ text: string; lines: OutputLine[] }> {
    const lines: OutputLine[] = [];
    const add = (t: string, c?: boolean) => lines.push({ text: t, isComment: c });
    try {
        if (text.startsWith("佛曰") || text.startsWith("佛曰")) {
            add("✅ 检测到佛曰密文，开始解密...");
            const decoded = await buddhaDecrypt(text);
            add(`  解密结果:`);
            lines.push({ text: decoded });
            return { text: decoded, lines };
        } else {
            add("✅ 检测到明文，开始加密...");
            const encoded = await buddhaEncrypt(text);
            add(`  加密结果（${encoded.length} 字）:`);
            lines.push({ text: encoded });
            return { text: encoded, lines };
        }
    } catch (e: any) {
        add("❌ 处理失败: " + (e.message || e), true);
        return { text: "", lines };
    }
}

// ===================================================================
// 核心价值观暗号（base-12）
// ===================================================================
const valueChars = ["富强", "民主", "文明", "和谐", "自由", "平等", "公正", "法治", "爱国", "敬业", "诚信", "友善"];
const valueMap: Record<string, number> = {};
for (let i = 0; i < valueChars.length; i++) valueMap[valueChars[i]] = i;

function processValues(text: string): { text: string; lines: OutputLine[] } {
    const lines: OutputLine[] = [];
    const add = (t: string, c?: boolean) => lines.push({ text: t, isComment: c });
    const clean = text.trim();
    const valueRegex = new RegExp(`^[${valueChars.join("")}]+$`);
    if (valueRegex.test(clean)) {
        add("✅ 检测到核心价值观暗号，开始解码...");
        const bytes: number[] = [];
        for (let i = 0; i < clean.length; i += 2) {
            const pair = clean.substring(i, i + 2);
            if (pair.length === 2 && valueMap[pair] !== undefined) bytes.push(valueMap[pair]);
            else if (pair.length === 2) { add(`  ⚠️ 无法识别的组合: ${pair}`, true); return { text: "", lines }; }
        }
        const decoded = new TextDecoder().decode(new Uint8Array(bytes));
        add(`  解码结果（${bytes.length} 字节）:`);
        lines.push({ text: decoded });
        return { text: decoded, lines };
    } else {
        add("✅ 检测到明文，开始编码...");
        const data = new TextEncoder().encode(clean);
        let result = "";
        for (const byte of data) result += valueChars[byte];
        add(`  编码结果（${result.length} 字）:`);
        lines.push({ text: result });
        return { text: result, lines };
    }
}

// ===================================================================
// Base64
// ===================================================================
function processBase64(text: string): { text: string; lines: OutputLine[] } {
    const lines: OutputLine[] = [];
    const add = (t: string, c?: boolean) => lines.push({ text: t, isComment: c });
    const clean = text.trim();
    try {
        if (/^[A-Za-z0-9+/=]+$/.test(clean) && clean.length >= 4) {
            add("✅ 检测到 Base64 编码，开始解码...");
            const decoded = atob(clean);
            let humanReadable = true;
            for (let i = 0; i < decoded.length; i++) {
                const cc = decoded.charCodeAt(i);
                if (cc < 32 && cc !== 10 && cc !== 13) { humanReadable = false; break; }
            }
            if (humanReadable) {
                add(`  解码结果:`);
                lines.push({ text: decoded });
                return { text: decoded, lines };
            } else {
                const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
                const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(' ');
                add(`  ⚠️ 非文本数据，显示为 Hex:`);
                lines.push({ text: hex });
                return { text: decoded, lines };
            }
        } else {
            add("✅ 检测到明文，开始编码...");
            const encoded = btoa(clean);
            add(`  编码结果（${encoded.length} 字符）:`);
            lines.push({ text: encoded });
            return { text: encoded, lines };
        }
    } catch (e: any) {
        add("❌ 处理失败: " + (e.message || e), true);
        return { text: "", lines };
    }
}
</script>

<style scoped>
.dc-wrap { width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.dc-options { padding: 0 8px 4px; flex: none; }
.dc-opt-label { font-size: 12px; color: #888; }
.dc-body { display: flex; flex-direction: column; gap: 6px; padding: 0 8px 8px; flex: 1; min-height: 0; overflow: hidden; }
.dc-panel { display: flex; flex-direction: column; }
.dc-panel-input { flex: none; }
.dc-panel-output { flex: 1; min-height: 0; }
.dc-panel-output .mag-output { flex: 1; min-height: 0; overflow-y: auto; position: relative; }
.dc-output-actions { position: absolute; top: 4px; right: 4px; opacity: 0; transition: opacity 0.15s; z-index: 1; gap: 2px; }
.mag-output:hover .dc-output-actions, .dc-output-actions:focus-within { opacity: 1; }
@media (hover: none) { .dc-output-actions { opacity: 1; top: 6px; right: 6px; } }
.mag-output::-webkit-scrollbar { width: 6px; }
.mag-output::-webkit-scrollbar-track { background: transparent; }
.mag-output::-webkit-scrollbar-thumb { background: #45475a; border-radius: 3px; }
.mag-output::-webkit-scrollbar-thumb:hover { background: #585b70; }
.dc-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.dc-label { font-size: 12px; font-weight: 600; color: #888; }
.mag-output { background: #1e1e2e; border-radius: 6px; padding: 10px 12px; padding-top: 28px; font-family: "Cascadia Code","Fira Code","JetBrains Mono",monospace; font-size: 12px; line-height: 1.6; color: #cdd6f4; }
.dc-line { white-space: pre-wrap; word-break: break-all; }
.dc-comment { color: #6c7086; font-style: italic; }
.dc-placeholder { color: #585b70; text-align: center; padding: 32px 0; }
</style>
