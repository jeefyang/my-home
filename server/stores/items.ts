import { nanoid } from "nanoid";
import { DATA_DIR, itemsFolder } from "./data";
import fs, { mkdir } from "fs";
import path from "path";
import { ItemRouterList } from "@common/utils/itemRouterouterList";

const itemDataFolder = 'data';
const itemFilesFolder = 'files';

export function initItems(groupList: Partial<ItemGroupType>[]) {
    return groupList.map(group => {
        if (!group.list) {
            return undefined;
        }
        let list = group.list!.map(c => {
            const [obj, err] = initItem(c);
            if (err) {
                return undefined;
            }
            return obj;
        }).filter(c => !!c);
        if (list.length == 0) {
            return undefined;
        }
        return {
            ...group,
            uuid: nanoid(10),
            list,
        } as ItemGroupType;
    }).filter(c => !!c);
}

export function getItemPath(type: string, uuid: string) {
    const d = `${type}-${uuid}`;
    return path.join(DATA_DIR, itemsFolder, d);
}

export function initItem(item: Partial<ItemType>): [ItemType | undefined, any] {
    if (!item.type) {
        return [undefined, "类型不存在"];
    }
    const router = ItemRouterList[item.type!];
    if (!router) {
        return [undefined, "类型不存在"];
    }
    try {
        const obj = {
            ...item,
            uuid: nanoid(10),
            createTime: Date.now(),
            modifyTime: Date.now(),
        } as ItemType;
        const d = getItemPath(item.type!, obj.uuid!);
        fs.mkdirSync(path.join(d), { recursive: true });
        fs.mkdirSync(path.join(d, itemDataFolder), { recursive: true });
        fs.mkdirSync(path.join(d, itemFilesFolder), { recursive: true });
        Object.keys(router.dataFileList || []).forEach(k => {
            const o = router.dataFileList![k];
            const f = `${k}.${o.ext}`;
            fs.writeFileSync(path.join(d, f), o.defaultContent || '');
        });
        return [obj as ItemType, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}


export function getItemData(itemUUID: string, itemType: string, dataName: string): [string | undefined, any] {
    if (!itemType) {
        return [undefined, "类型不存在"];
    }
    const router = ItemRouterList[itemType!];
    if (!router) {
        return [undefined, "类型不存在"];
    }
    const fileData = router.dataFileList[dataName];
    if (!fileData) {
        return [undefined, "数据不存在"];
    }
    try {
        const d = getItemPath(itemType!, itemUUID);
        if (!fs.existsSync(d)) {
            return [undefined, "项目不存在"];
        }
        const f = `${dataName}.${fileData.ext}`;
        if (!fs.existsSync(path.join(d, itemDataFolder, f))) {
            return [fileData.defaultContent, undefined];
        }
        return [fs.readFileSync(path.join(d, itemDataFolder, f), 'utf-8'), undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}

export function updateItemData(itemUUID: string, itemType: string, dataName: string, data: string): [boolean | undefined, any] {
    if (!itemType) {
        return [undefined, "类型不存在"];
    }
    const router = ItemRouterList[itemType!];
    if (!router) {
        return [undefined, "类型不存在"];
    }
    const fileData = router.dataFileList[dataName];
    if (!fileData) {
        return [undefined, "数据不存在"];
    }
    try {
        const d = getItemPath(itemType!, itemUUID);
        if (!fs.existsSync(d)) {
            return [undefined, "项目不存在"];
        }
        const f = `${dataName}.${fileData.ext}`;
        fs.writeFileSync(path.join(d, itemDataFolder, f), data);
        return [true, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}

export function clearItemData(itemUUID: string, itemType: string, dataName: string): [boolean | undefined, any] {
    if (!itemType) {
        return [undefined, "类型不存在"];
    }
    const router = ItemRouterList[itemType!];
    if (!router) {
        return [undefined, "类型不存在"];
    }
    const fileData = router.dataFileList[dataName];
    if (!fileData) {
        return [undefined, "数据不存在"];
    }
    try {
        const d = getItemPath(itemType!, itemUUID);
        if (!fs.existsSync(d)) {
            return [undefined, "项目不存在"];
        }
        const f = `${dataName}.${fileData.ext}`;
        if (fs.existsSync(path.join(d, itemDataFolder, f))) {
            fs.rmSync(path.join(d, itemDataFolder, f));
        }
        return [true, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}