import { mkdtempSync, rmSync } from "node:fs";
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
});
