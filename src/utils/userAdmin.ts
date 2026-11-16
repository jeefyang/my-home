export const USER_PATH_ID_RE = /^[a-zA-Z0-9_-]{8,20}$/;

/** 名称校验：创建可空，编辑必填；按 Unicode 码点计数 */
export function validateUserName(name: string, required: boolean): string {
    const trimmed = name.trim();
    if (!trimmed) {
        return required ? "请输入名称" : "";
    }
    const length = Array.from(trimmed).length;
    if (length < 1 || length > 50) {
        return "名称需为 1–50 个字符";
    }
    return "";
}

/** pathID 只用于创建；空表示交给服务端自动生成 */
export function validateUserPathID(pathID: string): string {
    const trimmed = pathID.trim();
    if (!trimmed) {
        return "";
    }
    return USER_PATH_ID_RE.test(trimmed)
        ? ""
        : "路径 ID 只能包含字母、数字、下划线、中划线，且 8–20 位";
}

/** 管理员优先；同角色按创建时间、uuid 稳定排序 */
export function sortAdminUsers(list: AdminUserItem[]): AdminUserItem[] {
    return [...list].sort((a, b) => {
        if (a.type === "admin" && b.type !== "admin") {
            return -1;
        }
        if (a.type !== "admin" && b.type === "admin") {
            return 1;
        }
        return a.createTime - b.createTime || a.uuid.localeCompare(b.uuid);
    });
}

export function formatUserDate(timestamp: number): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return "-";
    }
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function userInitial(name: string): string {
    return Array.from(name || "")[0] || "用";
}

/** 一次性凭据文本；只由组件局部凭据对象生成，不读 store */
export function credentialText(credential: { pathID: string; secondCode?: string }): string {
    return `pathID: ${credential.pathID}\n二次码: ${credential.secondCode || "未设置"}`;
}

/** 生成可直接登录的链接；保留部署路径，去掉旧查询与 hash */
export function buildLoginLink(baseURL: string, pathID: string, secondCode?: string): string {
    const url = new URL(baseURL);
    url.hash = "";
    url.search = "";
    url.searchParams.set("pathid", pathID);
    if (secondCode) {
        url.searchParams.set("secondcode", secondCode);
    }
    return url.toString();
}
