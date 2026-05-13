<template>
    <x-modal v-model:show="modelShow" class="LoginModal" :mask-closable="!props.forceLogin">
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
                <n-button @click="modelShow = false" v-if="!props.forceLogin">取消</n-button>
                <n-button type="primary" @click="submit" :loading="loading">登录</n-button>
            </n-flex>
        </template>
    </x-modal>
</template>
<script setup lang="ts">
import XModal from "@/components/XModal.vue";
import { useDataStore } from "@/stores/data";
import { userFetch } from "@/utils/jFetch";
import { useMessage } from "naive-ui";
import path from "path";
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
const loading = ref(false);

const props = defineProps<{
    show: boolean;
    forceLogin?: boolean;
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
    if (props.forceLogin) {
        await toForceLogin();
    } else {
        await toLogin();
    }
};
const toForceLogin = async () => {
    loading.value = true;
    dataStore.pathid = pathID.value;
    dataStore.secondcode = secondCode.value;
    const res = await userFetch.request("verifyUser");
    loading.value = false;
    if (res.code != 200) {
        msg.error(res.msg);
        return;
    }
    await toLogin();
};

const toLogin = async () => {
    dataStore.pathid = pathID.value;
    dataStore.secondcode = secondCode.value;
    dataStore.save();
    if (fixedUrl.value) {
        const params = new URLSearchParams(window.location.search);
        const obj = {};
        for (const [key, value] of params) {
            obj[key] = value;
        }
        if (fixedUrl.value == 1) {
            obj["pathid"] = dataStore.pathid || "";
            obj["secondcode"] = dataStore.secondcode || "";
        } else if (fixedUrl.value == -1) {
            delete obj["pathid"];
            delete obj["secondcode"];
        }
        const origin = window.location.origin + "?" + new URLSearchParams(obj).toString();
        window.location.href = origin;
    } else {
        window.location.reload();
    }

    modelShow.value = false;
};
</script>
<style lang="scss" scoped></style>
