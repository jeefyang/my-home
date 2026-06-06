<template>
    <div class="memo-wrap">
        <n-divider v-if="props.display != 'btn' && props.display != 'icon'" style="margin-top: 0; margin-bottom: 2px" dashed>
            <div style="font-size: 12px">{{ props.item?.options?.title || "备忘录" }}</div>
        </n-divider>
        <!-- 对话历史 -->
        <div ref="historyRef" class="memo-history" @scroll="onHistoryScroll">
            <div v-for="(msg, idx) in messageList" :key="msg.uuid" class="memo-item" :class="{ active: activeIdx === idx }" @click="(e) => toggleActions(e, idx)">
                <div class="memo-head">
                    <span class="memo-time">{{ formatTime(msg.createTime) }}</span>
                    <span class="memo-actions" @click.stop>
                        <n-button quaternary size="tiny" type="info" @click="copyMsg(msg.content)"><n-icon :component="Copy" size="13" /></n-button>
                        <n-button quaternary size="tiny" type="warning" @click="openEdit(idx)"><n-icon :component="Edit" size="13" /></n-button>
                        <n-button quaternary size="tiny" type="error" @click="openDelete(idx)"><n-icon :component="Trash" size="13" /></n-button>
                    </span>
                </div>
                <div class="memo-text" v-text="msg.content" @dblclick.stop="copyMsg(msg.content)"></div>
            </div>
            <div v-if="messageList.length === 0" class="memo-empty">暂无记录</div>
        </div>

        <!-- 工具栏 -->
        <n-flex v-if="!searchKey" justify="start" style="padding: 2px 8px; gap: 4px; flex-shrink: 0">
            <n-button quaternary size="tiny" type="info" @click="initData">
                <template #icon><n-icon :component="Refresh" size="14" /></template>
            </n-button>
            <n-button quaternary size="tiny" type="error" @click="clearAll">
                <template #icon><n-icon :component="Trash" size="14" /></template>
            </n-button>
        </n-flex>

        <!-- 输入区 -->
        <div class="memo-input-area" style="flex-shrink: 0">
            <n-input v-model:value="inputText" type="textarea" :autosize="{ minRows: 1, maxRows: 2 }" placeholder="输入内容，Enter 发送" style="flex: 1" @keydown="onInputKeydown" />
            <n-button type="primary" size="small" style="margin-left: 6px; align-self: flex-end" @click="send"> 发送 </n-button>
        </div>
    </div>

    <!-- 编辑弹窗 -->
    <x-modal v-model:show="editShow" title="编辑">
        <n-input v-model:value="editText" type="textarea" :autosize="{ minRows: 3, maxRows: 12 }" />
        <template #footer>
            <n-flex justify="end">
                <n-button @click="editShow = false">取消</n-button>
                <n-button type="primary" @click="confirmEdit">保存</n-button>
            </n-flex>
        </template>
    </x-modal>

    <!-- 删除确认 -->
    <x-modal v-model:show="deleteShow" title="确认删除">
        <p v-if="!deleteAll">确定删除这条记录吗？</p>
        <p v-else>确定清空所有记录吗？</p>
        <template #footer>
            <n-flex justify="end">
                <n-button @click="deleteShow = false">取消</n-button>
                <n-button type="error" @click="confirmDelete">删除</n-button>
            </n-flex>
        </template>
    </x-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { Refresh, Copy, Edit, Trash } from "@vicons/tabler";
import { itemFetch } from "@/utils/jFetch";
import { useMessage } from "naive-ui";
import { nanoid } from "nanoid";
import XModal from "@/components/XModal.vue";

type MemoType = {
    uuid: string;
    content: string;
    createTime: number;
    modifyTime: number;
};

const msg = useMessage();

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    display: ItemDisplayType;
}>();

const filename = "memoList.json";
const messageList = ref(<MemoType[]>[]);
const inputText = ref("");
const historyRef = ref<HTMLElement | null>(null);
const searchKey = ref("");
const loading = ref(false);

// 编辑
const editShow = ref(false);
const editText = ref("");
const editIndex = ref(-1);

// 删除
const deleteShow = ref(false);
const deleteIndex = ref(-1);

// 操作按钮显隐（移动端点击切换）
const activeIdx = ref(-1);
const toggleActions = (e: MouseEvent | TouchEvent, idx: number) => {
    const target = e.target as HTMLElement;
    if (target.closest(".memo-actions") || target.closest(".memo-text")) return;
    activeIdx.value = activeIdx.value === idx ? -1 : idx;
};

// ====== 数据 ======
const initData = async () => {
    loading.value = true;
    const res = await itemFetch.request("getItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename
    });
    if (res.code !== 200) {
        msg.error(res.msg);
        loading.value = false;
        return;
    }
    messageList.value = res.data ? JSON.parse(res.data) : [];
    loading.value = false;
    setTimeout(scrollToBottom, 50);
};

const saveData = async (): Promise<boolean> => {
    const res = await itemFetch.request("updateItemData", {
        itemType: props.item.type,
        itemUUID: props.item.uuid,
        filename,
        content: JSON.stringify(messageList.value)
    });
    if (res.code !== 200) {
        msg.error("保存失败");
        return false;
    }
    return true;
};

// ====== 滚动 ======
const scrollToBottom = () => {
    nextTick(() => {
        const el = historyRef.value;
        if (el) el.scrollTop = el.scrollHeight;
    });
};

let isUserScrolling = false;
const onHistoryScroll = () => {
    const el = historyRef.value;
    if (!el) return;
    // 如果用户手动滚上去就标记，滚到底部就取消标记
    isUserScrolling = el.scrollTop + el.clientHeight < el.scrollHeight - 10;
};

// ====== 输入 ======
const onInputKeydown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        send();
    }
};

const send = async () => {
    const text = inputText.value.trim();
    if (!text) return;
    const now = Date.now();
    messageList.value.push({
        uuid: nanoid(10),
        content: text,
        createTime: now,
        modifyTime: now
    });
    inputText.value = "";
    const ok = await saveData();
    if (ok) {
        scrollToBottom();
        isUserScrolling = false;
    }
};

// ====== 编辑 ======
const copyMsg = (text: string) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    msg.success("已复制");
};

const openEdit = (idx: number) => {
    editIndex.value = idx;
    editText.value = messageList.value[idx].content;
    editShow.value = true;
};

const confirmEdit = async () => {
    if (editIndex.value < 0 || !editText.value.trim()) return;
    messageList.value[editIndex.value].content = editText.value.trim();
    messageList.value[editIndex.value].modifyTime = Date.now();
    const ok = await saveData();
    if (ok) {
        editShow.value = false;
        msg.success("已更新");
    }
};

// ====== 删除 ======
const openDelete = (idx: number) => {
    deleteIndex.value = idx;
    deleteShow.value = true;
};

const confirmDelete = async () => {
    if (deleteAll.value) {
        messageList.value = [];
        deleteAll.value = false;
        const ok = await saveData();
        if (ok) {
            deleteShow.value = false;
            msg.success("已清空");
        }
        return;
    }
    if (deleteIndex.value < 0) return;
    messageList.value.splice(deleteIndex.value, 1);
    const ok = await saveData();
    if (ok) {
        deleteShow.value = false;
        msg.success("已删除");
    }
};

// ====== 格式化时间 ======
const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
};
const pad = (n: number) => (n < 10 ? "0" + n : "" + n);

const clearAll = () => {
    if (messageList.value.length === 0) return msg.warning("没有内容可清空");
    deleteShow.value = true;
    deleteAll.value = true;
};

const deleteAll = ref(false);

onMounted(() => initData());
</script>

<style scoped>
.memo-wrap {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
    top: 0;
}

.memo-history {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px;
    scrollbar-width: none;
    max-height: 100%;
}

.memo-history::-webkit-scrollbar {
    display: none;
}

.memo-item {
    border: 1px solid rgba(128, 128, 128, 0.12);
    border-radius: 8px;
    padding: 8px 10px;
}

.memo-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 4px;
}

.memo-time {
    font-size: 11px;
    color: #888;
}

.memo-actions {
    display: flex;
    gap: 2px;
    opacity: 0;
    transition: opacity 0.15s;
}

/* 桌面 hover 显示操作按钮 */
@media (hover: hover) {
    .memo-item:hover .memo-actions {
        opacity: 1;
    }
}

/* 移动端点击切换显示 */
.memo-item.active .memo-actions {
    opacity: 1;
}

/* 移动端按钮稍大，方便点按 */
@media (hover: none) {
    .memo-actions:not(.hidden) :deep(.n-button) {
        --n-height: 28px;
    }
}

.memo-text {
    font-size: 13px;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
}

.memo-empty {
    text-align: center;
    color: #aaa;
    font-size: 13px;
    padding: 40px 0;
}

.memo-input-area {
    display: flex;
    align-items: flex-start;
    padding: 6px 8px;
    border-top: 1px solid rgba(128, 128, 128, 0.12);
    flex-shrink: 0;
}
</style>
