<template>
    <n-flex class="fullLoading" justify="center" align="center" vertical>
        <n-flex vertical>
            <n-spin size="large" />
            <n-text>正在加载...</n-text>
        </n-flex>
    </n-flex>
</template>
<script setup lang="ts"></script>
<style lang="css" scoped>
.fullLoading {
    width: 100vw;
    height: 100vh;
    backdrop-filter: blur(2px); /* 轻微自身模糊让底层渐变透出，增加氛围，但不是主要磨砂 */
    background: rgba(0, 0, 0, 0.4);
}
</style>
