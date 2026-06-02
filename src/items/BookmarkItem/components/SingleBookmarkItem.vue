<template>
    <n-flex vertical style="width: 100%">
        <!-- 工具栏：仅图标按钮 -->
        <n-flex justify="center" align="center" style="gap: 8px; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none" class="mb-1">
            <n-button quaternary type="info" size="small" @click="initData">
                <template #icon><n-icon :component="Refresh" /></template>
            </n-button>
            <n-button quaternary type="primary" size="small" :disabled="!!searchKey" @click="openAddForm(false)">
                <template #icon><n-icon :component="BookmarkAdd" /></template>
            </n-button>
            <n-button quaternary type="primary" size="small" :disabled="!!searchKey" @click="openAddForm(true)">
                <template #icon><n-icon :component="FolderAdd" /></template>
            </n-button>
            <n-button quaternary type="info" size="small" :disabled="!!searchKey" @click="toImport">
                <template #icon><n-icon :component="IosCloudDownload" /></template>
            </n-button>
            <n-button quaternary type="info" size="small" :disabled="!!searchKey" @click="toExport">
                <template #icon><n-icon :component="IosCloudUpload" /></template>
            </n-button>
            <n-button quaternary type="info" size="small" :disabled="!!searchKey" @click="copyScript">
                <template #icon><n-icon :component="Code" /></template>
            </n-button>
            <n-button quaternary type="info" size="small" :disabled="!!searchKey" @click="exportTabInfo">
                <template #icon><n-icon :component="Information" /></template>
            </n-button>
        </n-flex>

        <!-- 搜索框 -->
        <n-input
            placeholder="搜索书签…"
            clearable
            :debounce="300"
            @update:value="onSearchChange"
            @clear="onSearchClear"
        >
            <template #prefix>
                <n-icon :component="Search" />
            </template>
        </n-input>

        <!-- 面包屑路径（搜索时隐藏），返回按钮在右侧 -->
        <n-flex v-if="!searchKey && breadcrumbList.length > 0" style="margin-top: 6px; gap: 2px; align-items: center; min-width: 0; width: 100%" :wrap="false">
            <n-flex style="gap: 2px; align-items: center; overflow: hidden; min-width: 0; flex: 1">
                <template v-for="(crumb, idx) in breadcrumbList" :key="crumb.uuid">
                    <n-button
                        v-if="idx < breadcrumbList.length - 1"
                        text
                        size="tiny"
                        style="font-size: 12px; color: #888; flex-shrink: 0"
                        @click="navigateTo(idx)"
                    >
                        {{ crumb.title }}
                    </n-button>
                    <span v-else style="font-size: 12px; font-weight: 500; color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap">{{ crumb.title }}</span>
                    <n-icon v-if="idx < breadcrumbList.length - 1" :component="IosArrowForward" size="12" style="color: #aaa; flex-shrink: 0" />
                </template>
            </n-flex>
            <n-button
                v-if="curPath.length > 0"
                quaternary type="warning" size="tiny"
                style="flex-shrink: 0"
                @click="goToParent"
            >
                <template #icon><n-icon :component="ArrowLeft" /></template>
            </n-button>
        </n-flex>

        <!-- 书签列表（当前目录，可滚动） -->
        <template v-if="displayList.length > 0">
            <div class="bookmark-list">
            <n-flex vertical style="margin-top: 6px; gap: 6px">
                <div
                    v-for="node in displayList"
                    :key="node.item.uuid"
                    class="bookmark-row"
                    @click="onItemClick(node.item)"
                    @contextmenu.prevent="openContextMenu($event, node.item)"
                >
                    <!-- 文件夹图标 -->
                    <span v-if="node.item.isFolder" style="width: 20px; display: inline-flex; justify-content: center">
                        <n-icon :component="Folder" size="20" />
                    </span>
                    <!-- 书签图标 -->
                    <span v-else class="icon-box">
                        <img
                            v-if="node.item.icon"
                            :src="iconDisplayUrl(node.item.icon)"
                            class="icon-img"
                            @error="($event.target as HTMLImageElement).style.display='none'"
                        />
                        <n-icon v-else-if="node.item.url" :component="MdGlobe" size="14" />
                        <n-icon v-else :component="File" size="14" />
                    </span>

                    <!-- 标题 -->
                    <span class="bookmark-title">{{ node.item.title }}</span>

                    <!-- URL（非文件夹&非搜索模式） -->
                    <span v-if="!node.item.isFolder && !searchKey" class="bookmark-url">{{ getDisplayUrl(node.item.url) }}</span>

                    <!-- 悬停操作 -->
                    <span class="bookmark-actions" @click.stop>
                        <n-flex vertical style="gap: 2px">
                            <n-flex style="gap: 2px">
                                <n-button quaternary size="tiny" type="warning" @click.stop="openEditForm(node.item)">
                                    <n-icon :component="Edit" size="13" />
                                </n-button>
                                <n-button quaternary size="tiny" type="error" @click.stop="openDeleteDialog(node.item)">
                                    <n-icon :component="Trash" size="13" />
                                </n-button>
                                <n-button v-if="!node.item.isFolder" quaternary size="tiny" type="info" @click.stop="openUrl(node.item.url)">
                                    <n-icon :component="Launch" size="13" />
                                </n-button>
                            </n-flex>
                            <n-flex v-if="!node.item.isFolder" style="gap: 2px">
                                <n-button quaternary size="tiny" type="default" @click.stop="gotoUrl(node.item.url)">
                                    <n-icon :component="ArrowRight" size="13" />
                                </n-button>
                                <n-button quaternary size="tiny" type="default" @click.stop="copyLink(node.item.url)">
                                    <n-icon :component="Copy" size="13" />
                                </n-button>
                                <n-button quaternary size="tiny" type="default" @click.stop="showQrCode(node.item.url, node.item.title)">
                                    <n-icon :component="QrCode" size="13" />
                                </n-button>
                            </n-flex>
                        </n-flex>
                    </span>
                </div>
            </n-flex>
        </div>
        </template>

        <n-empty v-else-if="!loading" class="mt-30" description="此目录为空" />

        <!-- 移动端长按菜单 -->
        <x-modal v-model:show="contextShow" title="" :content-max-height="'auto'">
            <n-flex vertical>
                <n-button
                    v-if="contextItem && !contextItem.isFolder"
                    quaternary
                    size="large"
                    style="justify-content: flex-start"
                    @click="contextAction('open')"
                >
                    <template #icon><n-icon :component="Launch" /></template>
                    新标签打开
                </n-button>
                <n-button
                    v-if="contextItem && !contextItem.isFolder"
                    quaternary
                    size="large"
                    style="justify-content: flex-start"
                    @click="contextAction('goto')"
                >
                    <template #icon><n-icon :component="ArrowRight" /></template>
                    当前页面跳转
                </n-button>
                <n-button
                    v-if="contextItem && !contextItem.isFolder"
                    quaternary
                    size="large"
                    style="justify-content: flex-start"
                    @click="contextAction('copyLink')"
                >
                    <template #icon><n-icon :component="Copy" /></template>
                    复制链接
                </n-button>
                <n-button
                    v-if="contextItem && !contextItem.isFolder"
                    quaternary
                    size="large"
                    style="justify-content: flex-start"
                    @click="contextAction('qrCode')"
                >
                    <template #icon><n-icon :component="QrCode" /></template>
                    转二维码
                </n-button>
                <n-button
                    quaternary
                    size="large"
                    style="justify-content: flex-start"
                    @click="contextAction('edit')"
                >
                    <template #icon><n-icon :component="Edit" /></template>
                    编辑
                </n-button>
                <n-button
                    quaternary
                    size="large"
                    style="justify-content: flex-start; color: #e88080"
                    @click="contextAction('delete')"
                >
                    <template #icon><n-icon :component="Trash" /></template>
                    删除
                </n-button>
            </n-flex>
            <template #footer>
                <n-flex justify="center">
                    <n-button @click="contextShow = false">取消</n-button>
                </n-flex>
            </template>
        </x-modal>

        <!-- 二维码弹窗 -->
        <x-modal v-model:show="qrShow" title="二维码">
            <n-flex vertical align="center" style="padding: 12px 0">
                <div v-if="qrTitle" style="font-size: 14px; margin-bottom: 8px; word-break: break-all; text-align: center">{{ qrTitle }}</div>
                <img
                    v-if="qrUrl"
                    :src="`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(qrUrl)}`"
                    style="width: 200px; height: 200px; border-radius: 8px"
                    alt="QR Code"
                />
                <div style="font-size: 11px; color: #888; margin-top: 8px; word-break: break-all; text-align: center">{{ qrUrl }}</div>
            </n-flex>
        </x-modal>

        <!-- 导入隐藏 input -->
        <input ref="importInputRef" type="file" accept=".html,.htm" style="display: none" @change="handleFileImport" />

        <!-- 添加/编辑弹窗 -->
        <x-modal v-model:show="formShow" :title="formIsEdit ? '编辑' : '添加'" content-max-height="80vh">
            <n-form :model="formData" label-placement="top" size="small">
                <n-form-item label="URL" v-if="!formData.isFolder">
                    <div class="form-line">
                        <n-input v-model:value="formData.url" placeholder="https://example.com" />
                        <n-button size="small" type="info" :loading="detecting" @click="detectUrl">检测</n-button>
                    </div>
                </n-form-item>
                <n-form-item label="标题">
                    <n-input v-model:value="formData.title" placeholder="请输入标题" />
                </n-form-item>
                <n-form-item label="图标" v-if="!formData.isFolder">
                    <div class="form-line">
                        <n-input v-model:value="formData._iconInput" placeholder="URL 或留空自动获取" />
                        <n-button size="small" :loading="iconLoading" @click="fetchIcon">获取</n-button>
                        <img
                            v-if="formIconPreview"
                            :src="formIconPreview"
                            style="width: 28px; height: 28px; border-radius: 4px; object-fit: contain; flex-shrink: 0"
                            @error="($event.target as HTMLImageElement).style.display='none'"
                        />
                    </div>
                </n-form-item>
                <n-form-item label="类型">
                    <n-switch v-model:value="formData.isFolder" :disabled="formIsEdit">
                        <template #checked> 文件夹 </template>
                        <template #unchecked> 书签 </template>
                    </n-switch>
                </n-form-item>
            </n-form>

            <template #footer>
                <n-flex justify="end">
                    <n-button @click="formShow = false">取消</n-button>
                    <n-button type="primary" @click="confirmForm">确定</n-button>
                </n-flex>
            </template>
        </x-modal>

        <!-- 删除确认 -->
        <x-modal v-model:show="deleteShow" title="确认删除">
            <p>确定删除「{{ deleteTarget?.title }}」吗？</p>
            <p v-if="deleteTarget?.isFolder && deleteTarget.children?.length" style="color: #e88080; font-size: 13px">
                ⚠ 该文件夹内所有内容也将被删除。
            </p>
            <template #footer>
                <n-flex justify="end">
                    <n-button @click="deleteShow = false">取消</n-button>
                    <n-button type="error" @click="confirmDelete">确认删除</n-button>
                </n-flex>
            </template>
        </x-modal>
    </n-flex>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import type { BookmarkCollectionType, BookmarkType } from "..";
import { Refresh, Edit, Trash, Folder, File } from "@vicons/tabler";
import { BookmarkAdd, FolderAdd, Search, Launch, ArrowLeft, ArrowRight, Link as LinkIcon, Copy, QrCode, Code, Information } from "@vicons/carbon";
import { IosArrowForward, MdGlobe, IosCloudUpload, IosCloudDownload } from "@vicons/ionicons4";
import { itemFetch, toolsImgFetch, toolsUrlFetch } from "@/utils/jFetch";
import { useMessage } from "naive-ui";
import { nanoid } from "nanoid";
import XModal from "@/components/XModal.vue";
import { useDataStore } from "@/stores/data";
import { UrlUtils } from "@/utils/url";
import {
    getFolderContent,
    getBreadcrumb,
    addItemAtPath,
    removeItemFromTree,
    updateItemInTree,
    searchInTree,
    generateHtmlBookmarks,
    parseHtmlBookmarks,
    fetchFaviconToServer,
    getFaviconUrl,
    iconFileToBase64,
    resolveImportIcons
} from "./bookmarkUtils";

const msg = useMessage();
const dataStore = useDataStore();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    bookmark: BookmarkType;
    refreshKey?: number;
}>();

// ========== 状态 ==========
const loading = ref(false);
const dataList = ref(<BookmarkCollectionType[]>[]);       // 完整树
const curPath = ref(<string[]>[]);                        // 当前目录 UUID 路径
const searchKey = ref("");

// 导入
const importInputRef = ref<HTMLInputElement | null>(null);

// 表单
const formShow = ref(false);
const formIsEdit = ref(false);
const editingItem = ref<BookmarkCollectionType | null>(null);
const detecting = ref(false);
const iconLoading = ref(false);

interface BookmarkForm {
    url: string;
    title: string;
    isFolder: boolean;
    /** 用户输入的图标 URL（可能是外部链接或留空） */
    _iconInput: string;
    /** 保存在服务器上的图标文件名，空 = 自动 */
    _iconServerFile: string;
}

const formData = reactive<BookmarkForm>({
    url: "",
    title: "",
    isFolder: false,
    _iconInput: "",
    _iconServerFile: ""
});

// 长按 / 右键菜单
const contextShow = ref(false);
const contextItem = ref<BookmarkCollectionType | null>(null);

const openContextMenu = (e: MouseEvent | TouchEvent, item: BookmarkCollectionType) => {
    contextItem.value = item;
    contextShow.value = true;
};

const contextAction = (action: string) => {
    if (!contextItem.value) return;
    contextShow.value = false;
    const item = contextItem.value;
    if (action === 'open' && item.url) openUrl(item.url);
    else if (action === 'goto' && item.url) { window.location.href = item.url; }
    else if (action === 'copyLink' && item.url) copyLink(item.url);
    else if (action === 'qrCode' && item.url) showQrCode(item.url, item.title);
    else if (action === 'edit') openEditForm(item);
    else if (action === 'delete') openDeleteDialog(item);
    contextItem.value = null;
};

// 删除
const deleteShow = ref(false);
const deleteTarget = ref<BookmarkCollectionType | null>(null);

// ========== 计算属性 ==========

/** 面包屑 */
const breadcrumbList = computed(() => {
    return getBreadcrumb(curPath.value, dataList.value);
});

/** 当前目录内容 */
const currentContent = computed(() => {
    return getFolderContent(curPath.value, dataList.value);
});

/** 展示列表 */
interface DisplayNode {
    item: BookmarkCollectionType;
    depth: number;
}
const displayList = computed<DisplayNode[]>(() => {
    if (searchKey.value) {
        return searchInTree(dataList.value, searchKey.value, 0);
    }
    // 文件浏览器模式：只显示当前目录
    return currentContent.value.map(item => ({ item, depth: 0 }));
});

/** 图标预览 URL */
const formIconPreview = computed(() => {
    if (formData._iconServerFile) {
        return UrlUtils.checkImgUrl(
            formData._iconServerFile,
            `./api/files/users/${dataStore.pathid}`
        );
    }
    if (formData._iconInput) {
        return formData._iconInput;
    }
    if (formData.url) {
        return getFaviconUrl(formData.url);
    }
    return "";
});

/** 图标文件的基础 URL */
const iconBaseUrl = computed(() => {
    return `./api/files/users/${dataStore.pathid}`;
});

// ========== 生命周期 ==========

const initData = async () => {
    loading.value = true;
    const res = await itemFetch.request("getItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename: `collection-${props.bookmark.uuid}.json`
    });
    if (res.code !== 200) {
        msg.error(res.msg);
        loading.value = false;
        return;
    }
    dataList.value = res.data ? JSON.parse(res.data) : [];
    // 重置到根目录
    curPath.value = [];
    searchKey.value = "";
    loading.value = false;
};

const saveData = async (): Promise<boolean> => {
    const res = await itemFetch.request("updateItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename: `collection-${props.bookmark.uuid}.json`,
        content: JSON.stringify(dataList.value)
    });
    if (res.code !== 200) {
        msg.error("保存失败");
        return false;
    }
    return true;
};

// ========== 导航 ==========

const navigateTo = (breadcrumbIndex: number) => {
    curPath.value = curPath.value.slice(0, breadcrumbIndex);
};

const goToParent = () => {
    if (curPath.value.length > 0) {
        curPath.value = curPath.value.slice(0, -1);
    }
};

// ========== 搜索 ==========

const onSearchChange = (val: string | null) => {
    searchKey.value = val || "";
};

const onSearchClear = () => {
    searchKey.value = "";
};

// ========== 点击 ==========

const onItemClick = (item: BookmarkCollectionType) => {
    if (item.isFolder) {
        // 进入文件夹
        curPath.value = [...curPath.value, item.uuid];
    } else if (item.url) {
        openUrl(item.url);
    }
};

const openUrl = (url: string) => {
    if (!url) return;
    window.open(url, "_blank");
};

const gotoUrl = (url: string) => {
    if (!url) return;
    window.location.href = url;
};

const copyScript = async () => {
    try {
        const res = await fetch('/items/BookmarkItem/addMark.js');
        const text = await res.text();
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        msg.success('油猴脚本已复制，粘贴到 Tampermonkey 新建脚本即可');
    } catch {
        msg.error('复制失败');
    }
};

const exportTabInfo = () => {
    const info = {
        serverUrl: window.location.origin,
        pathid: dataStore.pathid,
        secondcode: dataStore.secondcode,
        itemUUID: props.item.uuid,
        itemType: props.item.type,
        bookmarkUUID: props.bookmark.uuid,
        filename: 'collection-' + props.bookmark.uuid + '.json'
    };
    const json = JSON.stringify(info, null, 2);
    const ta = document.createElement('textarea');
    ta.value = json; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    msg.success('连接信息已复制');
};

const copyLink = (url: string) => {
    if (!url) return;
    try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        msg.success("链接已复制");
    } catch {
        msg.error("复制失败");
    }
};

const qrShow = ref(false);
const qrUrl = ref("");
const qrTitle = ref("");

const showQrCode = (url: string, title?: string) => {
    if (!url) return;
    qrUrl.value = url;
    qrTitle.value = title || "";
    qrShow.value = true;
};

// ========== 图标处理 ==========

const getDisplayUrl = (url: string): string => {
    try {
        const p = new URL(url);
        return p.hostname + (p.pathname.length > 1 ? p.pathname.substring(0, 25) : "") + (p.pathname.length > 25 ? "…" : "");
    } catch {
        return url.substring(0, 35);
    }
};

/** 图标显示 URL（从服务器路径转完整 URL） */
const iconDisplayUrl = (icon: string): string => {
    return UrlUtils.checkImgUrl(icon, `./api/files/users/${dataStore.pathid}`);
};

/** 获取并保存图标到服务器 */
const fetchIcon = async () => {
    if (!formData.url && !formData._iconInput) {
        return msg.warning("请先输入 URL");
    }
    const targetUrl = formData._iconInput || formData.url;
    iconLoading.value = true;
    try {
        const filename = await fetchFaviconToServer(targetUrl, toolsImgFetch);
        iconLoading.value = false;
        if (filename) {
            formData._iconServerFile = filename;
            formData._iconInput = filename;
            msg.success("图标已获取");
        } else {
            msg.warning("获取图标失败，使用默认图标");
        }
    } catch {
        iconLoading.value = false;
        msg.error("获取图标失败");
    }
};

/** 检测 URL 标题 */
const detectUrl = async () => {
    if (!formData.url) return msg.warning("请先输入 URL");
    detecting.value = true;
    try {
        const res = await toolsUrlFetch.request("titleUrl", { url: formData.url });
        detecting.value = false;
        if (res.code === 200 && res.data) {
            formData.title = formData.title || res.data;
        }
        // 自动获取图标
        if (!formData._iconInput && !formData._iconServerFile) {
            const filename = await fetchFaviconToServer(formData.url, toolsImgFetch);
            if (filename) {
                formData._iconServerFile = filename;
                formData._iconInput = filename;
            }
        }
    } catch {
        detecting.value = false;
    }
};

// ========== 添加 / 编辑 ==========

const openAddForm = (isFolder: boolean) => {
    formIsEdit.value = false;
    editingItem.value = null;
    formData.url = "";
    formData.title = "";
    formData.isFolder = isFolder;
    formData._iconInput = "";
    formData._iconServerFile = "";
    formShow.value = true;
};

const openEditForm = (item: BookmarkCollectionType) => {
    formIsEdit.value = true;
    editingItem.value = item;
    formData.url = item.url || "";
    formData.title = item.title;
    formData.isFolder = !!item.isFolder;
    formData._iconInput = item.icon || "";
    formData._iconServerFile = item.icon || "";
    formShow.value = true;
};

const confirmForm = async () => {
    if (!formData.title.trim()) return msg.warning("请输入标题");
    if (!formData.isFolder && !formData.url.trim()) return msg.warning("请输入 URL");

    // 确定图标：优先用服务器文件，其次用户输入
    let finalIcon = formData._iconServerFile || formData._iconInput || "";
    // 如果是外部 URL 引用，保留（不存储到服务器）
    // 如果是服务器文件路径，保留

    if (formIsEdit.value && editingItem.value) {
        // 编辑
        editingItem.value.title = formData.title.trim();
        editingItem.value.url = formData.url.trim();
        editingItem.value.icon = finalIcon;
        if (!editingItem.value.children) editingItem.value.children = [];
    } else {
        // 新增
        const newItem: BookmarkCollectionType = {
            uuid: nanoid(10),
            title: formData.title.trim(),
            url: formData.url.trim(),
            icon: finalIcon,
            isFolder: formData.isFolder,
            creatTime: Date.now(),
            modifyTime: Date.now(),
            children: []
        };
        dataList.value = addItemAtPath(dataList.value, curPath.value, newItem);
    }

    const ok = await saveData();
    if (ok) {
        formShow.value = false;
        msg.success(formIsEdit.value ? "已更新" : "已添加");
    }
};

// ========== 删除 ==========

const openDeleteDialog = (item: BookmarkCollectionType) => {
    deleteTarget.value = item;
    deleteShow.value = true;
};

const confirmDelete = async () => {
    if (!deleteTarget.value) return;
    dataList.value = removeItemFromTree(dataList.value, deleteTarget.value.uuid);
    const ok = await saveData();
    if (ok) {
        deleteShow.value = false;
        msg.success("已删除");
    }
};

// ========== 导入 ==========

const toImport = () => {
    importInputRef.value?.click();
};

const handleFileImport = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    try {
        const html = await file.text();
        const items = parseHtmlBookmarks(html);
        if (items.length === 0) return msg.warning("未解析到有效书签数据");

        // 将 base64/URL 图标上传到服务器
        const uploadIcon = async (iconStr: string): Promise<string> => {
            try {
                // 只有 data:base64 才上传
                if (!iconStr.startsWith('data:')) return iconStr;
                const { base64ToFile, myUpload } = await import("@/utils/upload");
                const fileObj = base64ToFile(iconStr);
                const [res] = await myUpload(
                    { data: fileObj, type: "file" },
                    {
                        url: `./api/upload/file/users/${dataStore.pathid}`,
                        other: {
                            headers: {
                                pathid: dataStore.pathid,
                                secondcode: dataStore.secondcode
                            }
                        }
                    }
                );
                if (res?.code === 200 && res?.data?.filename) {
                    return res.data.filename;
                }
            } catch { /* keep original */ }
            return iconStr;
        };
        await resolveImportIcons(items, uploadIcon);

        // 逐个导入到当前目录
        for (const item of items) {
            dataList.value = addItemAtPath(dataList.value, curPath.value, item);
        }

        const ok = await saveData();
        if (ok) {
            msg.success(`成功导入 ${countBookmarks(items)} 个书签`);
        }
        input.value = "";
    } catch (err) {
        msg.error("文件解析失败");
        console.error(err);
    }
};

function countBookmarks(items: BookmarkCollectionType[]): number {
    let c = 0;
    for (const it of items) {
        if (!it.isFolder) c++;
        if (it.children) c += countBookmarks(it.children);
    }
    return c;
}

// ========== 导出 ==========

const toExport = async () => {
    if (searchKey.value) return;

    // 按当前路径取文件夹内容，同时拿文件夹名
    let folder = dataList.value;
    let title = props.bookmark.title;
    for (const uuid of curPath.value) {
        const f = folder.find(item => item.uuid === uuid && item.isFolder);
        if (!f || !f.children) return msg.warning("当前目录不存在");
        title = f.title;
        folder = f.children;
    }
    const exportItems = [...folder];
    if (exportItems.length === 0) return msg.warning("当前目录为空，无内容可导出");

    // 导出前将服务器图标转为 base64
    const cloned = JSON.parse(JSON.stringify(exportItems));
    await resolveIconsToBase64(cloned);

    const html = generateHtmlBookmarks(cloned, title);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    msg.success("导出成功");
};

/** 递归将树中所有图标转为 base64（用于导出） */
async function resolveIconsToBase64(items: BookmarkCollectionType[]) {
    for (const item of items) {
        if (item.icon && !item.icon.startsWith("data:") && !item.icon.startsWith("http")) {
            try {
                const b64 = await iconFileToBase64(item.icon, iconBaseUrl.value);
                if (b64) item.icon = b64;
            } catch {
                // 保留原值
            }
        }
        if (item.children) await resolveIconsToBase64(item.children);
    }
}

// ========== 刷新信号 ==========
watch(() => props.refreshKey, () => initData());

onMounted(() => initData());
</script>

<style scoped>
.bookmark-list {
    overflow-y: auto;
    max-height: calc(100vh - 220px);
    scrollbar-width: none;
}

.bookmark-list::-webkit-scrollbar {
    display: none;
}

.bookmark-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background-color 0.15s;
    min-height: 52px;
}

.bookmark-row {
    -webkit-user-select: none;
    user-select: none;
    -webkit-touch-callout: none;
}

.bookmark-row:active {
    background-color: rgba(128, 128, 128, 0.15);
}

.icon-box {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    flex-shrink: 0;
    /* 暗色背景 + 深色图标 = 看不见，垫一层浅底 */
    background: rgba(245, 245, 245, 0.15);
    box-shadow: 0 0 0 1px rgba(128, 128, 128, 0.08);
}

.icon-img {
    width: 16px;
    height: 16px;
    border-radius: 2px;
    object-fit: contain;
}

.bookmark-title {
    flex: 1;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.bookmark-url {
    color: #888;
    font-size: 11px;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: none;
}

/* 桌面端 hover 显示 URL */
@media (hover: hover) {
    .bookmark-row:hover {
        background-color: rgba(128, 128, 128, 0.1);
    }
    .bookmark-row:hover .bookmark-url {
        display: inline;
    }
    .bookmark-actions {
        display: none;
        gap: 4px;
        flex-shrink: 0;
    }
    .bookmark-row:hover .bookmark-actions {
        display: inline-flex;
    }
}

/* 触屏设备：不用操作按钮，改成长按弹出菜单 */
@media (hover: none) {
    .bookmark-actions {
        display: none;
    }
}

.form-line {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
}

.form-line .n-input {
    flex: 1;
}

.mt-30 {
    margin-top: 30px;
}
</style>
