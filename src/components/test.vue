<template>
    <div>123</div>
</template>

<script setup lang="ts">
import { useMessage } from "naive-ui";
import { onMounted } from "vue";

const msg = useMessage();

onMounted(() => {
    msg.success("123");
});
</script>
