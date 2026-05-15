import { apiUrlsTrans } from "./tools/apiUrlsTrans";

export const ToolsUrlApiUrl = apiUrlsTrans("tools-url/", {
    titleUrl: {
        method: "POST", from: {} as { url: string; },
        to: {} as string
    }
});