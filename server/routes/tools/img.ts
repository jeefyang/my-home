import { ToolsImgFaviconFromType } from "@common/apis/toolsImg";
import path from "path";
import fs from "fs";
import { DATA_DIR, filesFolder, itemsFolder } from "../../stores/data";
import { nanoid } from "nanoid";
import { assertPublicUrl } from "../../utils/safeUrl";
import { UrlsUtils } from "../../utils/urls";

const FETCH_TIMEOUT = 10000;
const MAX_ICON_BYTES = 2 * 1024 * 1024;

const IMG_EXT_LIST: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
    "application/octet-stream": "ico"
};

async function fetchFaviconToFile(url: string, saveDir: string): Promise<[string | undefined, any]> {
    const [checked, urlErr] = await assertPublicUrl(url);
    if (!checked) {
        return [undefined, urlErr || "网址不可访问"];
    }
    const res = await fetch(checked, { signal: AbortSignal.timeout(FETCH_TIMEOUT), redirect: "follow" });
    if (!res.ok) {
        return [undefined, "请求失败"];
    }
    const mimeType = res.headers.get('content-type');
    if (!mimeType) {
        return [undefined, "获取mimeType失败"];
    }
    if (!IMG_EXT_LIST[mimeType]) {
        return [undefined, "不支持的图片格式"];
    }
    const b = await res.arrayBuffer();
    if (b.byteLength < 100) {
        return [undefined, "图标文件过小,跳过"];
    }
    if (b.byteLength > MAX_ICON_BYTES) {
        return [undefined, "图标文件过大,已放弃"];
    }
    const buffer = Buffer.from(b);
    const filename = `favcon_${nanoid(10)}.${IMG_EXT_LIST[mimeType]}`;
    fs.writeFileSync(path.join(saveDir, filename), buffer);
    return [filename, undefined];
}

export async function favicon(data: ToolsImgFaviconFromType): Promise<[string | undefined, any]> {
    let origin: string = "";
    try {
        const urlObj = new URL(data.url);
        origin = urlObj.hostname;
    }
    catch (e) {
        origin = data.url;
    }
    if (!origin) {
        return [undefined, '请输入正确的网址'];
    }
    const platfromList: { [x in NonNullable<ToolsImgFaviconFromType['platform']>]?: string } = {
        'direct': "https://$$key$$/favicon.ico",
        'favicon': "https://a.favicon.im/$$key$$",
        'google': "https://www.google.com/s2/favicons?domain=$$key$$",
        'duckduckgo': "https://icons.duckduckgo.com/ip3/$$key$$.ico"
    };
    const platfrom = data.platform ? platfromList[data.platform] : data.coustomPlatform;
    if (!platfrom) {
        return [undefined, '请选择正确的平台'];
    }
    const platformUrl = platfrom.replace("$$key$$", origin);
    if (!platformUrl || platformUrl === platfrom) {
        return [undefined, '平台缺乏关键字插入规则'];
    }

    try {

        if (data.toUrl == "base64") {
            const [checked, urlErr] = await assertPublicUrl(platformUrl);
            if (!checked) {
                return [undefined, urlErr || "网址不可访问"];
            }
            const res = await fetch(checked, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
            if (!res.ok) {
                return [undefined, "请求失败"];
            }
            const b = await res.blob();
            if (b.size > MAX_ICON_BYTES) {
                return [undefined, "图标文件过大,已放弃"];
            }
            const arrayBuffer = await b.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const mimeType = res.headers.get('content-type');
            return [`data:${mimeType};base64,${base64}`, undefined];
        }
        else if (data.toUrl == "url") {
            if (!data.itemType || !data.itemUUID) {
                return [undefined, "缺少元件信息"];
            }
            if (!UrlsUtils.checkSinglePath(data.itemType, data.itemUUID)) {
                return [undefined, "元件信息不合法"];
            }
            const itemsRoot = path.resolve(DATA_DIR, itemsFolder);
            const d = path.resolve(DATA_DIR, itemsFolder, `${data.itemType}-${data.itemUUID}`, filesFolder);
            // 目录必须落在 items 目录内，避免 ../ 逃逸
            if (d !== itemsRoot && !d.startsWith(itemsRoot + path.sep)) {
                return [undefined, "元件目录不合法"];
            }
            if (!fs.existsSync(d)) {
                return [undefined, "元件目录不存在"];
            }
            // 直接模式:从目标站点获取（最快,不依赖第三方）
            if (data.platform === "direct") {
                return await fetchFaviconToFile(platformUrl, d);
            }
            // 其他模式使用平台 URL
            const [checked, urlErr] = await assertPublicUrl(platformUrl);
            if (!checked) {
                return [undefined, urlErr || "网址不可访问"];
            }
            const res = await fetch(checked, {
                signal: AbortSignal.timeout(FETCH_TIMEOUT), headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
                    'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
                }
            });
            if (!res.ok) {
                return [undefined, "请求失败"];
            }
            const mimeType = res.headers.get('content-type');
            if (!mimeType) {
                return [undefined, "获取mimeType失败"];
            }
            if (!IMG_EXT_LIST[mimeType]) {
                return [undefined, "不支持的图片格式"];
            }
            const b = await res.arrayBuffer();
            if (b.byteLength > MAX_ICON_BYTES) {
                return [undefined, "图标文件过大,已放弃"];
            }
            const buffer = Buffer.from(b);
            const filename = `favcon_${nanoid(10)}.${IMG_EXT_LIST[mimeType]}`;
            fs.writeFileSync(path.join(d, filename), buffer);
            return [filename, undefined];
        }
        return [undefined, "请选择正确的转换方式"];
    }
    catch (e) {
        console.error("favicon_url", platformUrl);
        console.error(e);
        return [undefined, e];
    }


}
