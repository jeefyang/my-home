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
                    <n-button size="tiny" quaternary @click="loadExample">示例</n-button>
                </n-flex>
            </n-flex>
        </div>

        <div class="dc-body">
            <div class="dc-panel dc-panel-input">
                <div class="dc-panel-header">
                    <span class="dc-label">磁力链接 / Info Hash / 百家姓</span>
                    <div style="display:flex;gap:4px">
                        <n-button quaternary size="tiny" type="info" @click="pasteInput"><template #icon><n-icon :component="Clipboard" size="14" /></template></n-button>
                        <n-button quaternary size="tiny" type="error" @click="clearInput"><template #icon><n-icon :component="Trash" size="14" /></template></n-button>
                    </div>
                </div>
                <n-input v-model:value="inputText" type="textarea" :autosize="{ minRows: 3, maxRows: 4 }" placeholder="粘贴磁力链接、Info Hash 或百家姓暗号..." class="dc-input" />
                <n-button type="primary" size="small" style="margin-top:6px;width:100%" @click="convert">补全 →</n-button>
            </div>

            <div class="dc-panel dc-panel-output">
                <div class="dc-panel-header">
                    <span class="dc-label">完成的磁力链接</span>
                </div>
                <div class="dc-output mag-output" ref="outputRef">
                    <n-flex class="dc-output-actions" size="small">
                        <n-button quaternary size="tiny" type="warning" @click="copyOutput" title="复制"><template #icon><n-icon :component="Copy" size="14" /></template></n-button>
                        <n-button v-if="outputLink" quaternary size="tiny" type="info" @click="openUrl(outputLink)" title="打开"><template #icon><n-icon :component="Link" size="14" /></template></n-button>
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
const outputLink = ref("");
const outputRef = ref<HTMLElement | null>(null);
const includeTrackers = ref(true);

type OutputLine = { text: string; isComment?: boolean };
const outputLines = ref<OutputLine[]>([]);

const examples = [
    "C4B7E5D5A5E5A5E5A5E5A5E5A5E5A5E5A5E5A5",
    "magnet:?xt=urn:btih:C4B7E5D5A5E5A5E5A5E5A5E5A5E5A5E5A5E5A5",
    "赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨"
];

const loadExample = () => {
    inputText.value = examples[Math.floor(Math.random() * examples.length)];
    convert();
};

const pasteInput = () => msg.error("无法读取剪贴板");

const clearInput = () => {
    inputText.value = "";
    outputText.value = "";
    outputLink.value = "";
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

const openUrl = (url: string) => window.open(url, "_blank");

const convert = () => {
    const raw = inputText.value.trim();
    if (!raw) { msg.warning("请输入磁力链接、Info Hash 或百家姓暗号"); return; }
    const r = completeMagnet(raw, includeTrackers.value);
    outputText.value = r.link;
    outputLines.value = r.lines;
    if (r.link) outputLink.value = r.link;
};

// ====== 磁力链接补全 ======
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

/** 百家姓暗号 81 字符完整映射 */
const surnameMap81: Record<string, string> = {
    "赵": "0", "钱": "1", "孙": "2", "李": "3", "周": "4",
    "吴": "5", "郑": "6", "王": "7", "冯": "8", "陈": "9",
    "褚": "a", "卫": "b", "蒋": "c", "沈": "d", "韩": "e", "杨": "f",
    "朱": "g", "秦": "h", "尤": "i", "许": "j", "何": "k", "吕": "l",
    "施": "m", "张": "n", "孔": "o", "曹": "p", "严": "q", "华": "r",
    "金": "s", "魏": "t", "陶": "u", "姜": "v", "戚": "w", "谢": "x",
    "邹": "y", "喻": "z",
    "福": "A", "水": "B", "窦": "C", "章": "D", "云": "E", "苏": "F",
    "潘": "G", "葛": "H", "奚": "I", "范": "J", "彭": "K", "郎": "L",
    "鲁": "M", "韦": "N", "昌": "O", "马": "P", "苗": "Q", "凤": "R",
    "花": "S", "方": "T", "俞": "U", "任": "V", "袁": "W", "柳": "X",
    "唐": "Y", "罗": "Z",
    // URL 特殊符号 (13个)
    "薛":".", "伍":"-", "余":"_", "米":"+", "贝":"=",
    "姚":"/", "孟":"?", "顾":"#", "尹":"%", "江":"&", "钟":"*", "竺":":", "赖":"|",
    "卜":"|"
};

function completeMagnet(input: string, addTrackers: boolean): { link: string; lines: OutputLine[] } {
    const lines: OutputLine[] = [];
    const add = (text: string, comment?: boolean) => lines.push({ text, isComment: comment });

    let hash = "";
    let existingTrs: string[] = [];
    let clean = input.trim();

    if (clean.startsWith("magnet:?")) {
        add("✅ 检测到完整磁力链接，解析参数...");
        const params = new URLSearchParams(clean.substring(8));
        const xt = params.get("xt") || "";
        if (xt.startsWith("urn:btih:")) { hash = xt.substring(9); add(`  xt (info hash): ${hash}`); }
        else add("  ⚠️ 未找到 xt=urn:btih: 参数", true);
        const trs = params.getAll("tr");
        for (const tr of trs) { existingTrs.push(tr); add(`  tr: ${tr}`); }
        add(trs.length > 0 ? `  ✅ 已有 ${trs.length} 个 Tracker` : "  ⚠️ 无 Tracker", trs.length === 0);
    } else {
        add("⚠️ 非完整磁力链接，尝试提取 Info Hash...", true);
        const hasChinese = /[\u4e00-\u9fff]/.test(clean);
        if (hasChinese) {
            let decoded = "";
            let unknown = "";
            for (const ch of clean) { const h = surnameMap81[ch]; if (h !== undefined) decoded += h; else unknown += ch; }
            if (decoded && (/^[0-9a-fA-F]+$/.test(decoded) || decoded.startsWith("magnet:?") || decoded.includes("&tr="))) {
                if (unknown) add(`  ⚠️ 有 ${unknown.length} 个字符未识别: ${unknown}`, true);
                add(`  ✅ 检测到百家姓暗号，已解码`);
                if (decoded.startsWith("magnet:?")) {
                    // 完整磁链，提取 hash
                    const m = decoded.match(/xt=urn:btih:([A-Fa-f0-9]+)/);
                    if (m) { hash = m[1].toUpperCase(); add(`  Info Hash: ${hash}`); }
                    else { add("  ⚠️ 解码结果未找到 Info Hash", true); }
                    add(`  完整链接: ${decoded}`);
                    outputLink.value = decoded;
                } else if (decoded.includes("&tr=")) {
                    // 已带 Tracker，提取 hash 然后保留原有 tracker
                    const parts = decoded.split("&tr=");
                    const rawHash = parts[0].replace(/[^A-Fa-f0-9]/g, "");
                    if (rawHash.length >= 32) {
                        hash = rawHash.toUpperCase().substring(0, 40);
                        add(`  Info Hash: ${hash}`);
                        for (let i = 1; i < parts.length; i++) {
                            existingTrs.push(parts[i]);
                            add(`  tr: ${parts[i]}`);
                        }
                    } else {
                        add("  ⚠️ 未找到有效的 Info Hash", true);
                    }
                } else {
                    // 纯 hash
                    hash = decoded.toUpperCase();
                    add(`  Info Hash: ${hash}`);
                }
            } else { add("  ❌ 包含中文字符但解码失败", true); return { link: "", lines }; }
        } else {
            const hashMatch = clean.match(/[A-Fa-f0-9]{32,40}/);
            if (hashMatch) { hash = hashMatch[0].toUpperCase(); add(`  Info Hash: ${hash}`); }
            else { add("  ❌ 未找到有效的 Info Hash", true); return { link: "", lines }; }
        }
    }

    if (!hash) { add("❌ 无法提取 Info Hash", true); return { link: "", lines }; }
    hash = hash.toUpperCase().substring(0, 40);
    if (hash.length < 40) add(`  ℹ️ Hash 长度不足，补全到 40 位`);

    add(""); add("━━━ 生成磁力链接 ━━━");
    let magnet = `magnet:?xt=urn:btih:${hash}`;
    for (const tr of existingTrs) magnet += `&tr=${tr}`;
    if (addTrackers && existingTrs.length === 0) {
        let added = 0;
        for (const tr of defaultTrackers) { magnet += `&tr=${tr}`; added++; }
        if (added > 0) add(`  + ${added} 个默认 Tracker`);
    } else if (existingTrs.length > 0) {
        add(`  ✅ 已保留 ${existingTrs.length} 个原有 Tracker`);
    }
    add(`  协议: magnet:`);
    add(`  Hash: ${hash}`);
    add(`  Tracker: ${existingTrs.length > 0 ? existingTrs.length : (addTrackers ? defaultTrackers.length : 0)} 个`);
    return { link: magnet, lines };
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
