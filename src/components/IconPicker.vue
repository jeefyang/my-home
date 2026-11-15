<template>
    <div class="icon-picker">
        <div class="picker-preview">
            <span class="preview-box" aria-hidden="true">
                <span v-if="isSvgIcon(modelValue)" class="preview-svg" v-html="modelValue"></span>
                <span v-else-if="modelValue" class="preview-text">{{ modelValue }}</span>
                <span v-else class="preview-empty">?</span>
            </span>
            <span class="preview-label">{{ modelValue ? "当前图标" : "未选择图标" }}</span>
            <n-button v-if="modelValue" size="tiny" quaternary @click="clear">清除</n-button>
        </div>

        <n-tabs v-model:value="tab" type="segment" size="small" animated>
            <n-tab-pane name="builtin" tab="内置图标">
                <div class="pkg-list" role="group" aria-label="图标包">
                    <button
                        v-for="pkg in packages"
                        :key="pkg.id"
                        type="button"
                        class="pkg-btn"
                        :class="{ 'is-active': currentPkg === pkg.id }"
                        @click="currentPkg = pkg.id"
                    >
                        {{ pkg.label }}
                    </button>
                </div>
                <div class="icon-grid" role="group" aria-label="内置图标">
                    <button
                        v-for="icon in visibleIcons"
                        :key="icon.id"
                        type="button"
                        class="icon-btn"
                        :class="{ 'is-active': icon.svg === modelValue }"
                        :title="icon.id"
                        :aria-label="icon.id"
                        :aria-pressed="icon.svg === modelValue"
                        @click="choose(icon.svg)"
                    >
                        <span class="icon-svg" v-html="icon.svg"></span>
                    </button>
                </div>
            </n-tab-pane>
            <n-tab-pane name="text" tab="Emoji / 单字">
                <div class="symbol-grid" role="group" aria-label="Emoji 图标">
                    <button
                        v-for="symbol in EMOJI_SYMBOLS"
                        :key="symbol"
                        type="button"
                        class="symbol-btn emoji"
                        :class="{ 'is-active': symbol === modelValue }"
                        :aria-pressed="symbol === modelValue"
                        @click="choose(symbol)"
                    >
                        {{ symbol }}
                    </button>
                </div>
                <div class="symbol-grid" role="group" aria-label="单字图标">
                    <button
                        v-for="symbol in TEXT_SYMBOLS"
                        :key="symbol"
                        type="button"
                        class="symbol-btn"
                        :class="{ 'is-active': symbol === modelValue }"
                        :aria-pressed="symbol === modelValue"
                        @click="choose(symbol)"
                    >
                        {{ symbol }}
                    </button>
                </div>
            </n-tab-pane>
        </n-tabs>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import PAGE_ICONS from "@/assets/page-icons.json";
import { EMOJI_SYMBOLS, TEXT_SYMBOLS } from "@/assets/page-symbols";
import { isSvgIcon } from "@/utils/pageIcon";

type IconEntry = { id: string; svg: string };

const props = defineProps<{ modelValue?: string }>();
const emit = defineEmits<{ (e: "update:modelValue", value: string): void }>();

const packages = [
    { id: "tabler", label: "Tabler" },
    { id: "carbon", label: "Carbon" },
    { id: "material", label: "Material" },
    { id: "fluent", label: "Fluent" },
    { id: "ionicons4", label: "Ionicons 4" },
    { id: "ionicons5", label: "Ionicons 5" }
];

const tab = ref<"builtin" | "text">("builtin");
const currentPkg = ref("tabler");

const allIcons: IconEntry[] = Object.entries(PAGE_ICONS as Record<string, { from: string; svg: string }>).map(
    ([id, icon]) => ({ id, svg: icon.svg })
);

const visibleIcons = computed(() => allIcons.filter((icon) => icon.id.startsWith(currentPkg.value + "/")));

const choose = (value: string) => {
    emit("update:modelValue", value);
};

const clear = () => {
    emit("update:modelValue", "");
};
</script>
<style scoped>
.icon-picker {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.picker-preview {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: rgba(127, 127, 127, 0.08);
}

.preview-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex: 0 0 36px;
    border-radius: 8px;
    background: rgba(127, 127, 127, 0.14);
    font-size: 24px;
    line-height: 1;
}

.preview-svg,
.preview-svg :deep(svg) {
    display: block;
    width: 24px;
    height: 24px;
}

.preview-text {
    font-size: 22px;
    line-height: 1;
}

.preview-empty {
    opacity: 0.45;
    font-size: 16px;
}

.preview-label {
    flex: 1;
    font-size: 12px;
    opacity: 0.72;
}

.pkg-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
}

.pkg-btn {
    padding: 3px 9px;
    border: 1px solid rgba(127, 127, 127, 0.28);
    border-radius: 999px;
    background: transparent;
    color: inherit;
    font-size: 12px;
    cursor: pointer;
}

.pkg-btn.is-active {
    border-color: currentColor;
    background: rgba(127, 127, 127, 0.16);
    font-weight: 600;
}

.icon-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
    gap: 6px;
    max-height: 210px;
    overflow-y: auto;
    padding: 2px;
}

.icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1;
    border: 1px solid transparent;
    border-radius: 8px;
    background: rgba(127, 127, 127, 0.08);
    color: inherit;
    cursor: pointer;
}

.icon-btn:hover,
.icon-btn.is-active {
    border-color: currentColor;
    background: rgba(127, 127, 127, 0.18);
}

.icon-svg,
.icon-svg :deep(svg) {
    display: block;
    width: 20px;
    height: 20px;
}

.symbol-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(38px, 1fr));
    gap: 6px;
    margin-bottom: 8px;
}

.symbol-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    aspect-ratio: 1;
    border: 1px solid transparent;
    border-radius: 8px;
    background: rgba(127, 127, 127, 0.08);
    color: inherit;
    font-size: 16px;
    cursor: pointer;
}

.symbol-btn.emoji {
    font-size: 20px;
}

.symbol-btn:hover,
.symbol-btn.is-active {
    border-color: currentColor;
    background: rgba(127, 127, 127, 0.18);
}
</style>
