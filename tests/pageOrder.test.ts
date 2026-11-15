import { describe, expect, it } from "vitest";
import { isValidPageOrder } from "../server/utils/pageOrder";

describe("isValidPageOrder", () => {
    it("允许纯顺序调整", () => {
        expect(isValidPageOrder(["a", "b", "c"], ["c", "a", "b"])).toBe(true);
    });

    it("拒绝增删成员", () => {
        expect(isValidPageOrder(["a", "b"], ["a"])).toBe(false);
        expect(isValidPageOrder(["a", "b"], ["a", "b", "c"])).toBe(false);
        expect(isValidPageOrder(["a", "b"], ["a", "c"])).toBe(false);
    });

    it("拒绝重复与非数组", () => {
        expect(isValidPageOrder(["a", "b"], ["a", "a"])).toBe(false);
        expect(isValidPageOrder(["a", "b"], null)).toBe(false);
        expect(isValidPageOrder(["a", "b"], "a,b")).toBe(false);
    });

    it("空列表视为一致", () => {
        expect(isValidPageOrder([], [])).toBe(true);
    });
});
