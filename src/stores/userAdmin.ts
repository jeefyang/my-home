import { defineStore } from "pinia";
import { ref } from "vue";
import { userFetch } from "@/utils/jFetch";
import { sortAdminUsers } from "@/utils/userAdmin";

export type UserAdminActionResult<T = undefined> = {
    ok: boolean;
    msg?: string;
    code?: number;
    data?: T;
};

export const useUserAdminStore = defineStore("userAdmin", () => {
    const list = ref<AdminUserItem[]>([]);
    const loading = ref(false);
    const error = ref("");
    const errorCode = ref(0);

    function fail(code: number, msg: string): UserAdminActionResult<never> {
        return { ok: false, code, msg };
    }

    function upsert(user: AdminUserItem) {
        const index = list.value.findIndex(item => item.uuid === user.uuid);
        if (index === -1) {
            list.value.push(user);
        }
        else {
            list.value[index] = user;
        }
        list.value = sortAdminUsers(list.value);
    }

    async function load(): Promise<UserAdminActionResult> {
        loading.value = true;
        error.value = "";
        errorCode.value = 0;
        try {
            const res = await userFetch.request("userList");
            if (res.code !== 200 || !res.data) {
                const code = res.code || 500;
                const msg = res.msg || "加载用户列表失败";
                error.value = msg;
                errorCode.value = code;
                return fail(code, msg);
            }
            list.value = sortAdminUsers(res.data);
            return { ok: true, data: undefined };
        }
        catch (e: any) {
            const msg = e?.message || "加载用户列表失败";
            error.value = msg;
            errorCode.value = 500;
            return fail(500, msg);
        }
        finally {
            loading.value = false;
        }
    }

    async function create(payload: {
        type: UserTypeType;
        name?: string;
        pathID?: string;
        secondCode?: string;
    }): Promise<UserAdminActionResult<{ user: AdminUserItem; secondCode?: string }>> {
        try {
            const res = await userFetch.request("createUser", payload);
            if (res.code !== 200 || !res.data) {
                return fail(res.code || 500, res.msg || "创建用户失败");
            }
            upsert(res.data.user);
            return { ok: true, data: res.data };
        }
        catch (e: any) {
            return fail(500, e?.message || "创建用户失败");
        }
    }

    async function update(
        uuid: string,
        patch: { name?: string; type?: UserTypeType }
    ): Promise<UserAdminActionResult<AdminUserItem>> {
        try {
            const res = await userFetch.request("adminUpdateUser", { uuid, ...patch });
            if (res.code !== 200 || !res.data) {
                return fail(res.code || 500, res.msg || "更新用户失败");
            }
            upsert(res.data);
            return { ok: true, data: res.data };
        }
        catch (e: any) {
            return fail(500, e?.message || "更新用户失败");
        }
    }

    async function resetSecondCode(
        uuid: string,
        secondCode?: string
    ): Promise<UserAdminActionResult<{ user: AdminUserItem; secondCode?: string; cleared: boolean }>> {
        try {
            const res = await userFetch.request("adminResetUserSecondCode", { uuid, secondCode });
            if (res.code !== 200 || !res.data) {
                return fail(res.code || 500, res.msg || "重置二次码失败");
            }
            upsert(res.data.user);
            return { ok: true, data: res.data };
        }
        catch (e: any) {
            return fail(500, e?.message || "重置二次码失败");
        }
    }

    async function remove(uuid: string): Promise<UserAdminActionResult<{ deleted: true; warnings?: string[] }>> {
        try {
            const res = await userFetch.request("deleteUser", { uuid });
            if (res.code !== 200 || !res.data) {
                return fail(res.code || 500, res.msg || "删除用户失败");
            }
            list.value = list.value.filter(item => item.uuid !== uuid);
            return { ok: true, data: res.data };
        }
        catch (e: any) {
            return fail(500, e?.message || "删除用户失败");
        }
    }

    return { list, loading, error, errorCode, load, create, update, resetSecondCode, remove };
});
