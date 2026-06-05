/**
 * 浏览器书签 HTML 导入导出工具
 * 支持 Chrome / Firefox / Edge 等标准 Netscape 书签格式
 */

import type { BookmarkCollectionType } from "..";
import { nanoid } from "nanoid";

// ========================================================================
// 导入解析器 — 嵌套感知的 <DL> 解析
// ========================================================================

/**
 * 解析浏览器导出的书签 HTML 为 BookmarkCollectionType[]
 */
export function parseHtmlBookmarks(html: string): BookmarkCollectionType[] {
    let clean = html
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\r?\n/g, " ")
        .replace(/>\s+</g, "><")
        .trim();

    const outerDl = extractDLContent(clean);
    if (!outerDl) return [];
    return parseDL(outerDl);
}

/** 提取 <DL>...</DL> 的内部内容，正确处理嵌套 */
function extractDLContent(html: string, startFrom?: number): string | null {
    const start = html.indexOf("<DL", startFrom || 0);
    if (start === -1) return null;
    const tagEnd = html.indexOf(">", start);
    if (tagEnd === -1) return null;
    const startIdx = tagEnd + 1;

    let depth = 1;
    let pos = startIdx;
    while (pos < html.length) {
        // 找最近的 <DL 或 </DL
        const nextOpen = html.indexOf("<DL", pos);
        const nextClose = html.indexOf("</DL", pos);

        if (nextClose === -1) break; // 没有闭合标签

        if (nextOpen !== -1 && nextOpen < nextClose) {
            depth++;
            pos = nextOpen + 3; // 跳过 <DL
        } else {
            depth--;
            if (depth === 0) {
                return html.slice(startIdx, nextClose);
            }
            pos = nextClose + 4; // 跳过 </DL
        }
    }
    return null;
}

/** 解析 <DL> 内部内容为 BookmarkCollectionType[] */
function parseDL(dlContent: string): BookmarkCollectionType[] {
    const items: BookmarkCollectionType[] = [];
    let pos = 0;

    while (pos < dlContent.length) {
        // 找下一个 <DT
        const dtStart = dlContent.indexOf("<DT", pos);
        if (dtStart === -1) break;

        // 找这个 DT 内容的结尾（下一个顶层 DT 或内容末尾）
        const dtEnd = findNextTopLevelDT(dlContent, dtStart + 1);
        const dtContent = dlContent.slice(dtStart, dtEnd).trim();
        if (!dtContent) { pos = dtEnd; continue; }

        // 文件夹：<H3 ...>title</H3>
        const folderMatch = dtContent.match(/<H3\s*([^>]*)>\s*([\s\S]*?)\s*<\/H3>/i);
        if (folderMatch) {
            const attrs = parseAttributes(folderMatch[1]);
            const title = decodeEntities(folderMatch[2].trim());

            // 提取此 DT 内部嵌套的 <DL> 内容
            const subDl = extractDLContent(dtContent);
            const children = subDl ? parseDL(subDl) : [];

            items.push({
                uuid: nanoid(10),
                title,
                url: "",
                creatTime: attrs["ADD_DATE"] ? Number(attrs["ADD_DATE"]) * 1000 : Date.now(),
                modifyTime: attrs["LAST_MODIFIED"] ? Number(attrs["LAST_MODIFIED"]) * 1000 : Date.now(),
                isFolder: true,
                icon: "",
                children
            });
            pos = dtEnd;
            continue;
        }

        // 书签：<A ...>title</A>
        const linkMatch = dtContent.match(/<A\s+([^>]*)>\s*([\s\S]*?)\s*<\/A>/i);
        if (linkMatch) {
            const attrs = parseAttributes(linkMatch[1]);
            const title = decodeEntities(linkMatch[2].trim());

            items.push({
                uuid: nanoid(10),
                title,
                url: attrs["HREF"] || "",
                creatTime: attrs["ADD_DATE"] ? Number(attrs["ADD_DATE"]) * 1000 : Date.now(),
                modifyTime: attrs["LAST_MODIFIED"] ? Number(attrs["LAST_MODIFIED"]) * 1000 : Date.now(),
                isFolder: false,
                icon: attrs["ICON"] || "",
                children: []
            });
        }
        pos = dtEnd;
    }
    return items;
}

/**
 * 从 startIdx 开始找下一个顶层 <DT>（跳过嵌套在 <DL>...</DL> 内部的 DT）
 * 返回该 DT 的起始位置，未找到则返回 content.length
 */
function findNextTopLevelDT(content: string, startIdx: number): number {
    let depth = 0;
    let i = startIdx;
    const len = content.length;

    while (i < len) {
        // 检查是否以 <DT 开头（顶层）
        if (depth === 0 && content[i] === '<' && i + 2 < len &&
            content[i + 1] === 'D' && content[i + 2] === 'T' &&
            (i + 3 >= len || !/[a-zA-Z]/.test(content[i + 3]) || content[i + 3] === '>')) {
            return i;
        }
        // 检查 <DL（进入嵌套）
        if (content[i] === '<' && i + 2 < len &&
            content[i + 1] === 'D' && content[i + 2] === 'L' &&
            (i + 3 >= len || !/[a-zA-Z]/.test(content[i + 3]) || content[i + 3] === '>')) {
            depth++;
            i += 3;
            continue;
        }
        // 检查 </DL（退出嵌套）
        if (content[i] === '<' && content[i + 1] === '/' && i + 3 < len &&
            content[i + 2] === 'D' && content[i + 3] === 'L' &&
            (i + 4 >= len || !/[a-zA-Z]/.test(content[i + 4]) || content[i + 4] === '>')) {
            depth--;
            i += 4;
            continue;
        }
        i++;
    }
    return len;
}

/** 从属性字符串解析键值对 */
function parseAttributes(attrStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const regex = /(\w+)\s*=\s*"([\s\S]*?)"/gi;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(attrStr)) !== null) {
        attrs[match[1].toUpperCase()] = match[2];
    }
    return attrs;
}

/** HTML 实体解码 */
function decodeEntities(text: string): string {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
}

// ========================================================================
// 导出生成器
// ========================================================================

export function generateHtmlBookmarks(items: BookmarkCollectionType[], title: string = "Bookmarks"): string {
    const lines: string[] = [];
    lines.push('<!DOCTYPE NETSCAPE-Bookmark-file-1>');
    lines.push('<!-- This is an automatically generated file. -->');
    lines.push('<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">');
    lines.push(`<TITLE>${escapeHtml(title)}</TITLE>`);
    lines.push(`<H1>${escapeHtml(title)}</H1>`);
    lines.push('<DL><p>');
    for (const item of items) serializeBookmark(item, lines, 1);
    lines.push('</DL><p>');
    return lines.join('\n');
}

function serializeBookmark(item: BookmarkCollectionType, lines: string[], depth: number) {
    const indent = '    '.repeat(depth);
    const addDate = Math.floor(item.creatTime / 1000);
    const modDate = Math.floor(item.modifyTime / 1000);

    if (item.isFolder) {
        lines.push(`${indent}<DT><H3 ADD_DATE="${addDate}" LAST_MODIFIED="${modDate}">${escapeHtml(item.title)}</H3>`);
        lines.push(`${indent}<DL><p>`);
        if (item.children) {
            for (const child of item.children) serializeBookmark(child, lines, depth + 1);
        }
        lines.push(`${indent}</DL><p>`);
    } else {
        const iconStr = item.icon ? ` ICON="${escapeHtml(item.icon)}"` : "";
        lines.push(`${indent}<DT><A HREF="${escapeHtml(item.url)}" ADD_DATE="${addDate}"${iconStr}>${escapeHtml(item.title)}</A>`);
    }
}

function escapeHtml(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ========================================================================
// 工具函数
// ========================================================================

export function getFaviconUrl(url: string): string {
    try { const p = new URL(url); return `https://favicon.im/${p.hostname}`; }
    catch { return ""; }
}

/** 通过后端 favicon 服务获取图标并存储到元件目录 */
export async function fetchFaviconToServer(
    url: string,
    toolsImgFetch: { request: (key: string, data: any) => Promise<any> },
    itemType: string,
    itemUUID: string
): Promise<string> {
    // favicon.im 最可靠放第一,direct 很多站点返回空占位符放最后
    const platforms = ["favicon", "google", "duckduckgo", "direct"];
    for (const platform of platforms) {
        try {
            const res = await toolsImgFetch.request("favicon", { url, platform, toUrl: "url", itemType, itemUUID });
            if (res.code === 200 && res.data) return res.data as string;
        } catch { /* try next */ }
    }
    return "";
}

/**
 * 导入解析后，递归处理书签树中的图标：
 * - data:base64 → 上传到用户目录文件，替换为文件名
 * - http(s) URL → 下载并上传到用户目录，替换为文件名
 * - 已是文件名（无前缀）→ 跳过
 */
export async function resolveImportIcons(
    items: BookmarkCollectionType[],
    uploadIcon: (iconStr: string) => Promise<string>
): Promise<void> {
    for (const item of items) {
        if (item.icon && !item.icon.startsWith("http") && !item.icon.startsWith("favcon_")) {
            // 是 base64 或其他格式 → 上传
            const filename = await uploadIcon(item.icon);
            if (filename) item.icon = filename;
        }
        if (item.children && item.children.length > 0) {
            await resolveImportIcons(item.children, uploadIcon);
        }
    }
}

/**
 * 从服务器读取图标文件并转为 base64（用于导出）
 */
export async function iconFileToBase64(filename: string, baseUrl: string): Promise<string> {
    if (!filename) return "";
    if (filename.startsWith("data:") || filename.startsWith("http")) return filename;
    try {
        const res = await fetch(`${baseUrl}/${filename}`);
        if (!res.ok) return "";
        const blob = await res.blob();
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
        });
    } catch { return ""; }
}

// ========================================================================
// 树操作
// ========================================================================

export function getFolderContent(curPath: string[], root: BookmarkCollectionType[]): BookmarkCollectionType[] {
    let current = root;
    for (const uuid of curPath) {
        const found = current.find(item => item.uuid === uuid && item.isFolder);
        if (!found || !found.children) return [];
        current = found.children;
    }
    return current;
}

export function getBreadcrumb(curPath: string[], root: BookmarkCollectionType[]): { uuid: string; title: string }[] {
    const crumbs: { uuid: string; title: string }[] = [{ uuid: "__root__", title: "根目录" }];
    let current = root;
    for (const uuid of curPath) {
        const found = current.find(item => item.uuid === uuid && item.isFolder);
        if (!found) break;
        crumbs.push({ uuid: found.uuid, title: found.title });
        current = found.children || [];
    }
    return crumbs;
}

export function addItemAtPath(root: BookmarkCollectionType[], curPath: string[], newItem: BookmarkCollectionType): BookmarkCollectionType[] {
    if (curPath.length === 0) return [...root, newItem];
    return root.map(item => {
        if (item.uuid === curPath[0] && item.isFolder) {
            return { ...item, children: addItemAtPath(item.children || [], curPath.slice(1), newItem), modifyTime: Date.now() };
        }
        if (item.children && item.children.length > 0) {
            return { ...item, children: addItemAtPath(item.children, curPath, newItem) };
        }
        return item;
    });
}

export function removeItemFromTree(items: BookmarkCollectionType[], uuid: string): BookmarkCollectionType[] {
    return items.filter(item => item.uuid !== uuid).map(item => {
        if (item.children && item.children.length > 0) return { ...item, children: removeItemFromTree(item.children, uuid) };
        return item;
    });
}

export function updateItemInTree(items: BookmarkCollectionType[], uuid: string, updates: Partial<BookmarkCollectionType>): BookmarkCollectionType[] {
    return items.map(item => {
        if (item.uuid === uuid) return { ...item, ...updates, modifyTime: Date.now() };
        if (item.children && item.children.length > 0) return { ...item, children: updateItemInTree(item.children, uuid, updates) };
        return item;
    });
}

export function searchInTree(items: BookmarkCollectionType[], keyword: string, depth: number): { item: BookmarkCollectionType; depth: number }[] {
    const result: { item: BookmarkCollectionType; depth: number }[] = [];
    const kw = keyword.toLowerCase();
    for (const item of items) {
        const match = item.title.toLowerCase().includes(kw) || item.url.toLowerCase().includes(kw);
        if (item.children && item.children.length > 0) {
            const childResults = searchInTree(item.children, keyword, depth + 1);
            if (match || childResults.length > 0) {
                if (match) result.push({ item, depth });
                result.push(...childResults);
            }
        } else if (match) {
            result.push({ item, depth });
        }
    }
    return result;
}
