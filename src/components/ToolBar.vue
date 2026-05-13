<template>
    <div v-if="modelShow" class="parent-toolbar">
        <div class="mask" @click="modelShow = false"></div>
        <n-flex class="bar" justify="center">
            <n-flex class="toolbar smallBox" justify="center">
                <!-- 用户设置 -->
                <n-button quaternary circle type="primary">
                    <template #icon>
                        <n-icon :component="User"></n-icon>
                    </template>
                </n-button>
                <!-- 页面设置 -->
                <n-button quaternary circle type="primary" @click="showPageConfig = true">
                    <template #icon>
                        <n-icon :component="DocumentOnePage20Regular"></n-icon>
                    </template>
                </n-button>
                <!-- 项目设置 -->
                <n-button quaternary circle type="primary">
                    <template #icon>
                        <n-icon :component="ControlOutlined"></n-icon>
                    </template>
                </n-button>
                <!-- 路由设置 -->
                <n-button quaternary circle type="primary" @click="showRouter = true">
                    <template #icon>
                        <n-icon :component="RouterOutlined"></n-icon>
                    </template>
                </n-button>
                <!-- 缓存设置 -->
                <n-button quaternary circle type="primary">
                    <template #icon>
                        <n-icon :component="Cookies20Regular"></n-icon>
                    </template>
                </n-button>
                <!-- 登录 -->
                <n-button quaternary circle type="primary" @click="showLogin = true">
                    <template #icon>
                        <n-icon :component="LogInFilled"></n-icon>
                    </template>
                </n-button>
            </n-flex>
        </n-flex>
        <PageConfigModal v-model:show="showPageConfig" :pageUUID="props.pageUUID"></PageConfigModal>
        <RouterModal v-model:show="showRouter"></RouterModal>
        <LoginModal v-model:show="showLogin"></LoginModal>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import PageConfigModal from "./PageConfigModal.vue";
import RouterModal from "./RouterModal.vue";
import LoginModal from "./LoginModal.vue";
import { User } from "@vicons/carbon";
import { DocumentOnePage20Regular, Cookies20Regular } from "@vicons/fluent";
import { ControlOutlined } from "@vicons/antd";
import { RouterOutlined, LogInFilled } from "@vicons/material";

const loginIcon = ``;

const showPageConfig = ref(false);
const showRouter = ref(false);
const showLogin = ref(false);

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    pageUUID: {
        type: String,
        required: true
    }
});

const emits = defineEmits(["update:show"]);

const modelShow = computed({
    get: () => props.show,
    set: (val) => emits("update:show", val)
});
</script>
<style lang="scss" scoped>
.parent-toolbar {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    .mask {
        position: absolute;
        width: 100%;
        height: 100%;
        backdrop-filter: blur(2px); /* 轻微自身模糊让底层渐变透出，增加氛围，但不是主要磨砂 */
        background: rgba(127, 127, 127, 0.2);
        top: 0;
    }
    .bar {
        position: absolute;
        width: 100%;
        bottom: 0;
        margin-bottom: 10px;
    }
    .toolbar {
        /* transition: all 0.25s ease; */
        background: rgba(20, 28, 45, 0.65);
        backdrop-filter: blur(20px) saturate(180%);
        border-radius: 80px;
        padding: 8px 20px;
        box-shadow:
            0 20px 35px -12px rgba(0, 0, 0, 0.4),
            0 0 0 0.5px rgba(255, 255, 255, 0.25) inset,
            0 0 0 1px rgba(80, 140, 255, 0.2);
        transition: all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1);
        border: none;
    }
}
</style>
