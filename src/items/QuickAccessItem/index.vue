<template>
    <div class="qa-wrap">
        <div class="qa-header">
            <n-button quaternary size="tiny" type="info" class="qa-gear" @click="showConfig = true" title="配置">
                <template #icon><n-icon :component="Settings" size="16" /></template>
            </n-button>
            <span class="qa-title">{{ props.item?.options?.title || "快捷访问" }}</span>
        </div>

        <!-- 图标网格 -->
        <div class="qa-grid">
            <div v-for="(site, idx) in siteList" :key="site.uuid" class="qa-item" @click="openSite(site.url)">
                <div class="qa-icon-wrap" :class="{ 'qa-no-icon': !site.icon }">
                    <img v-if="site.icon" :src="iconUrl(site.icon)" class="qa-icon" />
                    <span v-else class="qa-icon-placeholder">{{ (site.title || "?")[0] }}</span>
                </div>
                <n-ellipsis class="qa-label" :line-clamp="1">{{ site.title }}</n-ellipsis>
            </div>
            <div v-if="siteList.length === 0" class="qa-empty">暂无快捷网址，点击左上角 ⚙ 添加</div>
        </div>
    </div>

    <!-- 配置弹窗 -->
    <x-modal v-model:show="showConfig" title="快捷访问配置" :isScroll="true" class="qa-config-modal">
        <!-- 导入 -->
        <n-flex justify="space-between" align="center" class="mb-2">
            <span style="font-size: 13px; font-weight: 600">网址列表</span>
            <n-flex>
                <n-button size="tiny" @click="showImport = true">导入</n-button>
                <n-button size="tiny" type="primary" @click="addSite">添加</n-button>
            </n-flex>
        </n-flex>

        <n-flex vertical v-if="siteList.length > 0" style="gap: 12px">
            <n-card v-for="(site, idx) in siteList" :key="site.uuid" size="small" :style="{ borderColor: site.pin ? '#409eff' : undefined }">
                <n-flex vertical style="gap: 6px">
                    <n-flex justify="space-between" align="center">
                        <n-flex align="center" size="small">
                            <n-button size="tiny" quaternary @click="togglePin(idx)" :type="site.pin ? 'primary' : 'default'" title="置顶">
                                <template #icon><n-icon :component="Pin" :size="14" /></template>
                            </n-button>
                            <span style="font-size: 12px; color: #888">#{{ idx + 1 }}</span>
                        </n-flex>
                        <n-flex>
                            <n-button size="tiny" quaternary type="error" @click="deleteSite(idx)" title="删除">
                                <template #icon><n-icon :component="Trash" size="14" /></template>
                            </n-button>
                        </n-flex>
                    </n-flex>

                    <label>标题</label>
                    <n-input v-model:value="site.title" placeholder="标题" size="small" />

                    <label>URL</label>
                    <n-input v-model:value="site.url" placeholder="https://" size="small" />

                    <label>图标</label>
                    <n-flex align="center" style="gap: 6px">
                        <n-input v-model:value="site.icon" placeholder="图标 URL / base64 / 文件名" size="small" style="flex: 1" />
                        <n-upload :custom-request="(o) => uploadIcon(o, idx)" :show-file-list="false" accept="image/*">
                            <n-button size="tiny" :type="site.icon ? 'default' : 'primary'">
                                {{ site.icon ? '替换' : '上传' }}
                            </n-button>
                        </n-upload>
                    </n-flex>
                    <div class="qa-icon-preview" v-if="site.icon">
                        <img :src="iconUrl(site.icon)" style="width: 24px; height: 24px; border-radius: 4px; object-fit: contain" />
                    </div>
                </n-flex>
            </n-card>
        </n-flex>
        <n-empty v-else description="尚无快捷网址" class="mt-4" />

        <template #footer>
            <n-flex justify="end">
                <n-button :loading="saving" type="primary" @click="saveConfig">保存</n-button>
            </n-flex>
        </template>
    </x-modal>

    <!-- 导入弹窗 -->
    <x-modal v-model:show="showImport" title="导入 JSON">
        <n-input v-model:value="importText" type="textarea" :autosize="{ minRows: 5, maxRows: 12 }" placeholder="粘贴要导入的 JSON（支持单个对象或数组）&#10;格式: {\"title\":\"...\",\"url\":\"...\",\"icon\":\"...\"}" />
        <template #footer>
            <n-flex justify="end">
                <n-button @click="showImport = false">取消</n-button>
                <n-button type="primary" @click="confirmImport">确定导入</n-button>
            </n-flex>
        </template>
    </x-modal>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { Settings, Pin, Trash } from "@vicons/tabler";
import { itemFetch } from "@/utils/jFetch";
import { myUpload, base64ToFile } from "@/utils/upload";
import { UrlUtils } from "@/utils/url";
import { useMessage } from "naive-ui";
import { nanoid } from "nanoid";
import XModal from "@/components/XModal.vue";

const msg = useMessage();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    display: ItemDisplayType;
}>();

type SiteItem = {
    uuid: string;
    title: string;
    url: string;
    icon: string; // 文件名 / base64 / 外链
    pin?: boolean;
};

const filename = "siteList.json";
const siteList = ref<SiteItem[]>([]);
const showConfig = ref(false);
const showImport = ref(false);
const importText = ref("");
const saving = ref(false);

// ====== 数据 ======
const loadData = async () => {
    const res = await itemFetch.request("getItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename
    });
    if (res.code === 200 && res.data) {
        try { siteList.value = JSON.parse(res.data); } catch { siteList.value = []; }
    } else {
        siteList.value = [];
    }
};

const saveData = async () => {
    saving.value = true;
    const res = await itemFetch.request("updateItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename,
        content: JSON.stringify(siteList.value)
    });
    saving.value = false;
    if (res.code !== 200) {
        msg.error("保存失败: " + (res.msg || ""));
        return false;
    }
    return true;
};

// ====== 图标 URL 转换 ======
const iconUrl = (icon: string): string => {
    if (!icon) return "";
    if (icon.startsWith("data:") || icon.startsWith("http://") || icon.startsWith("https://")) {
        return icon;
    }
    return UrlUtils.checkImgUrl(icon, `./api/files/items/${props.item.type}/${props.item.uuid}`);
};

// ====== 打开链接 ======
const openSite = (url: string) => {
    if (!url) return;
    window.open(url, "_blank");
};

// ====== 配置操作 ======
const addSite = () => {
    siteList.value.push({
        uuid: nanoid(10),
        title: "",
        url: "",
        icon: ""
    });
};

const deleteSite = (idx: number) => {
    siteList.value.splice(idx, 1);
};

const togglePin = (idx: number) => {
    siteList.value[idx].pin = !siteList.value[idx].pin;
};

// ====== 图标上传 ======
const uploadIcon = async (o: any, idx: number) => {
    const site = siteList.value[idx];
    if (!site) return;

    const file = o.file?.file;
    if (!file) return;

    const [res, err] = await myUpload(
        { data: file, type: "file" },
        { url: `./api/upload/file/items/${props.item.type}/${props.item.uuid}` }
    );

    if (err || !res || res.code !== 200) {
        msg.error("上传失败");
        return;
    }

    site.icon = res.data.filename;
    msg.success("图标已上传");
};

// ====== 保存配置 ======
const saveConfig = async () => {
    // 处理每个站点的图标：base64 → 上传为文件
    for (let i = 0; i < siteList.value.length; i++) {
        const site = siteList.value[i];
        if (!site.icon) continue;

        // base64 → 上传到服务器
        if (site.icon.startsWith("data:")) {
            msg.info(`正在上传图标 ${i + 1}/${siteList.value.length}...`);
            try {
                const file = base64ToFile(site.icon);
                const [res, err] = await myUpload(
                    { data: file, type: "file" },
                    { url: `./api/upload/file/items/${props.item.type}/${props.item.uuid}` }
                );
                if (err || !res || res.code !== 200) {
                    msg.error(`图标 ${i + 1} 上传失败`);
                    continue;
                }
                site.icon = res.data.filename;
            } catch {
                msg.error(`图标 ${i + 1} 转换失败`);
            }
        }
    }

    const ok = await saveData();
    if (ok) {
        msg.success("已保存");
        showConfig.value = false;
    }
};

// ====== 导入：弹出输入框粘贴 JSON ======
const confirmImport = () => {
    const text = importText.value.trim();
    if (!text) { msg.warning("请输入 JSON 内容"); return; }

    let items: any[] = [];
    try {
        const parsed = JSON.parse(text);
        items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
        msg.error("内容不是有效的 JSON");
        return;
    }

    let count = 0;
    for (const item of items) {
        if (item.title || item.url) {
            siteList.value.push({
                uuid: nanoid(10),
                title: item.title || "",
                url: item.url || "",
                icon: item.icon || ""
            });
            count++;
        }
    }

    if (count > 0) {
        msg.success(`已导入 ${count} 条`);
        showImport.value = false;
        importText.value = "";
    } else {
        msg.warning("未找到有效数据");
    }
};

onMounted(() => loadData());
</script>

<style scoped>
.qa-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.qa-header {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 4px;
    flex: none;
    position: relative;
}

.qa-title {
    font-size: 12px;
    color: #888;
    font-weight: 600;
}

.qa-gear {
    flex: none;
}

.qa-grid {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 8px;
    padding: 8px;
    overflow-y: auto;
    min-height: 0;
}

.qa-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 56px;
    cursor: pointer;
    gap: 4px;
    padding: 4px;
    border-radius: 8px;
    transition: background 0.15s;
}

.qa-item:hover {
    background: rgba(128, 128, 128, 0.08);
}

.qa-icon-wrap {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: rgba(128, 128, 128, 0.06);
}

.qa-no-icon {
    background: rgba(128, 128, 128, 0.08);
}

.qa-icon {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.qa-icon-placeholder {
    font-size: 16px;
    font-weight: 700;
    color: #888;
}

.qa-label {
    font-size: 11px;
    color: #666;
    text-align: center;
    width: 56px;
}

.qa-empty {
    width: 100%;
    text-align: center;
    color: #aaa;
    font-size: 12px;
    padding: 24px 0;
}

.qa-icon-preview {
    display: flex;
    align-items: center;
    gap: 4px;
}

.qa-config-modal :deep(.n-card__content) {
    padding: 12px !important;
}
</style>
