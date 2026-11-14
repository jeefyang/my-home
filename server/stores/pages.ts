import { nanoid } from "nanoid";
import { DATA_DIR, dataFolder, filesFolder, itemsFolder, PagesFolder } from "./data";
import fs from "fs";
import path from "path";
import { getItemPath, initItem, initItems } from "./items";
import { UrlsUtils } from "../utils/urls";

export const pageFileName = "page.jsonc";

/** 页面读缓存：以文件 mtime 为版本，写盘/删除时失效 */
const pageCache = new Map<string, { mtimeMs: number; page: PageType }>();

function readPage(uuid: string) {
    const file = path.join(DATA_DIR, PagesFolder, uuid, pageFileName);
    const mtimeMs = fs.statSync(file).mtimeMs;
    const cached = pageCache.get(uuid);
    if (cached && cached.mtimeMs === mtimeMs) {
        return cached.page;
    }
    const page = JSON.parse(fs.readFileSync(file, 'utf-8')) as PageType;
    pageCache.set(uuid, { mtimeMs, page });
    return page;
}

function writePage(page: PageType) {
    const dir = path.join(DATA_DIR, PagesFolder, page.uuid);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, pageFileName);
    const tmp = file + ".tmp";
    // 先写临时文件再 rename，避免进程中断留下半截 JSON
    fs.writeFileSync(tmp, JSON.stringify(page, null, '\t'));
    fs.renameSync(tmp, file);
    pageCache.delete(page.uuid);
}

export function initPages(): [PageType[] | undefined, any] {
    try {
        const initPagesStr = fs.readFileSync(path.join('./initPages.js'), 'utf-8');
        const initPages: Partial<PageType>[] = eval(initPagesStr);

        const list = initPages.map(page => {
            page.uuid = nanoid(10);

            page.itemGroupList = initItems(page.itemGroupList || []);
            page.createTime = Date.now();
            page.modifyTime = Date.now();
            const p = path.join(DATA_DIR, PagesFolder, page.uuid);
            fs.mkdirSync(p, { recursive: true });
            fs.mkdirSync(path.join(p, dataFolder), { recursive: true });
            writePage(page as PageType);
            fs.mkdirSync(path.join(p, filesFolder), { recursive: true });
            return page as PageType;
        });
        return [list, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function getPage(uuid: string): [PageType | undefined, any] {
    if (!uuid) {
        return [undefined, "页面不存在"];
    }
    if (!fs.existsSync(path.join(DATA_DIR, PagesFolder, uuid))) {
        return [undefined, "页面不存在"];
    }
    try {
        const page = readPage(uuid);
        // 兼容旧数据：缺少分组列表时补空数组，避免后续 .findIndex 报错
        if (!Array.isArray(page.itemGroupList)) {
            page.itemGroupList = [];
        }
        page.itemGroupList.forEach(group => {
            if (!Array.isArray(group.list)) {
                group.list = [];
            }
        });
        return [page, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function deletePage(uuid: string): [string | undefined, any] {
    if (!uuid) {
        return [undefined, "页面不存在"];
    }
    if (!fs.existsSync(path.join(DATA_DIR, PagesFolder, uuid))) {
        return [undefined, "页面不存在"];
    }
    try {
        fs.rmSync(path.join(DATA_DIR, PagesFolder, uuid), { recursive: true });
        pageCache.delete(uuid);
        return [uuid, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function addPage(obj: Partial<PageType>): [PageType | undefined, any] {
    try {
        const newObj = {
            ...obj,
            uuid: nanoid(10),
            createTime: Date.now(),
            modifyTime: Date.now(),
            // 强制为空,不增加系统复杂性
            itemGroupList: []
        } as PageType;
        fs.mkdirSync(path.join(DATA_DIR, PagesFolder, newObj.uuid), { recursive: true });
        writePage(newObj);
        return [newObj, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }

}

export function updatePage(uuid: string, obj: Partial<PageType>): [PageType | undefined, any] {
    const pageData = getPage(uuid);
    if (pageData[1]) {
        return [undefined, pageData[1]];
    }
    try {
        let page = pageData[0]!;
        page = { ...page, ...obj, uuid: page.uuid, createTime: page.createTime, modifyTime: Date.now() };
        writePage(page);
        return [page, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

function getPageItemIndex(page: PageType, itemUUID: string) {
    let groupIndex = -1;
    let itemIndex = -1;
    if (!page.itemGroupList || !itemUUID) {
        return { groupIndex, itemIndex };
    }
    page.itemGroupList.findIndex((group, cindex) => {
        if (!group.list) {
            return false;
        }
        return group.list.findIndex((c, ccindex) => {
            if (c.uuid != itemUUID) {
                return false;
            }
            groupIndex = cindex;
            itemIndex = ccindex;
            return true;
        }) != -1;
    });
    return { groupIndex, itemIndex };

}



export function addPageItemGroup(pageUUID: string, obj: Partial<ItemGroupType>, insertIndex: number = -1): [ItemGroupType | undefined, any] {
    const pageData = getPage(pageUUID);
    if (pageData[1]) {
        return [undefined, pageData[1]];
    }
    try {
        let page = pageData[0]!;
        // 不允许在这里添加item
        const newObj = { ...obj, uuid: nanoid(10), list: [] } as ItemGroupType;
        if (insertIndex == -1) {
            page.itemGroupList.push(newObj);
        }
        else {
            page.itemGroupList.splice(insertIndex, 0, newObj);
        }
        writePage(page);
        return [newObj, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function updatePageItemGroup(pageUUID: string, obj: Partial<ItemGroupType>): [ItemGroupType | undefined, any] {
    const pageData = getPage(pageUUID);
    if (pageData[1]) {
        return [undefined, pageData[1]];
    }
    try {
        let page = pageData[0]!;
        const itemGroupIndex = page.itemGroupList.findIndex(itemGroup => itemGroup.uuid == obj.uuid);
        if (itemGroupIndex == -1) {
            return [undefined, "项目组不存在"];
        }
        const itemGroup = page.itemGroupList[itemGroupIndex];
        // 不允许修改item
        const newObj = { ...obj, uuid: itemGroup.uuid, list: itemGroup.list } as ItemGroupType;
        page.itemGroupList[itemGroupIndex] = newObj;
        writePage(page);
        return [newObj, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}


export function deletePageItemGroup(pageUUID: string, itemGroupUUID: string): [string | undefined, any] {

    const pageData = getPage(pageUUID);
    if (pageData[1]) {
        return [undefined, pageData[1]];
    }
    try {
        let page = pageData[0]!;
        const index = page.itemGroupList.findIndex(itemGroup => itemGroup.uuid == itemGroupUUID);
        if (index == -1) {
            return [undefined, "项目组不存在"];
        }
        const itemGroup = page.itemGroupList.splice(index, 1)[0];
        (itemGroup.list || []).forEach(item => {
            const p = getItemPath(item.type, item.uuid!);
            if (fs.existsSync(p)) {
                fs.rmSync(p, { recursive: true });
            }
        });
        writePage(page);
        return [itemGroupUUID, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function updatePageItem(pageUUID: string, obj: Partial<ItemType>): [ItemType | undefined, any] {
    const pageData = getPage(pageUUID);
    if (pageData[1]) {
        return [undefined, pageData[1]];
    }
    try {
        let page = pageData[0]!;
        const index = getPageItemIndex(page, obj.uuid!);
        if (index.groupIndex == -1 || index.itemIndex == -1) {
            return [undefined, "项目不存在"];
        }
        const oldItem = page.itemGroupList[index.groupIndex].list[index.itemIndex];
        // type 决定数据目录，禁止通过更新体改掉
        const item = { ...oldItem, ...obj, type: oldItem.type, modifyTime: Date.now(), createTime: oldItem.createTime };
        page.itemGroupList[index.groupIndex].list[index.itemIndex] = item;
        writePage(page);
        return [item, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function addPageItem(pageUUID: string, itemGroupUUID: string, obj: Partial<ItemType>, insertIndex: number = -1): [ItemType | undefined, any] {
    const pageData = getPage(pageUUID);
    if (pageData[1]) {
        return [undefined, pageData[1]];
    }
    try {
        let page = pageData[0]!;
        const data = initItem(obj);
        if (data[1]) {
            return data;
        }
        const item = data[0]!;
        const itemGroupIndex = page.itemGroupList.findIndex(item => item.uuid === itemGroupUUID);
        if (itemGroupIndex == -1) {
            return [undefined, "项目组不存在"];
        }
        const itemGroup = page.itemGroupList[itemGroupIndex];
        if (insertIndex == -1) {
            itemGroup.list.push(item);
        }
        else {
            itemGroup.list.splice(insertIndex, 0, item);
        }
        writePage(page);
        return [item, undefined];

    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function deletePageItem(pageUUID: string, itemUUID: string): [ItemGroupType[] | undefined, any] {
    const pageData = getPage(pageUUID);
    if (pageData[1]) {
        return [undefined, pageData[1]];
    }
    try {
        let page = pageData[0]!;
        const index = getPageItemIndex(page, itemUUID);
        if (index.groupIndex == -1 || index.itemIndex == -1) {
            return [undefined, "项目不存在"];
        }
        const item = page.itemGroupList[index.groupIndex].list[index.itemIndex];
        page.itemGroupList[index.groupIndex].list.splice(index.itemIndex, 1);
        const p = getItemPath(item.type, item.uuid!);
        if (fs.existsSync(p)) {
            fs.rmSync(p, { recursive: true });
        }
        writePage(page);
        return [page.itemGroupList, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function getPageData(pageUUID: string, filename: string): [string | undefined, any] {
    try {
        if (!UrlsUtils.checkSinglePath(pageUUID, filename)) {
            return [undefined, "页面不存在"];
        }
        const p = path.join(DATA_DIR, PagesFolder, pageUUID);
        if (!fs.existsSync(p)) {
            return [undefined, "页面不存在"];
        }
        if (!fs.existsSync(path.join(p, dataFolder, filename))) {
            return [undefined, undefined];
        }
        return [fs.readFileSync(path.join(p, dataFolder, filename), "utf-8"), undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function updatePageData(pageUUID: string, filename: string, content: string): [boolean | undefined, any] {
    try {
        if (!UrlsUtils.checkSinglePath(pageUUID, filename)) {
            return [undefined, "页面不存在"];
        }
        const p = path.join(DATA_DIR, PagesFolder, pageUUID);
        if (!fs.existsSync(p)) {
            return [undefined, "页面不存在"];
        }
        fs.writeFileSync(path.join(p, dataFolder, filename), content);
        return [true, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function deletePageData(pageUUID: string, filename: string): [boolean | undefined, any] {
    try {
        if (!UrlsUtils.checkSinglePath(pageUUID, filename)) {
            return [undefined, "页面不存在"];
        }
        const p = path.join(DATA_DIR, PagesFolder, pageUUID);
        if (!fs.existsSync(p)) {
            return [undefined, "页面不存在"];
        }
        if (fs.existsSync(path.join(p, dataFolder, filename))) {
            fs.rmSync(path.join(p, dataFolder, filename));
        }
        return [true, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function clearPageData(pageUUID: string): [boolean | undefined, any] {
    try {
        if (!UrlsUtils.checkSinglePath(pageUUID)) {
            return [undefined, "页面不存在"];
        }
        const p = path.join(DATA_DIR, PagesFolder, pageUUID);
        if (!fs.existsSync(p)) {
            return [undefined, "页面不存在"];
        }
        fs.rmSync(path.join(p, dataFolder), { recursive: true });
        fs.mkdirSync(path.join(p, dataFolder), { recursive: true });
        return [true, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}