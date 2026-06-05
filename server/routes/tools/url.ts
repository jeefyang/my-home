import { load } from "cheerio";
import axios from "axios";

export async function getUrlTitle(url: string): Promise<[string | undefined, any]> {
    try {
        const res = await axios.get(url, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            },
            maxRedirects: 5,
        });
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
        return [undefined, `请求失败(${err?.message || '未知错误'})`];
    }
}