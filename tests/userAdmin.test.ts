import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { userFetch } from "@/utils/jFetch";
import { useUserAdminStore } from "@/stores/userAdmin";
import {
    buildLoginLink,
    credentialText,
    formatUserDate,
    sortAdminUsers,
    userInitial,
    validateUserPathID,
    validateUserName
} from "@/utils/userAdmin";

function makeUser(patch: Partial<AdminUserItem> = {}): AdminUserItem {
    return {
        uuid: "u1",
        name: "小明",
        pathID: "path_0001",
        type: "user",
        pageUUIDList: [],
        createTime: 1000,
        modifyTime: 1000,
        ...patch
    };
}

describe("userAdmin 纯函数", () => {
    it("名称创建可空、编辑必填，并按码点限制 1–50", () => {
        expect(validateUserName("", false)).toBe("");
        expect(validateUserName("  ", false)).toBe("");
        expect(validateUserName("  ", true)).toBe("请输入名称");
        expect(validateUserName("名".repeat(50), true)).toBe("");
        expect(validateUserName("名".repeat(51), true)).toContain("1–50");
        expect(validateUserName("😀".repeat(50), false)).toBe("");
    });

    it("pathID 留空合法，非空必须 8–20 位且仅限安全字符", () => {
        expect(validateUserPathID("")).toBe("");
        expect(validateUserPathID("  ")).toBe("");
        expect(validateUserPathID("abcdefg")).toContain("8–20");
        expect(validateUserPathID("abcdefgh")).toBe("");
        expect(validateUserPathID("a".repeat(20))).toBe("");
        expect(validateUserPathID("a".repeat(21))).toContain("8–20");
        expect(validateUserPathID("bad path")).toContain("路径 ID");
    });

    it("管理员优先，其次创建时间、uuid，且不修改入参", () => {
        const input = [
            makeUser({ uuid: "u3", type: "user", createTime: 1 }),
            makeUser({ uuid: "u2", type: "admin", createTime: 20 }),
            makeUser({ uuid: "u1", type: "admin", createTime: 10 })
        ];
        const sorted = sortAdminUsers(input);
        expect(sorted.map(user => user.uuid)).toEqual(["u1", "u2", "u3"]);
        expect(input.map(user => user.uuid)).toEqual(["u3", "u2", "u1"]);
    });

    it("日期、首字与凭据文本", () => {
        expect(formatUserDate(0)).not.toBe("-");
        expect(formatUserDate(Number.NaN)).toBe("-");
        expect(userInitial("小明")).toBe("小");
        expect(userInitial("")).toBe("用");
        expect(credentialText({ pathID: "abcdefgh", secondCode: "code123" }))
            .toBe("pathID: abcdefgh\n二次码: code123");
        expect(credentialText({ pathID: "abcdefgh" }))
            .toBe("pathID: abcdefgh\n二次码: 未设置");
    });

    it("登录链接保留部署路径，查询只带 pathID 与二次码", () => {
        const link = buildLoginLink(
            "https://nav.example.com/home/?old=1#section",
            "abcdefgh",
            "p@ss &码"
        );
        const parsed = new URL(link);
        expect(parsed.origin).toBe("https://nav.example.com");
        expect(parsed.pathname).toBe("/home/");
        expect(parsed.hash).toBe("");
        expect(parsed.searchParams.get("old")).toBeNull();
        expect(parsed.searchParams.get("pathid")).toBe("abcdefgh");
        expect(parsed.searchParams.get("secondcode")).toBe("p@ss &码");
    });

    it("未设置二次码时登录链接只带 pathID", () => {
        const link = buildLoginLink("https://nav.example.com/", "abcdefgh");
        const parsed = new URL(link);
        expect(parsed.searchParams.get("pathid")).toBe("abcdefgh");
        expect(parsed.searchParams.has("secondcode")).toBe(false);
    });
});

describe("userAdmin store", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.restoreAllMocks();
    });

    it("load 成功替换并排序", async () => {
        vi.spyOn(userFetch, "request").mockResolvedValue({
            code: 200,
            data: [makeUser({ uuid: "u2", type: "user" }), makeUser({ uuid: "u1", type: "admin" })]
        } as any);
        const store = useUserAdminStore();
        const result = await store.load();
        expect(result.ok).toBe(true);
        expect(store.list.map(user => user.uuid)).toEqual(["u1", "u2"]);
        expect(store.errorCode).toBe(0);
    });

    it("load 403 保留旧列表并标记无权限", async () => {
        const store = useUserAdminStore();
        store.list = [makeUser()];
        vi.spyOn(userFetch, "request").mockResolvedValue({ code: 403, msg: "需要管理员权限" } as any);
        const result = await store.load();
        expect(result).toMatchObject({ ok: false, code: 403 });
        expect(store.list).toHaveLength(1);
        expect(store.errorCode).toBe(403);
        expect(store.error).toBe("需要管理员权限");
    });

    it("create 插入返回用户但不把二次码写入列表", async () => {
        const store = useUserAdminStore();
        const created = makeUser({ uuid: "u9", name: "新管理员", type: "admin", createTime: 5 });
        vi.spyOn(userFetch, "request").mockResolvedValue({
            code: 200,
            data: { user: created, secondCode: "shown-once" }
        } as any);
        const result = await store.create({ type: "admin", name: "新管理员" });
        expect(result.ok).toBe(true);
        expect(result.data?.secondCode).toBe("shown-once");
        expect(store.list[0].uuid).toBe("u9");
        expect("secondCode" in store.list[0]).toBe(false);
    });

    it("update 替换并重排，reset 只更新用户，remove 过滤", async () => {
        const store = useUserAdminStore();
        store.list = [makeUser({ uuid: "u1", type: "user" }), makeUser({ uuid: "u2", type: "user", createTime: 2 })];
        const request = vi.spyOn(userFetch, "request");

        request.mockResolvedValueOnce({
            code: 200,
            data: makeUser({ uuid: "u2", type: "admin", createTime: 2 })
        } as any);
        expect((await store.update("u2", { type: "admin" })).ok).toBe(true);
        expect(store.list.map(user => user.uuid)).toEqual(["u2", "u1"]);

        request.mockResolvedValueOnce({
            code: 200,
            data: { user: makeUser({ uuid: "u1", name: "改名" }), cleared: false, secondCode: "new-code" }
        } as any);
        const reset = await store.resetSecondCode("u1");
        expect(reset.data?.secondCode).toBe("new-code");
        expect(store.list.find(user => user.uuid === "u1")?.name).toBe("改名");

        request.mockResolvedValueOnce({ code: 200, data: { deleted: true, warnings: ["页面清理失败"] } } as any);
        const removed = await store.remove("u1");
        expect(removed.data?.warnings).toEqual(["页面清理失败"]);
        expect(store.list.map(user => user.uuid)).toEqual(["u2"]);
    });

    it("操作失败保留列表并返回服务端消息", async () => {
        const store = useUserAdminStore();
        store.list = [makeUser()];
        vi.spyOn(userFetch, "request").mockResolvedValue({ code: 409, msg: "至少保留一个管理员" } as any);
        const result = await store.remove("u1");
        expect(result).toMatchObject({ ok: false, code: 409, msg: "至少保留一个管理员" });
        expect(store.list).toHaveLength(1);
    });
});
