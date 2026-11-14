import { itemFetch, pageFetch, userFetch } from "@/utils/jFetch";
import { defineStore } from "pinia";
import { ref, type Ref } from "vue";
import { initThemeOverrides } from "./themeOverride";
import type { GlobalThemeOverrides } from "naive-ui";


export const useDataStore = defineStore("data", () => {
    const pathid = ref("");
    const secondcode = ref("");
    const user = ref(null as unknown as UserType);
    const pageList = ref(<PageType[]>[]);
    const switchPageUUID = ref("");
    const isMobile = ref(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    const isSmallScreen = ref(window.innerWidth < 768);
    const themeOverrides = ref(<GlobalThemeOverrides>{});
    const floatBtnX = ref(1000);
    const floatBtnY = ref(0);
    const fullLoading = ref(false);
    const fullLoadingTitle = ref("");

    const saveKey = "data";

    const returnData = {
        pathid, secondcode, switchPageUUID, floatBtnX, floatBtnY, themeOverrides
    };
    type LocalKey = keyof typeof returnData;

    const getLocalData = () => {
        const str = localStorage.getItem(saveKey);
        if (!str) {
            return {};
        }
        try {
            return JSON.parse(str) || {};
        } catch (err) {
            console.warn("本地缓存已损坏，已重置", err);
            localStorage.removeItem(saveKey);
            return {};
        }
    };

    const save = (newObj?: any) => {
        if (newObj) {
            localStorage.setItem(saveKey, newObj);
            return;
        }
        const obj: Record<string, unknown> = {};
        for (const key of Object.keys(returnData) as LocalKey[]) {
            obj[key] = returnData[key].value;
        }
        localStorage.setItem(saveKey, JSON.stringify(obj));
    };

    const load = () => {
        const config = localStorage.getItem(saveKey);
        if (config) {
            let obj: any = {};
            try {
                obj = JSON.parse(config) || {};
            } catch (err) {
                console.warn("本地缓存已损坏，已忽略", err);
                localStorage.removeItem(saveKey);
            }
            for (const key of Object.keys(obj) as LocalKey[]) {
                const target = returnData[key] as Ref<any> | undefined;
                if (target && obj[key] != null) {
                    target.value = obj[key];
                }
            }
        }
        const params = (new URL(location.href)).searchParams;
        for (const key of Object.keys(returnData) as LocalKey[]) {
            const param = params.get(key);
            if (param == null || param == "") {
                continue;
            }
            (returnData[key] as Ref<any>).value = param;
        }
    };

    const clear = () => {
        localStorage.removeItem(saveKey);
    };

    const initUser = async () => {
        const userRes = await userFetch.request('getUser');
        if (userRes.code != 200) {
            return userRes;
        }
        user.value = userRes.data!;
        pathid.value = user.value.pathID || "";
        secondcode.value = user.value.secondCode || "";
        save();
        return userRes;
    };

    /**
     * 主题与页面数据互不依赖，调用方可以并行发起，省掉一次串行往返。
     * 失败时保留本地缓存的主题，不清空。
     */
    const initTheme = async () => {
        const themeRes = await userFetch.request("getUserData", { filename: "themeOverrides.json" });
        if (themeRes.code != 200) {
            return themeRes;
        }
        if (themeRes.data) {
            try {
                const data = JSON.parse(themeRes.data) || {};
                themeOverrides.value = initThemeOverrides(data);
            } catch (err) {
                console.warn("主题配置解析失败，使用已缓存主题", err);
            }
        }
        save();
        return themeRes;
    };

    const initPages = async () => {
        const uuidList = user.value.pageUUIDList || [];
        const pageRes = uuidList.length != 0 ? await pageFetch.request("getPageList", { uuidList }) : await pageFetch.request("initPages");
        if (pageRes.code != 200 || !Array.isArray(pageRes.data)) {
            return pageRes;
        }
        pageList.value = pageRes.data;
        user.value.pageUUIDList = pageRes.data.map((item) => item.uuid);
        if (pageList.value.length == 0) {
            // 没有任何页面时保持空态，不能去取 pageList[0]
            switchPageUUID.value = "";
            save();
            return pageRes;
        }
        let pageIndex = pageList.value.findIndex(item => item.uuid == switchPageUUID.value);
        if (pageIndex != -1) {
            return pageRes;
        }
        pageIndex = pageList.value.findIndex(item => item.isDefault);
        if (pageIndex != -1) {
            switchPageUUID.value = pageList.value[pageIndex]!.uuid;
            return pageRes;
        }
        switchPageUUID.value = pageList.value[0]!.uuid;
        save();
        return pageRes;
    };

    const resize = () => {
        isSmallScreen.value = window.innerWidth < 768;
    };

    const turnLoading = (v: boolean, title?: string) => {
        fullLoading.value = v;
        fullLoadingTitle.value = v ? title || "" : "";
    };




    load();

    return { ...returnData, user, pageList, load, save, clear, initUser, initPages, initTheme, isMobile, isSmallScreen, resize, themeOverrides, getLocalData, fullLoading, fullLoadingTitle, turnLoading };
});