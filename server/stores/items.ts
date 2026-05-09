import { nanoid } from "nanoid";
import { DATA_DIR, dataFolder, filesFolder, itemsFolder } from "./data";
import fs, { mkdir } from "fs";
import path from "path";
import { ItemRouterList } from "@common/utils/itemRouterouterList";



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
        fs.mkdirSync(path.join(d, dataFolder), { recursive: true });
        fs.mkdirSync(path.join(d, filesFolder), { recursive: true });
        return [obj as ItemType, undefined];
    }
    catch (e) {
        console.log(e);
        return [undefined, e];
    }
}


export function getItemData(itemUUID: string, itemType: string, filename: string): [string | undefined, any] {
    if (!itemType) {
        return [undefined, "类型不存在"];
    }
    const router = ItemRouterList[itemType!];
    if (!router) {
        return [undefined, "类型不存在"];
    }
    try {
        const d = getItemPath(itemType!, itemUUID);
        if (!fs.existsSync(d)) {
            return [undefined, "项目不存在"];
        }
        if (!fs.existsSync(path.join(d, dataFolder, filename))) {
            return [undefined, undefined];
        }
        return [fs.readFileSync(path.join(d, dataFolder, filename), 'utf-8'), undefined];
    }
    catch (e) {
        console.log(e);
        return [undefined, e];
    }
}

export function updateItemData(itemUUID: string, itemType: string, filename: string, content: string): [boolean | undefined, any] {
    if (!itemType) {
        return [undefined, "类型不存在"];
    }
    const router = ItemRouterList[itemType!];
    if (!router) {
        return [undefined, "类型不存在"];
    }
    try {
        const d = getItemPath(itemType!, itemUUID);
        if (!fs.existsSync(d)) {
            return [undefined, "项目不存在"];
        }
        fs.writeFileSync(path.join(d, dataFolder, filename), content);
        return [true, undefined];
    }
    catch (e) {
        console.log(e);
        return [undefined, e];
    }
}

export function deleteItemData(itemUUID: string, itemType: string, filename: string): [boolean | undefined, any] {
    if (!itemType) {
        return [undefined, "类型不存在"];
    }
    const router = ItemRouterList[itemType!];
    if (!router) {
        return [undefined, "类型不存在"];
    }
    try {
        const d = getItemPath(itemType!, itemUUID);
        if (!fs.existsSync(d)) {
            return [undefined, "项目不存在"];
        }
        if (fs.existsSync(path.join(d, dataFolder, filename))) {
            fs.rmSync(path.join(d, dataFolder, filename));
        }
        return [true, undefined];
    }
    catch (e) {
        console.log(e);
        return [undefined, e];
    }

}

export function clearItemData(itemUUID: string, itemType: string,): [boolean | undefined, any] {
    if (!itemType) {
        return [undefined, "类型不存在"];
    }
    const router = ItemRouterList[itemType!];
    if (!router) {
        return [undefined, "类型不存在"];
    }
    try {
        const d = getItemPath(itemType!, itemUUID);
        if (!fs.existsSync(d)) {
            return [undefined, "项目不存在"];
        }
        fs.rmSync(path.join(d, dataFolder), { recursive: true });
        fs.mkdirSync(path.join(d, dataFolder), { recursive: true });
        return [true, undefined];
    }
    catch (e) {
        console.log(e);
        return [undefined, e];

    }
}