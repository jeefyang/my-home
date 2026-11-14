import { describe, expect, it } from "vitest";
import { assertPublicUrl, isPrivateAddress } from "../server/utils/safeUrl";

describe("isPrivateAddress", () => {
    it.each([
        "0.0.0.0",
        "10.1.2.3",
        "127.0.0.1",
        "169.254.1.1",
        "172.16.0.1",
        "172.31.255.255",
        "192.168.0.1",
        "100.64.0.1",
        "100.127.255.255",
        "224.0.0.1",
        "255.255.255.255",
        "::1",
        "::",
        "fe80::1",
        "fc00::1",
        "fd12:3456::1",
        "::ffff:10.0.0.1"
    ])("把 %s 判为内网", ip => {
        expect(isPrivateAddress(ip)).toBe(true);
    });

    it.each([
        "8.8.8.8",
        "1.1.1.1",
        "172.15.0.1",
        "172.32.0.1",
        "100.63.255.255",
        "100.128.0.0",
        "192.169.0.1",
        "2001:4860:4860::8888",
        "::ffff:8.8.8.8"
    ])("不把 %s 判为内网", ip => {
        expect(isPrivateAddress(ip)).toBe(false);
    });
});

describe("assertPublicUrl", () => {
    it("拒绝非法 URL", async () => {
        const [url, err] = await assertPublicUrl("not a url");
        expect(url).toBeUndefined();
        expect(err).toBe("网址格式不正确");
    });

    it("只允许 http/https", async () => {
        const [url, err] = await assertPublicUrl("ftp://example.com/a");
        expect(url).toBeUndefined();
        expect(err).toBe("只支持 http/https 网址");
    });

    it.each(["http://127.0.0.1/a", "http://10.0.0.1/", "http://[::1]/", "http://0.0.0.0/", "https://192.168.1.1/"])(
        "拒绝内网字面量 %s",
        async raw => {
            const [url, err] = await assertPublicUrl(raw);
            expect(url).toBeUndefined();
            expect(err).toBe("不允许访问内网地址");
        }
    );

    it("放行公网字面量", async () => {
        const [url, err] = await assertPublicUrl("https://8.8.8.8/x");
        expect(err).toBeUndefined();
        expect(url?.hostname).toBe("8.8.8.8");
    });
});
