import { apiUrlsTrans } from "./tools/apiUrlsTrans";

export const ToolsImgApiUrl = apiUrlsTrans("tools-img/", {
    favicon: {
        method: "POST", from: {} as {
            url: string
            platform?: "google" | 'favicon' | "duckduckgo",
            coustomPlatform?: string
            params?: Record<string, string>,
            /** 转换成b64还是链接(图片存在user) */
            toUrl: "base64" | "url"
        }
    }
})