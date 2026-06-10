<template>
    <n-flex vertical align="center">
        <n-input v-model:value="searchKey" type="text" placeholder="世界之窗" round clearable @keyup.enter="toLink(true)"> </n-input>
        <n-flex align="center">
            <n-button
                v-for="(item, index) in engineList"
                :key="item.uuid"
                @click="switchSearchIndex = index"
                :type="switchSearchIndex == index ? 'primary' : 'default'"
                circle
                style="overflow: hidden"
                size="small"
            >
                <div v-if="!item.icon">{{ item.name[0] }}</div>
                <n-icon size="20" v-else>
                    <img :src="UrlUtils.checkImgUrl(item.icon, `./api/files/items/${props.item.type}/${props.item.uuid}`)" class="icon" />
                </n-icon>
            </n-button>
            <n-button :bordered="false" :type="switchSearchIndex == -1 ? 'primary' : 'default'" @click="switchSearchIndex = -1" circle style="overflow: hidden" size="small">
                <n-icon :component="Link" size="20"> </n-icon>
            </n-button>
            <n-button :bordered="false" type="info" @click="toShow" circle style="overflow: hidden" size="small">
                <n-icon :component="SettingOutlined" size="20"> </n-icon>
            </n-button>
        </n-flex>
        <n-flex>
            <n-button type="primary" size="small" @click="toLink(true)">新开</n-button>
            <n-button size="small" @click="toLink(false)">跳转</n-button>
        </n-flex>
    </n-flex>
    <!-- 设置 -->
    <x-modal v-model:show="show" title="搜索设置" is-item>
        <n-scrollbar>
            <n-button size="small" type="primary" @click="toAddEngine(0)">
                <n-icon :component="Add12Filled"></n-icon>
            </n-button>
            <x-divider></x-divider>
            <n-flex v-if="cacheEngineList.length > 0" vertical>
                <n-flex vertical v-for="(item, index) in cacheEngineList" :key="item.uuid">
                    <label>名称:</label>
                    <n-input v-model:value="item.name" placeholder="请输入引擎名称"></n-input>
                    <label>icon:</label>
                    <n-flex align="center" style="flex-wrap: nowrap">
                        <n-input v-model:value="item.icon" placeholder="接受图片url和base64"></n-input>
                        <n-icon style="width: 32px" size="20" v-if="item.icon">
                            <img :src="UrlUtils.checkImgUrl(item.icon, `./api/files/items/${props.item.type}/${props.item.uuid}`)" class="icon" />
                        </n-icon>
                    </n-flex>

                    <label>搜索路径:</label>
                    <n-input v-model:value="item.url" placeholder="搜索关键字替换请用$$key$$来替换"></n-input>
                    <label>icon生成器:</label>
                    <n-flex style="flex-wrap: nowrap" align="center">
                        <n-input v-model:value="item._iconUrl" placeholder="请输入图标url"> </n-input>
                        <n-button size="small" @click="toCreateIcon(item)">生成</n-button>
                    </n-flex>
                    <n-flex justify="space-between" align="center">
                        <n-flex>
                            <label>默认:</label>
                            <n-switch v-model:value="item.isDefault" />
                        </n-flex>
                        <n-flex>
                            <n-button type="error" @click="toSubEngine(index)">
                                <n-icon :component="Subtract12Filled"></n-icon>
                            </n-button>
                            <n-button type="primary" @click="toAddEngine(index + 1)">
                                <n-icon :component="Add12Filled"></n-icon>
                            </n-button>
                        </n-flex>
                    </n-flex>
                    <x-divider></x-divider>
                </n-flex>
            </n-flex>
            <n-empty v-else description="快添加新的搜索引擎吧"> </n-empty>
        </n-scrollbar>

        <template #footer>
            <n-flex class="mt-1">
                <n-button @click="show = false">取消</n-button>
                <n-button type="primary" @click="submit">确认</n-button>
            </n-flex>
        </template>
    </x-modal>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { onMounted, ref } from "vue";
import XModal from "@/components/XModal.vue";
import { itemFetch, toolsImgFetch } from "@/utils/jFetch";
import { useMessage, useThemeVars } from "naive-ui";
import { nanoid } from "nanoid";
import XDivider from "@/components/XDivider.vue";
import { UrlUtils } from "@/utils/url";
import { SettingOutlined } from "@vicons/antd";
import { Link } from "@vicons/carbon";
import { Subtract12Filled, Add12Filled } from "@vicons/fluent";

const dataStore = useDataStore();
const msg = useMessage();
const themeVars = useThemeVars();
const switchSearchIndex = ref(-1);

const show = ref(false);
const searchKey = ref("");
type EngineType = {
    name: string;
    icon: string;
    url: string;
    uuid: string;
    /** 用来生成图片的,本身不保存的 */
    _iconUrl?: string;
    isDefault?: boolean;
};

const engineList = ref(<EngineType[]>[]);
const cacheEngineList = ref(<EngineType[]>[]);
const engineListFileName = "engineList.json";

const props = defineProps<{
    item: ItemType;
    pageUUID: string;
    itemGroupUUID: string;
    display: ItemDisplayType;
}>();

const toShow = () => {
    cacheEngineList.value = engineList.value.map((c) => ({ ...c }));
    show.value = true;
};

const toAddEngine = (index: number) => {
    cacheEngineList.value.splice(index, 0, {
        uuid: nanoid(10),
        name: "",
        icon: "",
        url: "",
        _iconUrl: ""
    });
};

const toSubEngine = (index: number) => {
    cacheEngineList.value.splice(index, 1);
};

const getEngineList = async () => {
    const res = await itemFetch.request("getItemData", { itemUUID: props.item.uuid, itemType: props.item.type, filename: engineListFileName });
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    const data = res.data ? JSON.parse(res.data) : [];
    engineList.value = data;
    if (engineList.value.length == 0) {
        switchSearchIndex.value = -1;
    } else {
        const index = engineList.value.findIndex((item) => item.isDefault);
        switchSearchIndex.value = index == -1 ? 0 : index;
    }
};

const updateEngineList = async (list: EngineType[]) => {
    const newList = [...list.map((c) => ({ ...c }))];
    // 删除不用的属性
    newList.forEach((c) => {
        delete c._iconUrl;
    });
    const str = JSON.stringify(newList);
    const res = await itemFetch.request("updateItemData", { itemUUID: props.item.uuid, itemType: props.item.type, filename: engineListFileName, content: str });
    if (res.code != 200) {
        msg.error(res.msg);
        return null;
    }
    return newList;
};

const submit = async () => {
    const data = await updateEngineList([...cacheEngineList.value]);
    if (!data) {
        return;
    }
    engineList.value = data;
    msg.success("操作成功");
    if (switchSearchIndex.value >= engineList.value.length) {
        switchSearchIndex.value = -1;
    }
    show.value = false;
};

const toCreateIcon = async (item: EngineType) => {
    if (!item._iconUrl) {
        return msg.error("无效网址");
    }
    const res = await toolsImgFetch.request("favicon", { url: item._iconUrl, platform: "favicon", toUrl: "url", itemType: props.item.type, itemUUID: props.item.uuid });
    if (res.code != 200) {
        return msg.error(res.msg || res.err);
    }
    item.icon = res.data;
};

const toLink = (isNew: boolean) => {
    if (!searchKey.value) {
        return msg.error("请输入关键字");
    }
    if (switchSearchIndex.value == -1) {
        let newUrl = searchKey.value;
        if (!searchKey.value.startsWith("https://") || !searchKey.value.startsWith("http://")) {
            newUrl = "http://" + newUrl;
        }
        if (isNew) {
            window.open(newUrl, "_blank");
        } else {
            window.location.href = newUrl;
        }
        return;
    }
    const item = engineList.value[switchSearchIndex.value];
    if (!item) {
        return msg.error("搜索引擎错误");
    }
    const url = item.url.replace("$$key$$", encodeURIComponent(searchKey.value));
    if (isNew) {
        window.open(url, "_blank");
    } else {
        window.location.href = url;
    }
};

onMounted(() => {
    getEngineList();
});
</script>
