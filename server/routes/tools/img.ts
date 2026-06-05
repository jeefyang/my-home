import { ToolsImgFaviconFromType } from "@common/apis/toolsImg";
import path from "path";
import fs from "fs";
import { DATA_DIR, filesFolder, itemsFolder } from "../../stores/data";
import { nanoid } from "nanoid";

const FETCH_TIMEOUT = 3000;

async function fetchFaviconToFile(url: string, saveDir: string): Promise<[string | undefined, any]> {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
    if (!res.ok) {
        return [undefined, "请求失败"];
    }
    const mimeType = res.headers.get('content-type');
    if (!mimeType) {
        return [undefined, "获取mimeType失败"];
    }
    const imgList: Record<string, string> = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/gif": "gif",
        "image/webp": "webp",
        "image/svg+xml": "svg",
        "image/x-icon":"ico",
        "image/vnd.microsoft.icon":"ico",
        "application/octet-stream":"ico"
    };
    if (!imgList[mimeType]) {
        return [undefined, "不支持的图片格式"];
    }
    const b = await res.arrayBuffer();
    if (b.byteLength < 100) {
        return [undefined, "图标文件过小,跳过"];
    }
    const buffer = Buffer.from(b);
    const filename = `favcon_${nanoid(10)}.${imgList[mimeType]}`;
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
        'favicon': "https://favicon.im/$$key$$",
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
            const res = await fetch(platformUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
            if (!res.ok) {
                return [undefined, "请求失败"];
            }
            const b = await res.blob();
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
            const d = path.join(DATA_DIR, itemsFolder, `${data.itemType}-${data.itemUUID}`, filesFolder);
            if (!fs.existsSync(d)) {
                return [undefined, "元件目录不存在"];
            }
            // 直接模式:从目标站点获取（最快,不依赖第三方）
            if (data.platform === "direct") {
                return await fetchFaviconToFile(platformUrl, d);
            }
            // 其他模式使用平台 URL
            const res = await fetch(platformUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT) });
            if (!res.ok) {
                return [undefined, "请求失败"];
            }
            const mimeType = res.headers.get('content-type');
            if (!mimeType) {
                return [undefined, "获取mimeType失败"];
            }
            const imgList: Record<string, string> = {
                "image/png": "png",
                "image/jpeg": "jpg",
                "image/gif": "gif",
                "image/webp": "webp",
                "image/svg+xml": "svg",
                "image/x-icon":"ico",
                "image/vnd.microsoft.icon":"ico"
            };
            if (!imgList[mimeType]) {
                return [undefined, "不支持的图片格式"];
            }
            const b = await res.arrayBuffer();
            const buffer = Buffer.from(b);
            const filename = `favcon_${nanoid(10)}.${imgList[mimeType]}`;
            fs.writeFileSync(path.join(d, filename), buffer);
            return [filename, undefined];
        }
        return [undefined, "请选择正确的转换方式"];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }


}