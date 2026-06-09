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
                <n-flex style="margin-top:6px;gap:6px">
                    <n-button type="primary" size="small" style="flex:1" @click="convert('encrypt')">加密 →</n-button>
                    <n-button type="warning" size="small" style="flex:1" @click="convert('decrypt')">← 解密</n-button>
                </n-flex>
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
    convert("encrypt");
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

const convert = async (direction: "encrypt" | "decrypt") => {
    const raw = inputText.value.trim();
    if (!raw) { msg.warning("请输入内容"); return; }

    switch (mode.value) {
        case "buddha": {
            try {
                const r = await processBuddha(raw, direction);
                outputText.value = r.text;
                outputLines.value = r.lines;
            } catch (e: any) { msg.error("处理失败: " + (e.message || e)); }
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
// 与佛论禅 — 兼容 takuron.top 版本
// 算法: CryptoJS.AES.encrypt(passphrase) 的 OpenSSL 盐格式
//       → base64 去 "U2FsdGVkX1" 前缀 → 字符替换映射
// ===================================================================
const defaultBuddhaKey = "takuron.top";
const buddhaPrefix = "佛又曰：";

/** 加密: base64 字符 → 佛经字符映射表 */
const b64ToBuddha: Record<string, string> = {
    "e": "啰", "E": "羯", "t": "婆", "T": "提", "a": "摩", "A": "埵",
    "o": "诃", "O": "迦", "i": "耶", "I": "吉", "n": "娑", "N": "佛",
    "s": "夜", "S": "驮", "h": "那", "H": "谨", "r": "悉", "R": "墀",
    "d": "阿", "D": "呼", "l": "萨", "L": "尼", "c": "陀", "C": "唵",
    "u": "唎", "U": "伊", "m": "卢", "M": "喝", "w": "帝", "W": "烁",
    "f": "醯", "F": "蒙", "g": "罚", "G": "沙", "y": "嚧", "Y": "他",
    "p": "南", "P": "豆", "b": "无", "B": "孕", "v": "菩", "V": "伽",
    "k": "怛", "K": "俱", "j": "哆", "J": "度", "x": "皤", "X": "阇",
    "q": "室", "Q": "地", "z": "利", "Z": "遮",
    "0": "穆", "1": "参", "2": "舍", "3": "苏", "4": "钵", "5": "曳",
    "6": "数", "7": "写", "8": "栗", "9": "楞",
    "+": "咩", "/": "输", "=": "漫"
};

/** 解密: 佛经字符 → base64 字符 */
const buddhaToB64: Record<string, string> = {};
for (const [k, v] of Object.entries(b64ToBuddha)) buddhaToB64[v] = k;

/** MD5 哈希（纯 JS 实现，Web Crypto API 不支持 MD5） */
function md5(data: Uint8Array): Uint8Array {
    // 标准 MD5 实现
    function F(x: number, y: number, z: number) { return (x & y) | (~x & z); }
    function G(x: number, y: number, z: number) { return (x & z) | (y & ~z); }
    function H(x: number, y: number, z: number) { return x ^ y ^ z; }
    function I(x: number, y: number, z: number) { return y ^ (x | ~z); }
    function rotl(x: number, n: number) { return (x << n) | (x >>> (32 - n)); }
    function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
        a = (a + F(b, c, d) + x + ac) >>> 0;
        return ((a << s) | (a >>> (32 - s))) + b >>> 0;
    }
    function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
        a = (a + G(b, c, d) + x + ac) >>> 0;
        return ((a << s) | (a >>> (32 - s))) + b >>> 0;
    }
    function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
        a = (a + H(b, c, d) + x + ac) >>> 0;
        return ((a << s) | (a >>> (32 - s))) + b >>> 0;
    }
    function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number) {
        a = (a + I(b, c, d) + x + ac) >>> 0;
        return ((a << s) | (a >>> (32 - s))) + b >>> 0;
    }

    // 补位: 追加 0x80, 补零至 56 mod 64, 追加 64-bit 位长度
    const msgLenBits = data.length * 8;
    const padLen = (((data.length + 8) >>> 6) + 1) * 64;
    const padded = new Uint8Array(padLen);
    padded.set(data);
    padded[data.length] = 0x80;
    const view = new DataView(padded.buffer);
    view.setUint32(padLen - 8, msgLenBits, true);
    view.setUint32(padLen - 4, 0, true);

    let A = 0x67452301, B = 0xEFCDAB89, C = 0x98BADCFE, D = 0x10325476;
    const S: number[] = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
                         5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
                         4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
                         6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21];
    const T: number[] = [];
    for (let i = 1; i <= 64; i++) T.push(Math.floor(Math.abs(Math.sin(i)) * 0x100000000) >>> 0);

    for (let block = 0; block < padLen / 64; block++) {
        const X: number[] = [];
        const off = block * 64;
        for (let j = 0; j < 16; j++) X.push(view.getUint32(off + j * 4, true));
        let a = A, b = B, c = C, d = D;
        for (let i = 0; i < 64; i++) {
            let f, g;
            if (i < 16) { f = F(b, c, d); g = i; }
            else if (i < 32) { f = G(b, c, d); g = (5 * i + 1) % 16; }
            else if (i < 48) { f = H(b, c, d); g = (3 * i + 5) % 16; }
            else { f = I(b, c, d); g = (7 * i) % 16; }
            const temp = d;
            d = c; c = b;
            b = (b + rotl(a + f + X[g] + T[i], S[i])) >>> 0;
            a = temp;
        }
        A = (A + a) >>> 0; B = (B + b) >>> 0; C = (C + c) >>> 0; D = (D + d) >>> 0;
    }

    const result = new Uint8Array(16);
    const rv = new DataView(result.buffer);
    rv.setUint32(0, A, true); rv.setUint32(4, B, true);
    rv.setUint32(8, C, true); rv.setUint32(12, D, true);
    return result;
}

/** EVP_BytesToKey (OpenSSL 兼容): MD5 迭代派生 Key+IV */
function evpBytesToKey(password: string, salt: Uint8Array): { key: Uint8Array; iv: Uint8Array } {
    const pwBytes = new TextEncoder().encode(password);
    const concat = new Uint8Array(pwBytes.length + salt.length);
    concat.set(pwBytes);
    concat.set(salt, pwBytes.length);

    const d1 = md5(concat);
    const d2Input = new Uint8Array(d1.length + pwBytes.length + salt.length);
    d2Input.set(d1);
    d2Input.set(pwBytes, d1.length);
    d2Input.set(salt, d1.length + pwBytes.length);
    const d2 = md5(d2Input);

    const d3Input = new Uint8Array(d2.length + pwBytes.length + salt.length);
    d3Input.set(d2);
    d3Input.set(pwBytes, d2.length);
    d3Input.set(salt, d2.length + pwBytes.length);
    const d3 = md5(d3Input);

    const key = new Uint8Array(32);
    key.set(d1);
    key.set(d2, 16);
    const iv = d3;
    return { key, iv };
}

async function buddhaEncrypt(text: string, password: string = defaultBuddhaKey): Promise<string> {
    // 1. 生成 8 字节随机盐
    const salt = crypto.getRandomValues(new Uint8Array(8));

    // 2. EVP_BytesToKey 派生 Key+IV
    const { key, iv } = await evpBytesToKey(password, salt);

    // 3. AES-256-CBC 加密
    const cryptoKey = await crypto.subtle.importKey("raw", key.buffer as ArrayBuffer, { name: "AES-CBC" }, false, ["encrypt"]);
    const data = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt({ name: "AES-CBC", iv: iv.buffer as ArrayBuffer }, cryptoKey, data);

    // 4. 拼接 OpenSSL 盐格式: "Salted__" + salt + ciphertext
    const output = new Uint8Array(8 + 8 + encrypted.byteLength);
    output.set(new TextEncoder().encode("Salted__"), 0);
    output.set(salt, 8);
    output.set(new Uint8Array(encrypted), 16);

    // 5. base64 编码
    const b64 = btoa(String.fromCharCode(...output));

    // 6. 去掉前 10 位 "U2FsdGVkX1"
    const withoutPrefix = b64.substring(10);

    // 7. 字符替换
    let result = "";
    for (const ch of withoutPrefix) {
        result += b64ToBuddha[ch] || ch;
    }
    return buddhaPrefix + result;
}

async function buddhaDecrypt(text: string, password: string = defaultBuddhaKey): Promise<string> {
    // 1. 去除前缀
    let clean = text.replace(/^佛又曰[：:]?/, "").trim();

    // 2. 逆向字符替换
    let b64 = "";
    for (const ch of clean) {
        b64 += buddhaToB64[ch] || ch;
    }

    // 3. 补回 "U2FsdGVkX1" = base64("Salted__")
    b64 = "U2FsdGVkX1" + b64;

    // 4. base64 解码
    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

    // 5. 校验 Salted__ 头
    const header = new TextDecoder().decode(bytes.slice(0, 8));
    if (header !== "Salted__") throw new Error("非有效的佛曰密文");

    // 6. 提取盐和密文
    const salt = bytes.slice(8, 16);
    const ciphertext = bytes.slice(16);

    // 7. EVP_BytesToKey 派生 Key+IV
    const { key, iv } = await evpBytesToKey(password, salt);

    // 8. AES-256-CBC 解密
    const cryptoKey = await crypto.subtle.importKey("raw", key.buffer as ArrayBuffer, { name: "AES-CBC" }, false, ["decrypt"]);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-CBC", iv: iv.buffer as ArrayBuffer }, cryptoKey, ciphertext);
    return new TextDecoder().decode(decrypted);
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
const valueWords = ["富强", "民主", "文明", "和谐", "自由", "平等", "公正", "法治", "爱国", "敬业"];
const carryWord = "诚信";   // 索引 10，表示 hex 值 A-F 需要加 10
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
    const hexStr = Array.from(data).map(b => b.toString(16).padStart(2, "0")).join("");
    const result: string[] = [];
    for (let i = 0; i < hexStr.length; i += 2) {
        if (i > 0) result.push(separatorWord);
        for (let j = 0; j < 2; j++) {
            const digit = parseInt(hexStr[i + j], 16);
            if (digit < 10) result.push(valueWords[digit]);
            else { result.push(carryWord); result.push(valueWords[digit - 10]); }
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
    const groups = text.split(separatorWord).filter(g => g.length > 0);
    const bytes: number[] = [];
    for (const group of groups) {
        const tokens = tokenizeValues(group);
        const hexDigits: string[] = [];
        let carry = false;
        for (const tok of tokens) {
            const idx = wordToIndex[tok];
            if (idx === undefined || idx === 11) continue;
            if (idx === 10) { carry = true; continue; }
            if (carry) { hexDigits.push((10 + idx).toString(16)); carry = false; }
            else { hexDigits.push(idx.toString(16)); }
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
            add("✅ 编码中...");
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
