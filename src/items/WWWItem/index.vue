<template>
    <n-flex vertical align="center">
        <n-input type="text" placeholder="世界之窗" round clearable> </n-input>
        <n-flex>
            <n-button :bordered="false" :type="switchSearchIndex == -1 ? 'primary' : 'default'" size="tiny">
                <n-icon v-html="linkIcon"> </n-icon>
            </n-button>
            <n-button :bordered="false" type="info" size="tiny" @click="toShow">
                <n-icon v-html="optionIcon"> </n-icon>
            </n-button>
        </n-flex>
        <n-flex>
            <n-button type="primary" size="small">新开</n-button>
            <n-button size="small">跳转</n-button>
        </n-flex>
    </n-flex>
    <x-modal v-model:show="show">
        <div>搜索设置</div>
        <n-button size="small" type="primary">
            <n-icon v-html="addIcon" @click="toAddEngine(0)"></n-icon>
        </n-button>
        <x-divider></x-divider>
        <n-flex v-if="cacheEngineList.length > 0" vertical>
            <n-flex vertical v-for="item in cacheEngineList" :key="item.uuid">
                <label>名称:</label>
                <n-input v-model:value="item.name" placeholder="请输入引擎名称"></n-input>
                <label>icon:</label>
                <n-input v-model:value="item.icon" placeholder="接受图片url和base64"></n-input>
                <label>搜索路径:</label>
                <n-input v-model:value="item.url" placeholder="搜索关键字替换请用$$key$$来替换"></n-input>
                <label>生成icon:</label>
                <n-flex align="center">
                    <n-input style="flex: 1" v-model:value="item._iconUrl" placeholder="输入网站网址"></n-input>
                    <n-button size="small" @click="toCreatIcon(item)">生成</n-button>
                </n-flex>
            </n-flex>
        </n-flex>
        <n-empty v-else description="快添加新的搜索引擎吧"> </n-empty>
    </x-modal>
</template>
<script setup lang="ts">
import { useDataStore } from "@/stores/data";
import { onMounted, ref } from "vue";
import XModal from "@/components/XModal.vue";
import { itemFetch } from "@/utils/jFetch";
import { useMessage } from "naive-ui";
import { nanoid } from "nanoid";
import XDivider from "@/components/XDivider.vue";
import { getBase64ByUrl, getExternalFaviconUrl } from "@/utils/image";

const dataStore = useDataStore();
const msg = useMessage();
const switchSearchIndex = ref(-1);
const linkIcon = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 512 512" enable-background="new 0 0 512 512" xml:space="preserve"><g><path d="M280,341.1l-1.2,0.1c-3.6,0.4-7,2-9.6,4.5l-64.6,64.6c-13.7,13.7-32,21.2-51.5,21.2c-19.5,0-37.8-7.5-51.5-21.2
		c-13.7-13.7-21.2-32-21.2-51.5c0-19.5,7.5-37.8,21.2-51.5l68.6-68.6c3.5-3.5,7.3-6.6,11.4-9.3c4.6-3,9.6-5.6,14.8-7.5
		c4.8-1.8,9.9-3,15-3.7c3.4-0.5,6.9-0.7,10.2-0.7c1.4,0,2.8,0.1,4.6,0.2c17.7,1.1,34.4,8.6,46.8,21c7.7,7.7,13.6,17.1,17.1,27.3
		c2.8,8,11.2,12.5,19.3,10.1c0.1,0,0.2-0.1,0.3-0.1c0.1,0,0.2,0,0.2-0.1c8.1-2.5,12.8-11,10.5-19.1c-4.4-15.6-12.2-28.7-24.6-41
		c-15.6-15.6-35.9-25.8-57.6-29.3c-1.9-0.3-3.8-0.6-5.7-0.8c-3.7-0.4-7.4-0.6-11.1-0.6c-2.6,0-5.2,0.1-7.7,0.3
		c-5.4,0.4-10.8,1.2-16.2,2.5c-1.1,0.2-2.1,0.5-3.2,0.8c-6.7,1.8-13.3,4.2-19.5,7.3c-10.3,5.1-19.6,11.7-27.7,19.9l-68.6,68.6
		C58.9,304.4,48,330.8,48,359c0,28.2,10.9,54.6,30.7,74.4C98.5,453.1,124.9,464,153,464c28.2,0,54.6-10.9,74.4-30.7l65.3-65.3
		C303.1,357.5,294.7,339.7,280,341.1z"></path><path d="M433.3,78.7C413.5,58.9,387.1,48,359,48s-54.6,10.9-74.4,30.7l-63.7,63.7c-9.7,9.7-3.6,26.3,10.1,27.4
		c4.7,0.4,9.3-1.3,12.7-4.6l63.8-63.6c13.7-13.7,32-21.2,51.5-21.2s37.8,7.5,51.5,21.2c13.7,13.7,21.2,32,21.2,51.5
		c0,19.5-7.5,37.8-21.2,51.5l-68.6,68.6c-3.5,3.5-7.3,6.6-11.4,9.3c-4.6,3-9.6,5.6-14.8,7.5c-4.8,1.8-9.9,3-15,3.7
		c-3.4,0.5-6.9,0.7-10.2,0.7c-1.4,0-2.9-0.1-4.6-0.2c-17.7-1.1-34.4-8.6-46.8-21c-7.3-7.3-12.8-16-16.4-25.5
		c-2.9-7.7-11.1-11.9-19.1-9.8c-8.9,2.3-14.1,11.7-11.3,20.5c4.5,14,12.1,25.9,23.7,37.5l0,0l0.2,0.2c16.9,16.9,39.4,27.6,63.3,30.1
		c3.7,0.4,7.4,0.6,11.1,0.6c2.6,0,5.2-0.1,7.8-0.3c6.5-0.5,13-1.6,19.3-3.2c6.7-1.8,13.3-4.2,19.5-7.3c10.3-5.1,19.6-11.7,27.7-19.9
		l68.6-68.6c19.8-19.8,30.7-46.2,30.7-74.4S453.1,98.5,433.3,78.7z"></path></g></svg>`;
const optionIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 28 28"><g fill="none"><path d="M14 9.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 0 0 0-9zM11 14a3 3 0 1 1 6 0a3 3 0 0 1-6 0zm10.71 8.395l-1.728-.759a1.72 1.72 0 0 0-1.542.086c-.467.27-.765.747-.824 1.284l-.208 1.88a.923.923 0 0 1-.703.796a11.67 11.67 0 0 1-5.412 0a.923.923 0 0 1-.702-.796l-.208-1.877a1.701 1.701 0 0 0-.838-1.281a1.694 1.694 0 0 0-1.526-.086l-1.728.759a.92.92 0 0 1-1.043-.215a12.064 12.064 0 0 1-2.707-4.672a.924.924 0 0 1 .334-1.016l1.527-1.128a1.7 1.7 0 0 0 0-2.74l-1.527-1.125a.924.924 0 0 1-.334-1.017A12.059 12.059 0 0 1 5.25 5.821a.92.92 0 0 1 1.043-.214l1.72.757a1.707 1.707 0 0 0 2.371-1.376l.21-1.878a.923.923 0 0 1 .715-.799c.881-.196 1.78-.3 2.704-.311c.902.01 1.8.115 2.68.311a.922.922 0 0 1 .715.8l.209 1.878a1.701 1.701 0 0 0 1.688 1.518c.233 0 .464-.049.68-.144l1.72-.757a.92.92 0 0 1 1.043.214a12.057 12.057 0 0 1 2.708 4.667a.924.924 0 0 1-.333 1.016l-1.525 1.127c-.435.32-.698.829-.698 1.37c0 .54.263 1.049.699 1.37l1.526 1.126c.316.234.45.642.334 1.017a12.065 12.065 0 0 1-2.707 4.667a.92.92 0 0 1-1.043.215zm-5.447-.198a3.162 3.162 0 0 1 1.425-1.773a3.22 3.22 0 0 1 2.896-.161l1.344.59a10.565 10.565 0 0 0 1.97-3.398l-1.189-.877v-.001a3.207 3.207 0 0 1-1.309-2.578c0-1.027.497-1.98 1.307-2.576l.002-.001l1.187-.877a10.56 10.56 0 0 0-1.971-3.397l-1.333.586l-.002.001c-.406.18-.843.272-1.286.272a3.202 3.202 0 0 1-3.178-2.852v-.002l-.163-1.46a11.476 11.476 0 0 0-1.95-.193c-.674.009-1.33.074-1.975.193l-.163 1.461A3.207 3.207 0 0 1 7.41 7.737l-1.336-.588a10.558 10.558 0 0 0-1.971 3.397l1.19.877a3.201 3.201 0 0 1 0 5.155l-1.19.878a10.565 10.565 0 0 0 1.97 3.403l1.345-.59a3.194 3.194 0 0 1 2.878.16a3.2 3.2 0 0 1 1.579 2.411v.005l.162 1.464c1.297.255 2.63.255 3.927 0l.162-1.467c.024-.22.07-.437.138-.645z" fill="currentColor"></path></g></svg>`;
const addIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"></path></svg>`;
const subIcon = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 28 28"><g fill="none"><path d="M3 14a1 1 0 0 1 1-1h20a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1z" fill="currentColor"></path></g></svg>`;

const show = ref(false);
type EngineType = {
    name: string;
    icon: string;
    url: string;
    uuid: string;
    /** 用来生成图片的,本身不保存的 */
    _iconUrl?: string;
};

const engineList = ref(<EngineType[]>[]);
const cacheEngineList = ref(<EngineType[]>[]);
const engineListFileName = "engineList.json";

const props = defineProps<{
    item: ItemType;
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

const toCreatIcon = async (item: EngineType) => {
    if (!item._iconUrl) {
        return msg.error("无效网址");
    }
    const url = getExternalFaviconUrl(item._iconUrl, "google");
    if (!url) {
        return msg.error("无效网址");
    }
    const base64 = await getBase64ByUrl(url);
    item.icon = base64;
};

const getEngineList = async () => {
    const res = await itemFetch.request("getItemData", { itemUUID: props.item.uuid, itemType: props.item.type, filename: engineListFileName });
    if (res.code != 200) {
        return msg.error(res.msg);
    }
    const data = res.data ? JSON.parse(res.data) : [];
    engineList.value = data;
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
        return msg.error(res.msg);
    }
    engineList.value = newList;
};

onMounted(() => {
    console.log(props.display);
    getEngineList();
});
</script>
