/** 页面图标：内置 SVG 字符串或 1–4 个 Unicode 码点的文本（emoji / 单字） */
export const PAGE_ICON_MAX_TEXT_CODE_POINTS = 4;

/** 判断图标是否为内联 SVG（与后端 validatePageIcon 的判别方式一致） */
export function isSvgIcon(icon?: string | null): icon is string {
    return typeof icon === "string" && icon.trimStart().startsWith("<");
}

/** 文本图标（emoji / 单字）是否可用；SVG 交给服务端做结构白名单校验 */
export function isValidTextIcon(icon: string): boolean {
    if (!icon) {
        return false;
    }
    if (Array.from(icon).length > PAGE_ICON_MAX_TEXT_CODE_POINTS) {
        return false;
    }
    return !/[<>&\u0000-\u001f\u007f]/.test(icon);
}
