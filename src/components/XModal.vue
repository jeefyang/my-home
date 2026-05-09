<template>
    <n-modal v-model:show="modelShow">
         <div class="modalBox">
            <n-card><slot></slot></n-card>
        </div>
    </n-modal>
</template>
<script setup lang="ts">
import { computed } from "vue";

const props = defineProps({
    show: {
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
