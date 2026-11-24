<template>
    <x-modal v-model:show="modelShow" class="LoginModal">
        <template #header>
            <div>登录</div>
        </template>
        <div>唯一路径:</div>
        <n-input class="mb-2" v-model:value="pathID" placeholder="请输入唯一路径"></n-input>
        <div>二次验证码</div>
        <n-input class="mb-2" v-model:value="secondCode" placeholder="请输入二次验证码"></n-input>
        <div>修改url参数?(刷新优先读取url参数)</div>
        <n-radio-group v-model:value="fixedUrl" name="radiogroup">
            <n-radio v-for="item in fixedUrlList" :key="item.value" :value="item.value">
                {{ item.label }}
            </n-radio>
        </n-radio-group>
        <template #footer>
            <n-flex>
                <n-button @click="modelShow = false">取消</n-button>
                <n-button type="primary" @click="submit" :loading="loading">登录</n-button>
            </n-flex>
        </template>
    </x-modal>
</template>
<script setup lang="ts">
import XModal from "@/components/XModal.vue";
import { useDataStore } from "@/stores/data";
import { useCredentialLogin } from "@/composables/useCredentialLogin";
import { useMessage } from "naive-ui";
import { computed, ref, watch } from "vue";

const dataStore = useDataStore();
const msg = useMessage();
const pathID = ref("");
const secondCode = ref("");
const fixedUrl = ref(0);
const fixedUrlList: { label: string; value: number }[] = [
    { label: "不修改", value: 0 },
    { label: "显示", value: 1 },
    { label: "隐藏", value: -1 }
];
const { loading, error, login } = useCredentialLogin();

const props = defineProps<{
    show: boolean;
}>();

const emits = defineEmits(["update:show"]);

const modelShow = computed({
    get: () => props.show,
    set: (val) => {
        emits("update:show", val);
    }
});

watch(
    () => modelShow.value,
    () => {
        pathID.value = dataStore.pathid || "";
        secondCode.value = dataStore.secondcode || "";
        fixedUrl.value = 0;
    }
);

const submit = async () => {
    if (!pathID.value.trim()) {
        msg.error("请输入唯一路径");
        return;
    }
    const ok = await login({
        pathID: pathID.value.trim(),
        secondCode: secondCode.value,
        fixedUrl: fixedUrl.value
    });
    if (!ok) {
        msg.error(error.value);
    }
};
</script>
<style lang="scss" scoped></style>
