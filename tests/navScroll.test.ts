import { describe, expect, it } from "vitest";
import { centeredScrollLeft, isFullyVisible } from "../src/composables/useNavScroll";

describe("isFullyVisible", () => {
    it("整项在可视区内时为 true", () => {
        expect(isFullyVisible(100, 160, 0, 200)).toBe(true);
    });

    it("左侧被裁切时为 false", () => {
        expect(isFullyVisible(-20, 40, 0, 200)).toBe(false);
    });

    it("右侧被裁切时为 false", () => {
        expect(isFullyVisible(180, 240, 0, 200)).toBe(false);
    });

    it("刚好贴住两侧边界时仍算可见", () => {
        expect(isFullyVisible(0, 200, 0, 200)).toBe(true);
    });
});

describe("centeredScrollLeft", () => {
    it("把目标项放在可视区中间", () => {
        expect(centeredScrollLeft(200, 80, 400)).toBe(40);
    });

    it("可视区比目标项窄时也按中心对齐", () => {
        expect(centeredScrollLeft(0, 100, 60)).toBe(20);
    });
});
