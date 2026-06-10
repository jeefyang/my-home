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
                    <div style="display: flex; gap: 4px">
                        <n-button quaternary size="tiny" type="info" @click="pasteInput"
                            ><template #icon><n-icon :component="Clipboard" size="14" /></template
                        ></n-button>
                        <n-button quaternary size="tiny" type="error" @click="clearInput"
                            ><template #icon><n-icon :component="Trash" size="14" /></template
                        ></n-button>
                    </div>
                </div>
                <n-input v-model:value="inputText" type="textarea" :autosize="{ minRows: 3, maxRows: 4 }" :placeholder="inputPlaceholder" class="dc-input" />
                <n-flex style="margin-top: 6px; gap: 6px">
                    <n-button type="primary" size="small" style="flex: 1" @click="convert('encrypt')">加密 →</n-button>
                    <n-button type="warning" size="small" style="flex: 1" @click="convert('decrypt')">← 解密</n-button>
                </n-flex>
            </div>

            <div class="dc-panel dc-panel-output">
                <div class="dc-panel-header">
                    <span class="dc-label">{{ outputLabel }}</span>
                </div>
                <div class="dc-output mag-output" ref="outputRef">
                    <n-flex class="dc-output-actions" size="small">
                        <n-button quaternary size="tiny" type="warning" @click="copyOutput" title="复制"
                            ><template #icon><n-icon :component="Copy" size="14" /></template
                        ></n-button>
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
import { Utils } from "@/utils";

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
        case "buddha":
            return "明文 / 佛曰密文";
        case "values":
            return "明文 / 核心价值观暗号";
        case "base64":
            return "明文 / Base64";
    }
});
const outputLabel = computed(() => {
    switch (mode.value) {
        case "buddha":
            return "加密 / 解密结果";
        case "values":
            return "编码 / 解码结果";
        case "base64":
            return "编码 / 解码结果";
    }
});
const inputPlaceholder = computed(() => {
    switch (mode.value) {
        case "buddha":
            return "输入明文或 佛曰：...";
        case "values":
            return "输入明文或核心价值观暗号...";
        case "base64":
            return "输入明文或 Base64 编码...";
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
    convert("encrypt");
};

const pasteInput = () => msg.error("无法读取剪贴板");

const clearInput = () => {
    inputText.value = "";
    outputText.value = "";
    outputLines.value = [];
};

const copyOutput = async () => {
    Utils.copyStr(msg,outputText.value, { successMsg: "复制成功", errorMsg: "复制失败" });
};

const convert = async (direction: "encrypt" | "decrypt") => {
    const raw = inputText.value.trim();
    if (!raw) {
        msg.warning("请输入内容");
        return;
    }

    switch (mode.value) {
        case "buddha": {
            try {
                const r = await processBuddha(raw, direction);
                outputText.value = r.text;
                outputLines.value = r.lines;
            } catch (e: any) {
                msg.error("处理失败: " + (e.message || e));
            }
            break;
        }
        case "values": {
            const r = processValues(raw, direction);
            outputText.value = r.text;
            outputLines.value = r.lines;
            break;
        }
        case "base64": {
            const r = processBase64(raw, direction);
            outputText.value = r.text;
            outputLines.value = r.lines;
            break;
        }
    }
};

// ===================================================================
// 与佛论禅 — 兼容 keyfc.net 原版（TudouCode 第一版「佛曰」）
// 算法: AES-256-CBC + UTF-16LE + 128 TUDOU 字映射
// KEY: 固定 'XDXDtudou@KeyFansClub^_^Encode!!'
// IV:  固定 'Potato@Key@_@='
// 前缀: "佛曰："
// ===================================================================
const TUDOU = [
    "滅",
    "苦",
    "婆",
    "娑",
    "耶",
    "陀",
    "跋",
    "多",
    "漫",
    "都",
    "殿",
    "悉",
    "夜",
    "爍",
    "帝",
    "吉",
    "利",
    "阿",
    "無",
    "南",
    "那",
    "怛",
    "喝",
    "羯",
    "勝",
    "摩",
    "伽",
    "謹",
    "波",
    "者",
    "穆",
    "僧",
    "室",
    "藝",
    "尼",
    "瑟",
    "地",
    "彌",
    "菩",
    "提",
    "蘇",
    "醯",
    "盧",
    "呼",
    "舍",
    "佛",
    "參",
    "沙",
    "伊",
    "隸",
    "麼",
    "遮",
    "闍",
    "度",
    "蒙",
    "孕",
    "薩",
    "夷",
    "迦",
    "他",
    "姪",
    "豆",
    "特",
    "逝",
    "朋",
    "輸",
    "楞",
    "栗",
    "寫",
    "數",
    "曳",
    "諦",
    "羅",
    "曰",
    "咒",
    "即",
    "密",
    "若",
    "般",
    "故",
    "不",
    "實",
    "真",
    "訶",
    "切",
    "一",
    "除",
    "能",
    "等",
    "是",
    "上",
    "明",
    "大",
    "神",
    "知",
    "三",
    "藐",
    "耨",
    "得",
    "依",
    "諸",
    "世",
    "槃",
    "涅",
    "竟",
    "究",
    "想",
    "夢",
    "倒",
    "顛",
    "離",
    "遠",
    "怖",
    "恐",
    "有",
    "礙",
    "心",
    "所",
    "以",
    "亦",
    "智",
    "道",
    "。",
    "集",
    "盡",
    "死",
    "老",
    "至"
];
const BYTEMARK = ["冥", "奢", "梵", "呐", "俱", "哆", "怯", "諳", "罰", "侄", "缽", "皤"];

const BUDDHA_KEY = new TextEncoder().encode("XDXDtudou@KeyFansClub^_^Encode!!");
// Pad 14-byte IV to 16 bytes with null bytes (pycrypto behavior)
const BUDDHA_IV = new TextEncoder().encode("Potato@Key@_@=_=");

/** 字节 → 佛经汉字 */
function bytesToBuddha(bytes: Uint8Array): string {
    let result = "佛曰：";
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[i];
        if (byte < 128) result += TUDOU[byte];
        else result += BYTEMARK[0] + TUDOU[byte - 128];
    }
    return result;
}

/** 佛经汉字 → 字节 */
function buddhaToBytes(text: string): Uint8Array {
    let clean = text.replace(/^佛曰[：:]?/, "").trim();
    const bytes: number[] = [];
    let i = 0;
    while (i < clean.length) {
        const ch = clean[i];
        const bmIdx = BYTEMARK.indexOf(ch);
        if (bmIdx >= 0) {
            i++;
            if (i < clean.length) {
                const lowIdx = TUDOU.indexOf(clean[i]);
                if (lowIdx >= 0) bytes.push(lowIdx + 128);
            }
        } else {
            const bIdx = TUDOU.indexOf(ch);
            if (bIdx >= 0) bytes.push(bIdx);
        }
        i++;
    }
    return new Uint8Array(bytes);
}

async function buddhaEncrypt(text: string): Promise<string> {
    // 1. UTF-16LE 编码
    let u16 = "";
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        u16 += String.fromCharCode(code & 0xff, (code >> 8) & 0xff);
    }
    const data = new TextEncoder().encode(u16);

    // 2. PKCS7 填充
    const bs = 16;
    const pads = bs - (data.length % bs);
    const padded = new Uint8Array(data.length + pads);
    padded.set(data);
    for (let i = data.length; i < padded.length; i++) padded[i] = pads;

    // 3. AES-256-CBC 加密
    const encrypted = aesCbcEncrypt(padded, BUDDHA_KEY, BUDDHA_IV);

    return bytesToBuddha(encrypted);
}

async function buddhaDecrypt(text: string): Promise<string> {
    // 1. 汉字 → 字节
    const data = buddhaToBytes(text);

    // 2. AES-256-CBC 解密
    const decrypted = aesCbcDecrypt(data, BUDDHA_KEY, BUDDHA_IV);

    // 3. 去除 PKCS7 填充
    const flag = decrypted[decrypted.length - 1];
    const unpadded = flag < 16 ? decrypted.slice(0, decrypted.length - flag) : decrypted;

    // 4. UTF-16LE → 文本
    const chars: number[] = [];
    for (let i = 0; i < unpadded.length; i += 2) {
        const lo = unpadded[i],
            hi = unpadded[i + 1] || 0;
        if (lo !== 0 || hi !== 0) chars.push(lo | (hi << 8));
    }
    return String.fromCharCode(...chars);
}

async function processBuddha(text: string, direction: "encrypt" | "decrypt"): Promise<{ text: string; lines: OutputLine[] }> {
    const lines: OutputLine[] = [];
    const add = (t: string, c?: boolean) => lines.push({ text: t, isComment: c });
    try {
        if (direction === "decrypt") {
            add("✅ 解密中...");
            const decoded = await buddhaDecrypt(text);
            add(`  解密结果:`);
            lines.push({ text: decoded });
            return { text: decoded, lines };
        } else {
            add("✅ 加密中...");
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
// AES-256-CBC 纯 JS 实现
// ===================================================================
const S_BOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76, 0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15, 0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84, 0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8, 0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73, 0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79, 0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a, 0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf, 0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
];
const RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function keyExpansion256(key: Uint8Array): Uint8Array[] {
    const w: Uint8Array[] = [];
    for (let i = 0; i < 8; i++) w.push(key.slice(i * 4, i * 4 + 4));
    for (let i = 8; i < 60; i++) {
        let temp = new Uint8Array(w[i - 1]);
        if (i % 8 === 0) {
            temp = new Uint8Array([temp[1], temp[2], temp[3], temp[0]]);
            for (let j = 0; j < 4; j++) temp[j] = S_BOX[temp[j]];
            temp[0] ^= RCON[Math.floor(i / 8) - 1];
        } else if (i % 8 === 4) {
            for (let j = 0; j < 4; j++) temp[j] = S_BOX[temp[j]];
        }
        const n = new Uint8Array(4);
        for (let j = 0; j < 4; j++) n[j] = w[i - 8][j] ^ temp[j];
        w.push(n);
    }
    return w;
}

function aesBlockEncrypt(block: Uint8Array, key: Uint8Array): Uint8Array {
    const w = keyExpansion256(key);
    let s = new Uint8Array(block);
    addRoundKey(s, w, 0);
    for (let r = 1; r < 14; r++) {
        subBytes(s);
        shiftRows(s);
        mixColumns(s);
        addRoundKey(s, w, r);
    }
    subBytes(s);
    shiftRows(s);
    addRoundKey(s, w, 14);
    return s;
}

function aesBlockDecrypt(block: Uint8Array, key: Uint8Array): Uint8Array {
    const w = keyExpansion256(key);
    let s = new Uint8Array(block);
    addRoundKey(s, w, 14);
    for (let r = 13; r >= 1; r--) {
        invShiftRows(s);
        invSubBytes(s);
        addRoundKey(s, w, r);
        invMixColumns(s);
    }
    invShiftRows(s);
    invSubBytes(s);
    addRoundKey(s, w, 0);
    return s;
}

function subBytes(s: Uint8Array) {
    for (let i = 0; i < 16; i++) s[i] = S_BOX[s[i]];
}
function invSubBytes(s: Uint8Array) {
    const inv: number[] = [];
    for (let i = 0; i < 256; i++) inv[S_BOX[i]] = i;
    for (let i = 0; i < 16; i++) s[i] = inv[s[i]];
}
function shiftRows(s: Uint8Array) {
    const t = new Uint8Array(s);
    s[1] = t[5];
    s[5] = t[9];
    s[9] = t[13];
    s[13] = t[1];
    s[2] = t[10];
    s[10] = t[2];
    s[6] = t[14];
    s[14] = t[6];
    s[3] = t[15];
    s[15] = t[11];
    s[11] = t[7];
    s[7] = t[3];
}
function invShiftRows(s: Uint8Array) {
    const t = new Uint8Array(s);
    s[1] = t[13];
    s[13] = t[9];
    s[9] = t[5];
    s[5] = t[1];
    s[2] = t[10];
    s[10] = t[2];
    s[6] = t[14];
    s[14] = t[6];
    s[3] = t[7];
    s[7] = t[11];
    s[11] = t[15];
    s[15] = t[3];
}
function gfMul(a: number, b: number): number {
    let p = 0;
    for (let i = 0; i < 8; i++) {
        if (b & 1) p ^= a;
        const hi = a & 0x80;
        a = (a << 1) & 0xff;
        if (hi) a ^= 0x1b;
        b >>= 1;
    }
    return p;
}
function mixColumns(s: Uint8Array) {
    for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const t = [s[i], s[i + 1], s[i + 2], s[i + 3]];
        s[i] = gfMul(2, t[0]) ^ gfMul(3, t[1]) ^ t[2] ^ t[3];
        s[i + 1] = t[0] ^ gfMul(2, t[1]) ^ gfMul(3, t[2]) ^ t[3];
        s[i + 2] = t[0] ^ t[1] ^ gfMul(2, t[2]) ^ gfMul(3, t[3]);
        s[i + 3] = gfMul(3, t[0]) ^ t[1] ^ t[2] ^ gfMul(2, t[3]);
    }
}
function invMixColumns(s: Uint8Array) {
    for (let c = 0; c < 4; c++) {
        const i = c * 4;
        const t = [s[i], s[i + 1], s[i + 2], s[i + 3]];
        s[i] = gfMul(14, t[0]) ^ gfMul(11, t[1]) ^ gfMul(13, t[2]) ^ gfMul(9, t[3]);
        s[i + 1] = gfMul(9, t[0]) ^ gfMul(14, t[1]) ^ gfMul(11, t[2]) ^ gfMul(13, t[3]);
        s[i + 2] = gfMul(13, t[0]) ^ gfMul(9, t[1]) ^ gfMul(14, t[2]) ^ gfMul(11, t[3]);
        s[i + 3] = gfMul(11, t[0]) ^ gfMul(13, t[1]) ^ gfMul(9, t[2]) ^ gfMul(14, t[3]);
    }
}
function addRoundKey(s: Uint8Array, w: Uint8Array[], r: number) {
    for (let i = 0; i < 16; i++) s[i] ^= w[r * 4 + Math.floor(i / 4)][i % 4];
}

function aesCbcEncrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const bs = 16;
    const padded = new Uint8Array(data.length);
    padded.set(data);
    const result = new Uint8Array(padded.length);
    let prev = new Uint8Array(iv);
    for (let block = 0; block < padded.length / bs; block++) {
        const off = block * bs;
        const xored = new Uint8Array(bs);
        for (let j = 0; j < bs; j++) xored[j] = padded[off + j] ^ prev[j];
        const enc = aesBlockEncrypt(xored, key);
        result.set(enc, off);
        prev = new Uint8Array(enc);
    }
    return result;
}

function aesCbcDecrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const bs = 16;
    const result = new Uint8Array(data.length);
    let prev = new Uint8Array(iv);
    for (let block = 0; block < data.length / bs; block++) {
        const off = block * bs;
        const dec = aesBlockDecrypt(data.slice(off, off + bs), key);
        for (let j = 0; j < bs; j++) result[off + j] = dec[j] ^ prev[j];
        prev = data.slice(off, off + bs);
    }
    return result;
}

// ===================================================================
// 核心价值观暗号（hex-digit 映射，兼容 core-values-encoder）
const valueWords = ["富强", "民主", "文明", "和谐", "自由", "平等", "公正", "法治", "爱国", "敬业"];
const carryWord = "诚信"; // 索引 10，表示 hex 值 A-F 需要加 10
const separatorWord = "友善"; // 索引 11，用于分隔字节

const wordToIndex: Record<string, number> = {};
for (let i = 0; i < valueWords.length; i++) wordToIndex[valueWords[i]] = i;
wordToIndex[carryWord] = 10;
wordToIndex[separatorWord] = 11;

function processValues(text: string, direction: "encrypt" | "decrypt"): { text: string; lines: OutputLine[] } {
    const lines: OutputLine[] = [];
    const add = (t: string, c?: boolean) => lines.push({ text: t, isComment: c });
    const clean = text.trim();

    if (direction === "decrypt") {
        add("✅ 解码中...");
        const dec = decodeValues(clean);
        add(`  解码结果（${dec.length} 字符）:`);
        lines.push({ text: dec });
        return { text: dec, lines };
    } else {
        add("✅ 编码中...");
        const enc = encodeValues(clean);
        add(`  编码结果（${enc.length} 字）:`);
        lines.push({ text: enc });
        return { text: enc, lines };
    }
}

function encodeValues(text: string): string {
    const data = new TextEncoder().encode(text);
    const hexStr = Array.from(data)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    const result: string[] = [];
    for (let i = 0; i < hexStr.length; i += 2) {
        if (i > 0) result.push(separatorWord);
        for (let j = 0; j < 2; j++) {
            const digit = parseInt(hexStr[i + j], 16);
            if (digit < 10) result.push(valueWords[digit]);
            else {
                result.push(carryWord);
                result.push(valueWords[digit - 10]);
            }
        }
    }
    return result.join("");
}

/** 按双字词拆分核心价值观暗号文本 */
function tokenizeValues(text: string): string[] {
    const tokens: string[] = [];
    for (let i = 0; i < text.length; i += 2) {
        tokens.push(text.substring(i, i + 2));
    }
    return tokens;
}

function decodeValues(text: string): string {
    const groups = text.split(separatorWord).filter((g) => g.length > 0);
    const bytes: number[] = [];
    for (const group of groups) {
        const tokens = tokenizeValues(group);
        const hexDigits: string[] = [];
        let carry = false;
        for (const tok of tokens) {
            const idx = wordToIndex[tok];
            if (idx === undefined || idx === 11) continue;
            if (idx === 10) {
                carry = true;
                continue;
            }
            if (carry) {
                hexDigits.push((10 + idx).toString(16));
                carry = false;
            } else {
                hexDigits.push(idx.toString(16));
            }
        }
        if (hexDigits.length >= 2) {
            for (let i = 0; i < hexDigits.length; i += 2) {
                bytes.push(parseInt(hexDigits[i] + (hexDigits[i + 1] || "0"), 16));
            }
        }
    }
    return new TextDecoder().decode(new Uint8Array(bytes));
}

// ===================================================================
// Base64
// ===================================================================
function processBase64(text: string, direction: "encrypt" | "decrypt"): { text: string; lines: OutputLine[] } {
    const lines: OutputLine[] = [];
    const add = (t: string, c?: boolean) => lines.push({ text: t, isComment: c });
    const clean = text.trim();
    try {
        if (direction === "decrypt") {
            add("✅ 解码中...");
            // base64 → 字节 → UTF-8 文本
            const binaryStr = atob(clean);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const decoded = new TextDecoder().decode(bytes);
            add(`  解码结果:`);
            lines.push({ text: decoded });
            return { text: decoded, lines };
        } else {
            add("✅ 编码中...");
            // UTF-8 文本 → 字节 → base64
            const data = new TextEncoder().encode(clean);
            let binary = "";
            for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
            const encoded = btoa(binary);
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
.dc-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.dc-options {
    padding: 0 8px 4px;
    flex: none;
}
.dc-opt-label {
    font-size: 12px;
    color: #888;
}
.dc-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 8px 8px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
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
