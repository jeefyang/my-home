<template>
    <div>{{ modelBookmark.title }}</div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import type { BookmarkType } from "..";

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    bookmark: BookmarkType;
}>();

const emits = defineEmits(["update:bookmark"]);

const modelBookmark = computed({
    get() {
        return props.bookmark;
    },
    set(val) {
        emits("update:bookmark", val);
    }
});
</script>
<style lang="scss" scoped></style>
