<template>
    <div class="dc-wrap">
        <n-divider v-if="props.display != 'btn' && props.display != 'icon'" style="margin-top: 0; margin-bottom: 6px" dashed>
            <div style="font-size: 12px">{{ props.item?.options?.title || "docker run → docker-compose" }}</div>
        </n-divider>

        <div class="dc-options">
            <n-flex justify="space-between" align="center">
                <n-flex align="center" size="small">
                    <span class="dc-opt-label">version</span>
                    <n-switch v-model:value="showVersion" size="small" />
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
                    <span class="dc-label">docker run</span>
                    <div style="display:flex;gap:4px">
                        <n-button quaternary size="tiny" type="info" @click="pasteInput"><template #icon><n-icon :component="Clipboard" size="14" /></template></n-button>
                        <n-button quaternary size="tiny" type="error" @click="clearInput"><template #icon><n-icon :component="Trash" size="14" /></template></n-button>
                    </div>
                </div>
                <n-input v-model:value="inputText" type="textarea" :autosize="{ minRows: 3, maxRows: 4 }" placeholder="粘贴 docker run 命令..." class="dc-input" />
                <n-button type="primary" size="small" style="margin-top:6px;width:100%" @click="convert">转换 →</n-button>
            </div>

            <div class="dc-panel dc-panel-output">
                <div class="dc-panel-header">
                    <span class="dc-label">docker-compose.yml</span>
                </div>
                <div class="dc-output" ref="outputRef">
                    <n-flex class="dc-output-actions" size="small">
                        <n-button quaternary size="tiny" type="warning" @click="copyOutput" title="复制"><template #icon><n-icon :component="Copy" size="14" /></template></n-button>
                        <n-button quaternary size="tiny" type="info" @click="downloadFile" title="下载为文件"><template #icon><n-icon :component="Download" size="14" /></template></n-button>
                    </n-flex>
                    <div class="dc-line" v-for="(line, idx) in outputLines" :key="idx" :style="{ paddingLeft: (line.indent || 0) + 'em' }">
                        <span v-if="line.isComment" class="dc-comment">{{ line.text }}</span>
                        <span v-else>{{ line.text }}</span>
                    </div>
                    <div v-if="!outputText" class="dc-placeholder">转换后的内容将显示在这里</div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Clipboard, Copy, Download, Trash } from "@vicons/tabler";
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
const showVersion = ref(false);

type OutputLine = { text: string; indent?: number; isComment?: boolean };
const outputLines = ref<OutputLine[]>([]);

const examples = [
    `docker run -d \\
  --name nginx-web \\
  -p 80:80 \\
  -p 443:443 \\
  -v ./nginx/html:/usr/share/nginx/html:ro \\
  -v ./nginx/conf:/etc/nginx/conf.d \\
  -e NGINX_HOST=example.com \\
  -e NGINX_PORT=80 \\
  --restart unless-stopped \\
  nginx:alpine`,
    `docker run -d \\
  --name mysql-db \\
  -p 3306:3306 \\
  -v mysql-data:/var/lib/mysql \\
  -e MYSQL_ROOT_PASSWORD=root123 \\
  -e MYSQL_DATABASE=app \\
  -e MYSQL_USER=app \\
  -e MYSQL_PASSWORD=app123 \\
  --restart always \\
  mysql:8.0`,
    `docker run -d \\
  --name myapp \\
  -p 3000:3000 \\
  -v .:/app \\
  -v /app/node_modules \\
  -e NODE_ENV=production \\
  -e DB_HOST=mysql \\
  --link mysql:mysql \\
  --network mynet \\
  --restart on-failure:3 \\
  node:18 \\
  node server.js`
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

const downloadFile = () => {
    if (!outputText.value) { msg.warning("没有内容可下载"); return; }
    const blob = new Blob([outputText.value], { type: "text/yaml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "docker-compose.yml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    msg.success("已下载");
};

const convert = () => {
    const raw = inputText.value.trim();
    if (!raw) { msg.warning("请先输入 docker run 命令"); return; }

    const result = parseDockerRun(raw, showVersion.value);
    outputText.value = result.text;
    outputLines.value = result.lines;
};

// ====== 解析逻辑 ======
function parseDockerRun(cmd: string, includeVersion: boolean): { text: string; lines: OutputLine[] } {
    // 合并反斜杠续行
    let clean = cmd.replace(/\\\s*\n/g, " ").replace(/\n/g, " ");
    // 去掉 docker run 前缀
    clean = clean.replace(/^docker\s+run\s+/i, "").trim();

    const parts = tokenize(clean);
    const args: Record<string, string[]> = {};
    const kvArgs: Record<string, string> = {};
    let imageName = "";
    let commandArgs: string[] = [];
    let i = 0;

    while (i < parts.length) {
        const p = parts[i];
        if (p.startsWith("-")) {
            const key = p.replace(/^-+/, "");
            // 取下一个作为值（如果有的话）
            const next = i + 1 < parts.length ? parts[i + 1] : null;

            // 值在下一个且不是另一个 flag
            if (next !== null && !next.startsWith("-")) {
                // 有些 flag 没有值
                if (["d", "detach", "rm", "t", "tty", "i", "interactive", "privileged"].includes(key)) {
                    args[key] = args[key] || [];
                    args[key].push("");
                    i++;
                    continue;
                }
                // -p 80:80 / -p 0.0.0.0:80:80
                // -v /path:/path
                // -e KEY=value
                // --name xxx
                args[key] = args[key] || [];
                args[key].push(next);
                i += 2;
                continue;
            } else {
                // 无值 flag
                args[key] = args[key] || [];
                args[key].push("");
                i++;
                continue;
            }
        } else {
            // 不是 flag → image name 或者 command
            if (!imageName) {
                imageName = p;
            } else {
                commandArgs.push(p);
            }
            i++;
        }
    }

    const lines: OutputLine[] = [];
    const svcIndent = includeVersion ? 2 : 0;
    const indent2 = svcIndent + 2;
    const indent4 = svcIndent + 4;
    const indent6 = svcIndent + 6;

    const add = (text: string, level: number, isComment?: boolean) => {
        lines.push({ text, indent: level, isComment });
    };

    if (includeVersion) {
        add("version: '3'", 0);
        add("", 0);
    }
    add("services:", svcIndent);

    const svcName = args["name"]?.[0] || cleanServiceName(imageName) || "app";
    add(`${svcName}:`, indent2);

    add(`image: ${imageName}`, indent4);

    if (commandArgs.length > 0) {
        add(`command: ${commandArgs.join(" ")}`, indent4);
    }

    if (args["restart"]?.[0]) {
        add(`restart: ${args["restart"][0]}`, indent4);
    } else if (args["d"] !== undefined || args["detach"] !== undefined) {
        add("restart: unless-stopped", indent4);
    }

    if (args["container_name"]?.[0]) {
        add(`container_name: ${args["container_name"][0]}`, indent4);
    } else if (args["name"]?.[0]) {
        // already used as service name, but explicit is fine
    }

    // Ports
    const ports = [...(args["publish"] || []), ...(args["p"] || [])];
    if (ports.length > 0) {
        add("ports:", indent4);
        for (const port of ports) {
            add(`- "${port}"`, indent6);
        }
    }

    // Volumes
    const volumes = [...(args["volume"] || []), ...(args["v"] || [])];
    if (volumes.length > 0) {
        const namedVolumes: string[] = [];
        add("volumes:", indent4);
        for (const vol of volumes) {
            add(`- ${vol}`, indent6);
            // 检测命名卷
            const m = vol.match(/^([a-zA-Z][a-zA-Z0-9_-]+):/);
            if (m && !vol.startsWith("./") && !vol.startsWith("/") && !vol.startsWith("~")) {
                if (!namedVolumes.includes(m[1])) namedVolumes.push(m[1]);
            }
        }
        if (namedVolumes.length > 0) {
            add("", 0);
            add("volumes:", svcIndent);
            for (const nv of namedVolumes) {
                add(`${nv}:`, indent2);
                add("driver: local", indent4);
            }
        }
    }

    // Environment
    const envs = [...(args["env"] || []), ...(args["e"] || [])];
    if (envs.length > 0) {
        add("environment:", indent4);
        for (const env of envs) {
            if (env.includes("=")) {
                const eqIdx = env.indexOf("=");
                const k = env.substring(0, eqIdx);
                const v = env.substring(eqIdx + 1);
                add(`${k}=${v}`, indent6);
            } else {
                add(`${env}=""`, indent6);
            }
        }
    }

    // env_file
    const envFiles = [...(args["env-file"] || []), ...(args["env_file"] || [])];
    if (envFiles.length > 0) {
        add("env_file:", indent4);
        for (const ef of envFiles) {
            add(`- ${ef}`, indent6);
        }
    }

    // Network
    const networks = [...(args["network"] || []), ...(args["net"] || [])];
    if (networks.length > 0) {
        add("networks:", indent4);
        for (const net of networks) {
            add(`- ${net}`, indent6);
        }
    }

    // Links
    const links = [...(args["link"] || []), ...(args["links"] || [])];
    if (links.length > 0) {
        add("links:", indent4);
        for (const link of links) {
            add(`- ${link}`, indent6);
        }
    }

    // Depends on
    if (links.length > 0) {
        add("depends_on:", indent4);
        for (const link of links) {
            const name = link.split(":")[0];
            add(`- ${name}`, indent6);
        }
    }

    // Entrypoint
    if (args["entrypoint"]?.[0]) {
        add(`entrypoint: ${args["entrypoint"][0]}`, indent4);
    }

    // Working dir
    const workdirs = [...(args["workdir"] || []), ...(args["w"] || [])];
    if (workdirs[0]) {
        add(`working_dir: ${workdirs[0]}`, indent4);
    }

    // User
    const users = [...(args["user"] || []), ...(args["u"] || [])];
    if (users[0]) {
        add(`user: "${users[0]}"`, indent4);
    }

    // Hostname
    if (args["hostname"]?.[0]) {
        add(`hostname: ${args["hostname"][0]}`, indent4);
    }

    // DNS
    const dns = [...(args["dns"] || [])];
    if (dns.length > 0) {
        add("dns:", indent4);
        for (const d of dns) {
            add(`- ${d}`, indent6);
        }
    }

    // Cap add
    const caps = [...(args["cap-add"] || []), ...(args["cap_add"] || [])];
    if (caps.length > 0) {
        add("cap_add:", indent4);
        for (const cap of caps) {
            add(`- ${cap}`, indent6);
        }
    }

    // Privileged
    if (args["privileged"] !== undefined) {
        add("privileged: true", indent4);
    }

    // Memory / CPUs
    if (args["memory"]?.[0] || args["m"]?.[0]) {
        add(`mem_limit: ${args["memory"]?.[0] || args["m"]?.[0]}`, indent4);
    }
    if (args["cpus"]?.[0]) {
        add(`cpus: "${args["cpus"][0]}"`, indent4);
    }

    // Devices
    const devices = [...(args["device"] || []), ...(args["devices"] || [])];
    if (devices.length > 0) {
        add("devices:", indent4);
        for (const dev of devices) {
            add(`- ${dev}`, indent6);
        }
    }

    // TTY / Interactive
    if (args["t"] !== undefined || args["tty"] !== undefined) {
        add("tty: true", indent4);
    }
    if (args["i"] !== undefined || args["interactive"] !== undefined) {
        add("stdin_open: true", indent4);
    }

    // Labels
    const labels = [...(args["label"] || []), ...(args["l"] || [])];
    if (labels.length > 0) {
        add("labels:", indent4);
        for (const lb of labels) {
            if (lb.includes("=")) {
                const eqIdx = lb.indexOf("=");
                add(`- "${lb.substring(0, eqIdx)}=${lb.substring(eqIdx + 1)}"`, indent6);
            } else {
                add(`- "${lb}="`, indent6);
            }
        }
    }

    // Sysctls
    const sysctls = [...(args["sysctl"] || []), ...(args["sysctls"] || [])];
    if (sysctls.length > 0) {
        add("sysctls:", indent4);
        for (const s of sysctls) {
            add(`- ${s}`, indent6);
        }
    }

    const text = lines.map(l => " ".repeat(l.indent || 0) + l.text).join("\n");
    return { text, lines };
}

function tokenize(s: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuote = false;
    let quoteChar = "";
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (inQuote) {
            current += c;
            if (c === quoteChar) inQuote = false;
        } else if (c === "'" || c === '"') {
            current += c;
            inQuote = true;
            quoteChar = c;
        } else if (c === " " || c === "\t") {
            if (current) { tokens.push(current); current = ""; }
        } else {
            current += c;
        }
    }
    if (current) tokens.push(current);
    return tokens;
}

function cleanServiceName(name: string): string {
    return name.replace(/[^a-zA-Z0-9_-]/g, "").toLowerCase() || "app";
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

.dc-panel-output .dc-output {
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

.dc-output:hover .dc-output-actions,
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

/* dc-output 滚动条适配暗色背景 */
.dc-output::-webkit-scrollbar {
    width: 6px;
}

.dc-output::-webkit-scrollbar-track {
    background: transparent;
}

.dc-output::-webkit-scrollbar-thumb {
    background: #45475a;
    border-radius: 3px;
}

.dc-output::-webkit-scrollbar-thumb:hover {
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

.dc-output {
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
    white-space: pre;
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
