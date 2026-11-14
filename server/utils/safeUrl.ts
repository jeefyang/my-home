import dns from "dns/promises";
import net from "net";

/** 判断地址是否属于内网/回环/链路本地等不应被外部请求的网段 */
export function isPrivateAddress(ip: string): boolean {
    if (net.isIPv4(ip)) {
        const parts = ip.split(".").map(Number);
        const a = parts[0] ?? 0;
        const b = parts[1] ?? 0;
        if (a === 0 || a === 10 || a === 127) return true;
        if (a === 169 && b === 254) return true;
        if (a === 172 && b >= 16 && b <= 31) return true;
        if (a === 192 && b === 168) return true;
        if (a === 100 && b >= 64 && b <= 127) return true; // 运营商级 NAT
        if (a >= 224) return true; // 组播/保留
        return false;
    }
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fe80:")) return true; // 链路本地
    if (v.startsWith("fc") || v.startsWith("fd")) return true; // 唯一本地地址
    if (v.startsWith("::ffff:")) return isPrivateAddress(v.slice(7));
    return false;
}

/**
 * 校验出站 URL：只允许 http/https，解析出的所有地址都必须是公网地址。
 * 返回 [URL, 错误信息]。
 */
export async function assertPublicUrl(raw: string): Promise<[URL | undefined, string | undefined]> {
    let u: URL;
    try {
        u = new URL(String(raw));
    } catch {
        return [undefined, "网址格式不正确"];
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
        return [undefined, "只支持 http/https 网址"];
    }
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (!host) {
        return [undefined, "网址格式不正确"];
    }
    if (net.isIP(host)) {
        return isPrivateAddress(host) ? [undefined, "不允许访问内网地址"] : [u, undefined];
    }
    let addrs: { address: string }[];
    try {
        addrs = await dns.lookup(host, { all: true });
    } catch {
        return [undefined, "域名解析失败"];
    }
    if (!addrs.length) {
        return [undefined, "域名解析失败"];
    }
    if (addrs.some(a => isPrivateAddress(a.address))) {
        return [undefined, "不允许访问内网地址"];
    }
    return [u, undefined];
}
