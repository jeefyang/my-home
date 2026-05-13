<template>
    <x-modal v-model:show="modelShow" class="RouterModal">
        <template #header>
            <div>路由设置</div>
        </template>
        <div>唯一路径:(仅管理员修改)</div>
        <n-input class="mb-2" :disabled="dataStore.user.type != 'admin'" :value="cachePathID != undefined ? cachePathID : dataStore.pathid" @update:value="(v) => (cachePathID = v)"></n-input>
        <div>二次验证码</div>
        <n-input
            class="mb-2"
            :value="cacheSecondCode != undefined ? cacheSecondCode : dataStore.secondcode"
            @update:value="(v) => (cacheSecondCode = v)"
            placeholder="加强用户安全性,推荐添加"
        ></n-input>
        <div>修改url参数?(刷新优先读取url参数)</div>
        <n-radio-group v-model:value="fixedUrl" name="radiogroup">
            <n-radio v-for="item in fixedUrlList" :key="item.value" :value="item.value">
                {{ item.label }}
            </n-radio>
        </n-radio-group>
        <template #footer>
            <n-flex>
                <n-button @click="modelShow = false">取消</n-button>
                <n-button type="primary" @click="submit">确定</n-button>
            </n-flex>
        </template>
    </x-modal>
</template>
<script setup lang="ts">
import XModal from "@/components/XModal.vue";
import { useDataStore } from "@/stores/data";
import { userFetch } from "@/utils/jFetch";
import { useMessage } from "naive-ui";
import { computed, ref, watch } from "vue";

const dataStore = useDataStore();
const msg = useMessage();
const cachePathID = ref(<string>undefined);
const cacheSecondCode = ref(<string>undefined);
const fixedUrl = ref(0);
const fixedUrlList: { label: string; value: number }[] = [
    { label: "不修改", value: 0 },
    { label: "显示", value: 1 },
    { label: "隐藏", value: -1 }
];

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
        cachePathID.value = undefined;
        cacheSecondCode.value = undefined;
        fixedUrl.value = 0;
    }
);

const submit = async () => {
    if ((cachePathID.value == dataStore.pathid || !cachePathID.value) && (cacheSecondCode.value == dataStore.secondcode || cacheSecondCode.value == undefined)) {
        msg.warning("路由未修改");
    } else {
        const res = await userFetch.request("editUserPathID", { newPathID: cachePathID.value, newSecondCode: cacheSecondCode.value });
        if (res.code != 200) {
            return msg.error(res.msg);
        }
        dataStore.user = res.data;
        dataStore.pathid = res.data.pathID;
        dataStore.secondcode = res.data.secondCode;
        dataStore.save();
        msg.success(res.msg);
    }
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
        window.location.href = window.location.origin + "?" + new URLSearchParams(obj).toString();
    }
    modelShow.value = false;
};
</script>
<style lang="scss" scoped></style>
