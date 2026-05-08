import { pageFetch, userFetch } from "@/utils/jFetch";
import { defineStore } from "pinia";
import { ref } from "vue";


export const useDataStore = defineStore("data", () => {
    const pathid = ref("");
    const password = ref("");
    const user = ref(<UserType>null);
    const pageList = ref(<PageType[]>[]);
    const switchPageUUID = ref("");
    const isMobile = ref(window.innerWidth<768);

    const saveKey = "data";

    const returnData = {
        pathid, password, switchPageUUID
    };

    const save = () => {
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
        save();
        if (user.value.pageUUIDList.length != 0) {
            const pageRes = await pageFetch.request("getPageList", { uuidList: user.value.pageUUIDList });
            if (pageRes.code != 200) {
                return pageRes;
            }
            pageList.value = pageRes.data!;
            return userRes;
        }
        let pageRes = await pageFetch.request("initPages");
        if (pageRes.code != 200) {
            return pageRes;
        }
        user.value.pageUUIDList = pageRes.data!.map(item => item.uuid);
        pageList.value = pageRes.data!;
        return pageRes;
    };

    const resize=()=>{
        isMobile.value = window.innerWidth<768;

    }


    load();

    return { ...returnData, user,pageList, load, save, clear, initUser,isMobile,resize };
});