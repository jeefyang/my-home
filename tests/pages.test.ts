import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const dir = mkdtempSync(join(tmpdir(), "my-home-pages-"));
process.env.DATA_DIR = dir;
const store = await import("../server/stores/pages");

afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
});

describe("page store CRUD", () => {
    it("addPage 补默认值并落盘", () => {
        const [page, err] = store.addPage({ title: "测试页" });
        expect(err).toBeUndefined();
        expect(page!.uuid).toHaveLength(10);
        expect(page!.style).toEqual({});
        expect(page!.isDefault).toBe(false);
        expect(page!.itemGroupList).toEqual([]);
        const [read] = store.getPage(page!.uuid);
        expect(read?.title).toBe("测试页");
    });

    it("updatePage 保留 uuid/createTime 并刷新 modifyTime", async () => {
        const [page] = store.addPage({ title: "旧标题" });
        await new Promise(resolve => setTimeout(resolve, 5));
        const [updated, err] = store.updatePage(page!.uuid, { title: "新标题", uuid: "hacked" } as any);
        expect(err).toBeUndefined();
        expect(updated!.uuid).toBe(page!.uuid);
        expect(updated!.createTime).toBe(page!.createTime);
        expect(updated!.modifyTime).toBeGreaterThanOrEqual(page!.modifyTime);
        expect(updated!.title).toBe("新标题");
    });

    it("deletePage 删目录后再读不到", () => {
        const [page] = store.addPage({ title: "待删" });
        const [uuid, err] = store.deletePage(page!.uuid);
        expect(err).toBeUndefined();
        expect(uuid).toBe(page!.uuid);
        const [read, readErr] = store.getPage(page!.uuid);
        expect(read).toBeUndefined();
        expect(readErr).toBeTruthy();
        expect(store.deletePage(page!.uuid)[1]).toBeTruthy();
    });

    it("deletePage 级联删除页面内元件目录并返回 warnings", () => {
        const [page] = store.addPage({ title: "级联" });
        const [group] = store.addPageItemGroup(page!.uuid, { title: "组" }, 0);
        const [item] = store.addPageItem(page!.uuid, group!.uuid, { type: "memo" });
        const itemDir = join(dir, "items", `${item!.type}-${item!.uuid}`);
        expect(existsSync(itemDir)).toBe(true);
        const [uuid, err, warnings] = store.deletePage(page!.uuid);
        expect(err).toBeUndefined();
        expect(uuid).toBe(page!.uuid);
        expect(warnings).toEqual([]);
        expect(existsSync(itemDir)).toBe(false);
        expect(existsSync(join(dir, "pages", page!.uuid))).toBe(false);
    });

    it("deletePagesForUser 缺页时返回 warning 且不抛异常", () => {
        const [page] = store.addPage({ title: "待删" });
        const warnings = store.deletePagesForUser([page!.uuid, "missing-page"]);
        expect(warnings).toHaveLength(1);
        expect(warnings[0]).toContain("missing-page");
        expect(warnings[0]).toContain("页面");
        expect(store.getPage(page!.uuid)[0]).toBeUndefined();
    });
});
