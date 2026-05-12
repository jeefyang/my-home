<template>
    <n-modal v-model:show="modelShow" :loading="props.loading">
        <div class="modalBox">
            <n-card style="min-height: 300px;">
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
    },
    loading: {
        type: Boolean,
        default: false
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
