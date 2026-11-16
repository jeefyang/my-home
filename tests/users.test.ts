import { mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "my-home-users-"));
process.env.DATA_DIR = dir;
const users = await import("../server/stores/users");
const data = await import("../server/stores/data");
const pages = await import("../server/stores/pages");

const usersDir = join(dir, "users");

beforeEach(() => {
    rmSync(usersDir, { recursive: true, force: true });
    mkdirSync(usersDir, { recursive: true });
    users.cacheUserList.length = 0;
    data.dataOptions.isEmptyUser = true;
});

afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
});

describe("user store admin CRUD", () => {
    it("createUser 生成默认用户并落盘", () => {
        const [user, err] = users.createUser("user");
        expect(err).toBeUndefined();
        expect(user!.name).toBe("用户");
        expect(user!.type).toBe("user");
        expect(user!.pathID).toHaveLength(10);
        expect(user!.uuid).toHaveLength(10);
        expect(user!.pageUUIDList).toEqual([]);
        expect(existsSync(join(usersDir, user!.pathID, "user.jsonc"))).toBe(true);
    });

    it("createUser 接受自定义名称、pathID 与二次码", () => {
        const [user, err] = users.createUser("admin", {
            name: "  管理员甲  ",
            pathID: "admin_1234",
            secondCode: " secret ",
        });
        expect(err).toBeUndefined();
        expect(user!.name).toBe("管理员甲");
        expect(user!.pathID).toBe("admin_1234");
        expect(user!.secondCode).toBe(" secret ");
    });

    it("createUser 拒绝重复 pathID 与非法 pathID", () => {
        const [first] = users.createUser("user", { pathID: "abcdefgh" });
        expect(first).toBeTruthy();
        const [dup, dupErr] = users.createUser("user", { pathID: "abcdefgh" });
        expect(dup).toBeUndefined();
        expect(dupErr.code).toBe(409);
        const [bad, badErr] = users.createUser("user", { pathID: "short" });
        expect(bad).toBeUndefined();
        expect(badErr.code).toBe(400);
    });

    it("createUser 校验名称边界", () => {
        const [empty] = users.createUser("user", { name: "   " });
        expect(empty!.name).toBe("用户");
        const [ok] = users.createUser("user", { name: "名".repeat(50) });
        expect(ok).toBeTruthy();
        const [tooLong, err] = users.createUser("user", { name: "名".repeat(51) });
        expect(tooLong).toBeUndefined();
        expect(err.code).toBe(400);
    });

    it("getUserList 返回 pathID、不含 secondCode 且管理员优先", () => {
        const [adminA] = users.createUser("admin", { name: "管理员A", secondCode: "a" });
        const [userA] = users.createUser("user", { name: "用户A", secondCode: "b" });
        const [adminB] = users.createUser("admin", { name: "管理员B" });
        const [list, err] = users.getUserList();
        expect(err).toBeUndefined();
        expect(list!.map(v => v.uuid).slice(0, 2).sort()).toEqual([adminA!.uuid, adminB!.uuid].sort());
        expect(list!.every(v => "pathID" in v)).toBe(true);
        expect(list!.every(v => !("secondCode" in v))).toBe(true);
        expect(list!.find(v => v.uuid === userA!.uuid)!.pathID).toBe(userA!.pathID);
    });

    it("getUserByUUID 与 countAdmins 以磁盘为准", () => {
        const [admin] = users.createUser("admin");
        users.createUser("user");
        expect(users.countAdmins()).toBe(1);
        const [found, err] = users.getUserByUUID(admin!.uuid);
        expect(err).toBeUndefined();
        expect(found!.pathID).toBe(admin!.pathID);
        expect(users.getUserByUUID("missing")[1].code).toBe(404);
    });

    it("adminUpdateUser 改名称/类型并保留身份字段", () => {
        const [actor] = users.createUser("admin");
        const [target] = users.createUser("user", { secondCode: "keep" });
        const [updated, err] = users.adminUpdateUser(actor!.uuid, target!.uuid, {
            name: "新名字",
            type: "admin",
        });
        expect(err).toBeUndefined();
        expect(updated!.name).toBe("新名字");
        expect(updated!.type).toBe("admin");
        expect(updated!.pathID).toBe(target!.pathID);
        expect(updated!.secondCode).toBe("keep");
        expect(updated!.createTime).toBe(target!.createTime);
    });

    it("adminUpdateUser 允许管理员改自己名称但不改类型", () => {
        const [actor] = users.createUser("admin");
        const [renamed, renameErr] = users.adminUpdateUser(actor!.uuid, actor!.uuid, { name: "新管理员名" });
        expect(renameErr).toBeUndefined();
        expect(renamed!.name).toBe("新管理员名");
        expect(renamed!.type).toBe("admin");
        expect(renamed!.pathID).toBe(actor!.pathID);

        const [self, selfErr] = users.adminUpdateUser(actor!.uuid, actor!.uuid, { type: "user" });
        expect(self).toBeUndefined();
        expect(selfErr.code).toBe(409);
        const [, emptyErr] = users.adminUpdateUser(actor!.uuid, actor!.uuid, {});
        expect(emptyErr.code).toBe(400);
    });

    it("adminResetUserSecondCode 随机、手填、清除与自重置保护", () => {
        const [actor] = users.createUser("admin");
        const [target] = users.createUser("user");
        const [random, randomErr] = users.adminResetUserSecondCode(actor!.uuid, target!.uuid);
        expect(randomErr).toBeUndefined();
        expect(random!.secondCode).toHaveLength(12);
        expect(random!.cleared).toBe(false);
        expect(users.verifyUser(target!.pathID, random!.secondCode!)[0]).toBeTruthy();

        const [manual] = users.adminResetUserSecondCode(actor!.uuid, target!.uuid, "manual-code");
        expect(manual!.secondCode).toBe("manual-code");
        expect(users.verifyUser(target!.pathID, "manual-code")[0]).toBeTruthy();
        expect(users.verifyUser(target!.pathID, random!.secondCode!)[0]).toBeUndefined();

        const [cleared] = users.adminResetUserSecondCode(actor!.uuid, target!.uuid, "");
        expect(cleared!.cleared).toBe(true);
        expect(cleared!.secondCode).toBeUndefined();
        expect(users.verifyUser(target!.pathID, "anything")[0]).toBeTruthy();

        const [self, selfErr] = users.adminResetUserSecondCode(actor!.uuid, actor!.uuid, "x");
        expect(self).toBeUndefined();
        expect(selfErr.code).toBe(409);
    });

    it("removeUserDirectory 删除账号目录且不再要求至少一个用户", () => {
        const [only] = users.createUser("admin");
        const [removed, err] = users.removeUserDirectory(only!.pathID);
        expect(err).toBeUndefined();
        expect(removed).toBe(only!.pathID);
        expect(existsSync(join(usersDir, only!.pathID))).toBe(false);
        expect(users.removeUserDirectory("missing")[1].code).toBe(404);
    });

    it("deleteUser 先删账号再级联页面与元件", () => {
        const [actor] = users.createUser("admin");
        const [target] = users.createUser("user");
        const [page] = pages.addPage({ title: "目标用户页面" });
        const [group] = pages.addPageItemGroup(page!.uuid, { title: "组" }, 0);
        const [item] = pages.addPageItem(page!.uuid, group!.uuid, { type: "memo" });
        users.updateUser(target!.pathID, { pageUUIDList: [page!.uuid] });
        const itemDir = join(dir, "items", `${item!.type}-${item!.uuid}`);

        const [result, err] = users.deleteUser(actor!.uuid, target!.uuid);
        expect(err).toBeUndefined();
        expect(result!.deleted).toBe(true);
        expect(result!.warnings).toEqual([]);
        expect(existsSync(join(usersDir, target!.pathID))).toBe(false);
        expect(existsSync(join(dir, "pages", page!.uuid))).toBe(false);
        expect(existsSync(itemDir)).toBe(false);
        expect(users.getUserByUUID(target!.uuid)[1].code).toBe(404);
    });

    it("deleteUser 缺页时返回 warning 且账号仍删除", () => {
        const [actor] = users.createUser("admin");
        const [target] = users.createUser("user");
        users.updateUser(target!.pathID, { pageUUIDList: ["missing-page"] });
        const [result, err] = users.deleteUser(actor!.uuid, target!.uuid);
        expect(err).toBeUndefined();
        expect(result!.deleted).toBe(true);
        expect(result!.warnings).toHaveLength(1);
        expect(result!.warnings![0]).toContain("missing-page");
    });

    it("deleteUser 拒绝自删、非管理员与不存在目标", () => {
        const [admin] = users.createUser("admin");
        const [user] = users.createUser("user");
        expect(users.deleteUser(admin!.uuid, admin!.uuid)[1].code).toBe(409);
        expect(users.deleteUser(user!.uuid, admin!.uuid)[1].code).toBe(403);
        expect(users.deleteUser(admin!.uuid, "missing")[1].code).toBe(404);
    });
});
