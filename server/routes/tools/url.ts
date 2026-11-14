import { load } from "cheerio";
import axios from "axios";
import { assertPublicUrl } from "../../utils/safeUrl";

const MAX_REDIRECTS = 3;
const MAX_CONTENT_LENGTH = 2 * 1024 * 1024;

/** 手动跟随重定向，每一跳都重新做一次公网校验，避免被 302 引到内网 */
export async function getUrlTitle(url: string): Promise<[string | undefined, any]> {
    try {
        let current = url;
        let res: any;
        let lastError: string | undefined;
        for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
            const [checked, urlErr] = await assertPublicUrl(current);
            if (urlErr || !checked) {
                return [undefined, urlErr || "网址不可访问"];
            }
            res = await axios.get(checked.toString(), {
                timeout: 15000,
                maxRedirects: 0,
                maxContentLength: MAX_CONTENT_LENGTH,
                responseType: "text",
                validateStatus: (status: number) => status >= 200 && status < 400,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                },
            });
            const location = res.headers?.location;
            if (res.status >= 300 && res.status < 400 && location) {
                current = new URL(String(location), checked).toString();
                continue;
            }
            break;
        }
        if (!res || res.status < 200 || res.status >= 300) {
            return [undefined, lastError || `目标站点返回了异常状态(${res?.status ?? "未知"})`];
        }
        const $ = load(res.data);
        const bodyText = $('body').text().trim();
        // 检测 Cloudflare 等反爬挑战页
        if (bodyText.includes('Just a moment') || bodyText.includes('Checking your browser') || $('title').text().includes('Just a moment')) {
            return [undefined, '触发了站点反爬保护，无法获取标题'];
        }
        const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
        return [title, undefined];
    }
    catch (e: unknown) {
        const err = e as any;
        if (err?.response?.status === 403) {
            return [undefined, '服务器拒绝访问'];
        }
        if (err?.response?.status === 404) {
            return [undefined, '页面不存在(404)'];
        }
        if (err?.code === 'ENOTFOUND' || err?.code === 'ECONNREFUSED') {
            return [undefined, '无法连接到目标网站(DNS解析失败)'];
        }
        if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
            return [undefined, '连接超时(可能被墙或网络缓慢)'];
        }
        if (err?.code === 'ERR_NETWORK' || err?.message?.includes('Network')) {
            return [undefined, '网络连接失败(可能被墙)'];
        }
        if (err?.message?.includes('maxContentLength')) {
            return [undefined, '目标页面过大,已放弃解析'];
        }
        return [undefined, `请求失败(${err?.message || '未知错误'})`];
    }
}
