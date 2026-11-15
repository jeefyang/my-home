import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validatePageIcon } from "../server/utils/pageIcon";

const icons = JSON.parse(readFileSync(new URL("../src/assets/page-icons.json", import.meta.url), "utf8")) as Record<
    string,
    { from: string; svg: string }
>;

describe("page-icons.json", () => {
    it("至少 120 个图标且覆盖 6 个图标包", () => {
        const entries = Object.entries(icons);
        expect(entries.length).toBeGreaterThanOrEqual(120);
        const packages = new Set(entries.map(([id]) => id.split("/")[0]));
        expect([...packages].sort()).toEqual(["carbon", "fluent", "ionicons4", "ionicons5", "material", "tabler"]);
    });

    it("每个图标都能通过服务端校验", () => {
        for (const [id, icon] of Object.entries(icons)) {
            const [value, error] = validatePageIcon(icon.svg);
            expect(error, id).toBeUndefined();
            expect(value, id).toBe(icon.svg.trim());
        }
    });

    it("每个语义在单个图标包内不重复", () => {
        const seen = new Set<string>();
        for (const [id, icon] of Object.entries(icons)) {
            const key = icon.from;
            expect(seen.has(key), `${id} 与 ${key} 重复`).toBe(false);
            seen.add(key);
        }
    });
});
