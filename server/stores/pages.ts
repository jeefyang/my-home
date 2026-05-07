import { nanoid } from "nanoid";
import { DATA_DIR, PagesFolder } from "./data";
import fs from "fs";
import path from "path";
import { initItem, initItems } from "./items";

export const pageFileName = "page.jsonc";

function readPage(uuid: string) {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, PagesFolder, uuid, pageFileName), 'utf-8')) as PageType;
}

function writePage(page: PageType) {
    fs.writeFileSync(path.join(DATA_DIR, PagesFolder, page.uuid, pageFileName), JSON.stringify(page, null, '\t'));
}

export function initPages(): [PageType[] | undefined, any] {
    try {
        const initPagesStr = fs.readFileSync(path.join('./initPages.js'), 'utf-8');
        const initPages: Partial<PageType>[] = eval(initPagesStr);

        const list = initPages.map(page => {
            page.uuid = nanoid(10);
            page.itemList = initItems(page.itemList || []);
            page.createTime = Date.now();
            page.modifyTime = Date.now();
            fs.mkdirSync(path.join(DATA_DIR, PagesFolder, page.uuid), { recursive: true });
            writePage(page as PageType);
            return page as PageType;
        });
        return [list, undefined];
    }
    catch (e) {
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
        return [page, undefined];
    }
    catch (e) {
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
        return [uuid, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}

export function updatePage(uuid: string, obj: Partial<PageType>): [PageType | undefined, any] {
    if (!uuid) {
        return [undefined, "页面不存在"];
    }
    if (!fs.existsSync(path.join(DATA_DIR, PagesFolder, uuid))) {
        return [undefined, "页面不存在"];
    }
    try {
        let page = readPage(uuid);
        page = { ...page, ...obj, uuid: page.uuid, createTime: page.createTime, modifyTime: Date.now() };
        writePage(page);
        return [page, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}

export function updatePageItem(pageUUID: string, obj: Partial<ItemType>): [ItemType | undefined, any] {
    if (!pageUUID) {
        return [undefined, "页面不存在"];
    }
    if (!fs.existsSync(path.join(DATA_DIR, PagesFolder, pageUUID))) {
        return [undefined, "页面不存在"];
    }
    try {
        let page = readPage(pageUUID);
        const index = page.itemList.findIndex(item => item.uuid === obj.uuid);
        if (index == -1) {
            return [undefined, "项目不存在"];
        }
        let item = page.itemList[index];
        item = { ...item, ...obj, modifyTime: Date.now(), createTime: item.createTime };
        page.itemList[index] = item;
        writePage(page);
        return [item, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}

export function addPageItem(pageUUID: string, obj: Partial<ItemType>, insertIndex: number = -1): [ItemType | undefined, any] {
    if (!pageUUID) {
        return [undefined, "页面不存在"];
    }
    if (!fs.existsSync(path.join(DATA_DIR, PagesFolder, pageUUID))) {
        return [undefined, "页面不存在"];
    }
    try {

        const data = initItem(obj);
        if (data[1]) {
            return data;
        }
        const item = data[0]!;
        let page = readPage(pageUUID);
        if (insertIndex == -1) {
            page.itemList.push(item);
        }
        else {
            page.itemList.splice(insertIndex, 0, item);
        }
        writePage(page);
        return [item, undefined];

    }
    catch (e) {
        return [undefined, e];
    }
}

export function deletePageItem(pageUUID: string, itemUUID: string): [ItemType[] | undefined, any] {
    if (!pageUUID) {
        return [undefined, "页面不存在"];
    }
    if (!fs.existsSync(path.join(DATA_DIR, PagesFolder, pageUUID))) {
        return [undefined, "页面不存在"];
    }
    try {
        let page = readPage(pageUUID);
        const index = page.itemList.findIndex(item => item.uuid === itemUUID);
        if (index == -1) {
            return [undefined, "项目不存在"];
        }
        page.itemList.splice(index, 1);
        writePage(page);
        return [page.itemList, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}