import { ToolsImgFaviconFromType } from "@common/apis/toolsImg";
import path from "path";
import fs from "fs";
import { DATA_DIR, filesFolder, UsersFolder } from "../../stores/data";
import { nanoid } from "nanoid";

export async function favicon(data: ToolsImgFaviconFromType, userPathID: string): Promise<[string | undefined, any]> {
    let origin: string = "";
    try {
        const urlObj = new URL(data.url);
        origin = urlObj.origin;
    }
    catch (e) {
        origin = data.url;
    }
    if (!origin) {
        return [undefined, '请输入正确的网址'];
    }
    const platfromList: { [x in NonNullable<ToolsImgFaviconFromType['platform']>]?: string } = {
        'google': "https://www.google.com/s2/favicons?domain=$$key$$",
        "favicon": "https://favicon.im/$$key$$",
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
            const res = await fetch(platformUrl);
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
            const d = path.join(DATA_DIR, UsersFolder, userPathID,filesFolder);
            if (!fs.existsSync(d)) {
                return [undefined, "用户不存在"];
            }
            const res = await fetch(platformUrl);
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
                "image/x-icon":"ico"
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