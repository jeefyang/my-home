import { ref } from "vue";
import { useDataStore } from "@/stores/data";
import { userFetch } from "@/utils/jFetch";

type CredentialLoginOptions = {
    pathID: string;
    secondCode: string;
    /** 0 不改动，1 写入地址栏，-1 从地址栏移除 */
    fixedUrl?: number;
    /** 先向服务端确认凭据，失败时留在当前页并给出错误文案 */
    verifyFirst?: boolean;
};

export function useCredentialLogin() {
    const dataStore = useDataStore();
    const loading = ref(false);
    const error = ref("");

    const go = (fixedUrl: number) => {
        const origin = window.location.origin;
        if (!fixedUrl) {
            window.location.reload();
            return;
        }
        const params = new URLSearchParams(window.location.search);
        if (fixedUrl === 1) {
            params.set("pathid", dataStore.pathid || "");
            params.set("secondcode", dataStore.secondcode || "");
        } else if (fixedUrl === -1) {
            params.delete("pathid");
            params.delete("secondcode");
        }
        const query = params.toString();
        window.location.href = query ? `${origin}?${query}` : origin;
    };

    const login = async ({ pathID, secondCode, fixedUrl = 0, verifyFirst = false }: CredentialLoginOptions) => {
        error.value = "";
        dataStore.pathid = pathID;
        dataStore.secondcode = secondCode;

        if (verifyFirst) {
            loading.value = true;
            const res = await userFetch.request("verifyUser");
            loading.value = false;
            if (res.code !== 200) {
                error.value = res.msg || "凭据不正确，请检查唯一路径和二次验证码";
                return false;
            }
        }

        dataStore.save();
        go(fixedUrl);
        return true;
    };

    return { loading, error, login };
}
