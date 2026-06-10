<template>
    <n-modal v-model:show="modelShow" :mask-closable="props.maskClosable" :display-directive="props.displayDirective" :trap-focus="props.trapFocus">
        <div class="modalBox">
            <n-card>
                <div class="card flex flex-col" :style="{ minHeight: props.contentMinHeight, maxHeight: props.contentMaxHeight }">
                    <div class="header">
                        <slot name="header">
                            <n-flex justify="space-between" align="center" class="mb-2" v-if="props.title">
                                <div :class="props.titleClass || `fs-14 fw-bold`">{{ props.title }}</div>
                                <n-button quaternary circle size="tiny" @click="modelShow = false">
                                    <template #icon>
                                        <n-icon size="30"><IosClose /></n-icon>
                                    </template>
                                </n-button>
                            </n-flex>
                        </slot>
                    </div>

                    <div class="flex-1 min-h-0 mb-2" style="display: grid; grid-template-rows: minmax(0, 1fr); overflow: hidden">
                        <n-scrollbar v-if="props.isScroll" :class="props.scrollClass">
                            <slot></slot>
                        </n-scrollbar>
                        <slot v-else></slot>
                    </div>
                    <div class="footer">
                        <slot name="footer"></slot>
                    </div>
                </div>
            </n-card>
        </div>
    </n-modal>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { IosClose } from "@vicons/ionicons4";

const props = withDefaults(
    defineProps<{
        show: boolean;
        contentMaxHeight?: string;
        maskClosable?: boolean;
        title?: string;
        displayDirective?: "if" | "show";
        titleClass?: string;
        contentMinHeight?: string;
        isScroll?: boolean;
        scrollClass?: string;
        trapFocus?: boolean;
    }>(),
    {
        show: false,
        title: "",
        contentMaxHeight: "70vh",
        contentMinHeight: "300px",
        maskClosable: true,
        displayDirective: "if",
        isScroll: true,
        scrollClass: "pr-1 pl-1",
        trapFocus: true
    }
);

const emits = defineEmits(["update:show"]);

const modelShow = computed({
    get: () => props.show,
    set: (val) => {
        emits("update:show", val);
    }
});
</script>
