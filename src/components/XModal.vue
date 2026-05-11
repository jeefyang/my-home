<template>
    <n-modal v-model:show="modelShow">
        <div class="modalBox">
            <n-card>
                <div class="card" :style="{ maxHeight: props.contentMaxHeight }">
                    <slot></slot>
                </div>
                <template #header>
                    <slot name="header"></slot>
                </template>
                <template #footer>
                    <slot name="footer"></slot>
                </template>
            </n-card>
        </div>
    </n-modal>
</template>
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    contentMaxHeight: {
        type: String,
        default: undefined
    }
});

const emits = defineEmits(["update:show"]);

const modelShow = computed({
    get: () => props.show,
    set: (val) => {
        emits("update:show", val);
    }
});
</script>
