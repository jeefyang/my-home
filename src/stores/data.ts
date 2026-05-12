import { itemFetch, pageFetch, userFetch } from "@/utils/jFetch";
import { defineStore } from "pinia";
import { ref } from "vue";
import { initThemeOverrides } from "./themeOverride";
import type { GlobalThemeOverrides } from "naive-ui";


export const useDataStore = defineStore("data", () => {
    const pathid = ref("");
    const password = ref("");
    const user = ref(<UserType>null);
    const pageList = ref(<PageType[]>[]);
    const switchPageUUID = ref("");
    const isMobile = ref(window.innerWidth < 768);
    const themeOverrides = ref(<GlobalThemeOverrides>{});
    const floatBtnX = ref(1000);
    const floatBtnY = ref(0);
    const fullLoading = ref(false);

    const saveKey = "data";

    const returnData = {
        pathid, password, switchPageUUID, floatBtnX, floatBtnY
    };

    const getLocalData = () => {
        const str = localStorage.getItem(saveKey);
        if (!str) {
            return {};
        }
        return JSON.parse(str);
    };

    const save = (newObj?: any) => {
        if (newObj) {
            localStorage.setItem(saveKey, newObj);
            return;
        }
        const obj: any = {};
        for (let key in returnData) {
            obj[key] = returnData[key].value;
        }
        localStorage.setItem(saveKey, JSON.stringify(obj));
    };

    const load = () => {
        const config = localStorage.getItem(saveKey);
        if (config) {
            const obj = JSON.parse(config);
            for (let key in obj) {
                if (returnData[key]) {
                    returnData[key].value = obj[key];
                }

            }
        }
        const params = (new URL(location.href)).searchParams;
        for (let key in returnData) {
            const param = params.get(key);
            if (param == null) {
                continue;
            }
            returnData[key].value = param;
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
        pathid.value = user.value.pathID;
        password.value = userRes.data!.password;
        const themeRes = await userFetch.request("getUserData", { filename: "themeOverrides.json" });
        if (themeRes.code == 200) {
            const data = themeRes.data ? JSON.parse(themeRes.data) : {};
            themeOverrides.value = initThemeOverrides(data || {} as any);
        }
        save();
        return userRes;
    };

    const initPages = async () => {
        const pageRes = user.value.pageUUIDList.length != 0 ? await pageFetch.request("getPageList", { uuidList: user.value.pageUUIDList }) : await pageFetch.request("initPages");
        user.value.pageUUIDList = pageRes.data!.map(item => item.uuid);
        pageList.value = pageRes.data!;
        let pageIndex = pageList.value.findIndex(item => item.uuid == switchPageUUID.value);
        if (pageIndex != -1) {
            return pageRes;
        }
        pageIndex = pageList.value.findIndex(item => item.isDefault);
        if (pageIndex != -1) {
            switchPageUUID.value = pageList.value[pageIndex].uuid;
            return pageRes;
        }
        switchPageUUID.value = pageList.value[0].uuid;
        save();
        return pageRes;
    };

    const resize = () => {
        isMobile.value = window.innerWidth < 768;
    };


    load();

    return { ...returnData, user, pageList, load, save, clear, initUser, initPages, isMobile, resize, themeOverrides, getLocalData, fullLoading };
});