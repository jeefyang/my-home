import { load } from "cheerio";
import axios from "axios";

export async function getUrlTitle(url: string): Promise<[string | undefined, any]> {
    try {
        const res = await axios.get(url, {
            timeout: 30000, // 设置超时
        });
        const $ = load(res.data);
        const title = $('title').text();
        return [title, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}