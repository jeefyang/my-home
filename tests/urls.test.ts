import { describe, expect, it } from "vitest";
import { UrlsUtils } from "../server/utils/urls";

describe("UrlsUtils.checkSinglePath", () => {
    it("放行普通单段路径", () => {
        expect(UrlsUtils.checkSinglePath("data.json")).toBe(true);
        expect(UrlsUtils.checkSinglePath("a", "b", "c")).toBe(true);
    });

    it.each([
        "",
        ".",
        "..",
        "../x",
        "a/b",
        "a\\b",
        "x..y"
    ])("拒绝 %j", p => {
        expect(UrlsUtils.checkSinglePath(p)).toBe(false);
    });

    it("任一段非法即整体非法", () => {
        expect(UrlsUtils.checkSinglePath("ok", "../bad")).toBe(false);
    });

    it("拒绝 undefined/空值", () => {
        expect(UrlsUtils.checkSinglePath(undefined as unknown as string)).toBe(false);
    });
});
