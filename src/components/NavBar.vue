<template>
    <div class="nav-bar" :class="{ 'is-scroll': scrolling, 'is-preview': preview }">
        <div
            ref="scrollRef"
            class="nav-scroll"
            :style="maskStyle"
            role="tablist"
            aria-orientation="horizontal"
            aria-label="页面导航"
            @keydown="onKeydown"
        >
            <button
                v-for="page in pages"
                :key="page.uuid"
                type="button"
                role="tab"
                class="nav-item"
                :class="{ 'is-active': page.uuid === modelValue }"
                :aria-selected="page.uuid === modelValue"
                :tabindex="page.uuid === modelValue ? 0 : -1"
                :data-page-uuid="page.uuid"
                :style="itemStyle(page.uuid)"
                @click="select(page)"
            >
                <span class="nav-icon" aria-hidden="true">
                    <span v-if="isSvgIcon(page.icon)" class="nav-svg" v-html="page.icon"></span>
                    <span v-else-if="page.icon" class="nav-text">{{ page.icon }}</span>
                    <span v-else class="nav-placeholder">{{ placeholder(page.title) }}</span>
                </span>
                <span class="nav-title">{{ page.title }}</span>
                <span v-if="page.uuid === modelValue" class="nav-indicator" aria-hidden="true"></span>
            </button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, nextTick, type CSSProperties } from "vue";
import { useThemeVars } from "naive-ui";
import { useNavScroll } from "@/composables/useNavScroll";
import { isSvgIcon } from "@/utils/pageIcon";

const props = withDefaults(
    defineProps<{
        pages: PageType[];
        modelValue?: string;
        /** 抽屉里的实时预览：不改变滚动进入视野的策略，仅去掉外边距 */
        preview?: boolean;
    }>(),
    { pages: () => [], modelValue: "", preview: false }
);

const emit = defineEmits<{ (e: "select", page: PageType): void }>();

const themeVars = useThemeVars();
const primaryColor = computed(() => themeVars.value.primaryColor);
const count = computed(() => props.pages.length);
const activeUUID = computed(() => props.modelValue);
const scrolling = computed(() => count.value > 5);
const { scrollRef, canLeft, canRight } = useNavScroll(count, activeUUID);

const maskStyle = computed<CSSProperties>(() => {
    if (!scrolling.value) {
        return {};
    }
    const stops = canLeft.value ? ["rgba(0,0,0,0) 0", "#000 16px"] : ["#000 0"];
    if (canRight.value) {
        stops.push("#000 calc(100% - 16px)", "rgba(0,0,0,0) 100%");
    } else {
        stops.push("#000 100%");
    }
    const image = `linear-gradient(to right, ${stops.join(", ")})`;
    return { maskImage: image, WebkitMaskImage: image };
});

const itemStyle = (uuid: string): CSSProperties => {
    const activeColor = uuid === props.modelValue ? primaryColor.value : undefined;
    if (scrolling.value) {
        return { flex: "0 0 20%", maxWidth: "20%", color: activeColor };
    }
    const width = count.value ? `${100 / count.value}%` : "100%";
    return { flex: `0 0 ${width}`, maxWidth: width, color: activeColor };
};

const placeholder = (title: string) => Array.from(title.trim())[0] || "页";

const select = (page: PageType) => {
    emit("select", page);
};

const focusItem = (index: number) => {
    const items = scrollRef.value?.querySelectorAll<HTMLButtonElement>(".nav-item");
    items?.[index]?.focus();
};

const onKeydown = (event: KeyboardEvent) => {
    if (!props.pages.length) {
        return;
    }
    const current = props.pages.findIndex((page) => page.uuid === props.modelValue);
    let next = current === -1 ? 0 : current;
    if (event.key === "ArrowLeft") {
        next = current <= 0 ? props.pages.length - 1 : current - 1;
    } else if (event.key === "ArrowRight") {
        next = current === -1 || current === props.pages.length - 1 ? 0 : current + 1;
    } else if (event.key === "Home") {
        next = 0;
    } else if (event.key === "End") {
        next = props.pages.length - 1;
    } else {
        return;
    }
    event.preventDefault();
    const page = props.pages[next];
    if (!page) {
        return;
    }
    select(page);
    nextTick(() => focusItem(next));
};

defineExpose({ scrollToActive: () => scrollRef.value?.querySelector<HTMLElement>(".nav-item.is-active")?.scrollIntoView({ inline: "center", block: "nearest" }) });
</script>
<style scoped>
.nav-bar {
    position: relative;
    height: 50px;
    margin-top: 5px;
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 6px);
    flex: 0 0 auto;
}

.nav-scroll {
    display: flex;
    height: 100%;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: none;
}

.nav-scroll::-webkit-scrollbar {
    display: none;
}

.is-scroll .nav-scroll {
    scroll-snap-type: x proximity;
}

.is-scroll .nav-item {
    scroll-snap-align: start;
}

.nav-item {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    height: 100%;
    padding: 0 2px;
    border: none;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.nav-item:focus-visible {
    outline: 2px solid v-bind(primaryColor);
    outline-offset: -2px;
    border-radius: 8px;
}

.nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex: 0 0 20px;
    color: inherit;
}

.nav-svg {
    display: block;
    width: 20px;
    height: 20px;
}

.nav-svg :deep(svg) {
    display: block;
    width: 20px;
    height: 20px;
}

.nav-text {
    font-size: 18px;
    line-height: 20px;
}

.nav-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(127, 127, 127, 0.18);
    color: inherit;
    font-size: 10px;
    overflow: hidden;
}

.nav-title {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font-size: 10px;
    line-height: 1.2;
}

.nav-indicator {
    position: absolute;
    bottom: 1px;
    width: 16px;
    height: 2px;
    border-radius: 1px;
    background: currentColor;
}

.is-preview .nav-bar,
.is-preview {
    margin-top: 0;
    padding-bottom: 0;
}
</style>
