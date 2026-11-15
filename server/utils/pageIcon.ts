/** 页面图标白名单：只允许内置生成器产出的 SVG 结构与 1–4 个文本码点（emoji / 单字） */
const MAX_ICON_LENGTH = 4096;
const MAX_TEXT_CODE_POINTS = 4;

const SVG_TAGS = new Set([
    "svg", "g", "path", "circle", "rect", "line", "polyline", "polygon", "ellipse"
]);

const SVG_ATTRS = new Set([
    "xmlns", "xmlns:xlink", "viewbox", "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin",
    "stroke-miterlimit", "stroke-dasharray", "stroke-dashoffset", "stroke-opacity",
    "d", "points", "cx", "cy", "r", "x", "y", "width", "height", "rx", "ry",
    "transform", "opacity", "fill-rule", "clip-rule", "aria-hidden", "focusable"
]);

const TAG_RE = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+[^<>]*?)?)(\/?)>/g;
const ATTR_RE = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g;

function validateAttributes(attrs: string): string | undefined {
    ATTR_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ATTR_RE.exec(attrs))) {
        const name = match[1].toLowerCase();
        if (!SVG_ATTRS.has(name)) {
            return `不允许的属性 ${match[1]}`;
        }
    }
    ATTR_RE.lastIndex = 0;
    if (attrs.replace(ATTR_RE, "").trim()) {
        return "SVG 属性格式不合法";
    }
    return undefined;
}

/**
 * 校验页面图标，返回 [规范化后的值, 错误原因]。
 * - 文本：1–4 个 Unicode 码点，不允许 < > & 与控制字符；
 * - SVG：单根 <svg>，标签与属性双白名单，禁止文本节点与事件属性。
 */
export function validatePageIcon(icon: unknown): [string | undefined, string | undefined] {
    if (typeof icon !== "string") {
        return [undefined, "图标必须是字符串"];
    }
    const raw = icon.trim();
    if (!raw) {
        return [undefined, "图标不能为空"];
    }
    if (raw.length > MAX_ICON_LENGTH) {
        return [undefined, `图标不能超过 ${MAX_ICON_LENGTH} 个字符`];
    }
    if (!raw.startsWith("<")) {
        if (Array.from(raw).length > MAX_TEXT_CODE_POINTS) {
            return [undefined, `emoji 或单字最多 ${MAX_TEXT_CODE_POINTS} 个码点`];
        }
        if (/[<>&\u0000-\u001f\u007f]/.test(raw)) {
            return [undefined, "图标包含非法字符"];
        }
        return [raw, undefined];
    }

    if (!raw.startsWith("<svg") || !/<\/svg>$/.test(raw)) {
        return [undefined, "SVG 必须只有一个 <svg> 根节点"];
    }

    TAG_RE.lastIndex = 0;
    let depth = 0;
    let rootCount = 0;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TAG_RE.exec(raw))) {
        const [full, closing, name, attrs, selfClosing] = match;
        if (raw.slice(lastIndex, match.index).trim()) {
            return [undefined, "SVG 不允许文本节点或注释"];
        }
        lastIndex = match.index + full.length;
        const tag = name.toLowerCase();
        if (!SVG_TAGS.has(tag)) {
            return [undefined, `不允许的标签 <${name}>`];
        }
        if (closing) {
            if (attrs.trim()) {
                return [undefined, "结束标签不能带属性"];
            }
            depth -= 1;
            if (depth < 0) {
                return [undefined, "SVG 标签不配对"];
            }
            continue;
        }
        const attrErr = validateAttributes(attrs);
        if (attrErr) {
            return [undefined, attrErr];
        }
        if (tag === "svg") {
            rootCount += 1;
            if (depth !== 0 || rootCount > 1) {
                return [undefined, "SVG 只能有一个根节点"];
            }
        }
        if (!selfClosing) {
            depth += 1;
        }
    }
    if (raw.slice(lastIndex).trim()) {
        return [undefined, "SVG 含未闭合内容"];
    }
    if (depth !== 0) {
        return [undefined, "SVG 标签不配对"];
    }
    if (rootCount !== 1) {
        return [undefined, "缺少 <svg> 根节点"];
    }
    return [raw, undefined];
}
