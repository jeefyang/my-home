import { apiUrlsTrans } from "./tools/apiUrlsTrans";

export type ToolsImgFaviconFromType = {
    url: string;
    platform?: "direct" | "google" | 'favicon' | "duckduckgo",
    /** 自定义平台,$$key$$为替代关键字 */
    coustomPlatform?: string;
    params?: Record<string, string>,
    /** 转换成b64还是链接(图片存在user) */
    toUrl: "base64" | "url";
    /** 所属元件的类型,存储到元件自己的 files 文件夹 */
    itemType?: string;
    /** 所属元件的 UUID,存储到元件自己的 files 文件夹 */
    itemUUID?: string;
};

export const ToolsImgApiUrl = apiUrlsTrans("tools-img/", {
    favicon: {
        method: "POST", from: {} as ToolsImgFaviconFromType,
        to: {} as string
    }
});