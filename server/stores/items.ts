import { nanoid } from "nanoid";
import { DATA_DIR, itemsFolder } from "./data";
import fs, { mkdir } from "fs";
import path from "path";
import { ItemRouterList } from "@common/utils/itemRouterouterList";


export function initItems(list: Partial<ItemType>[]) {
    return list.map(c => {
        const data = initItem(c);
        if (data[1]) {
            return undefined;
        }
        return data[0] as ItemType;
    }).filter(c => !!c);
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
        const d = `${obj.type}-${obj.uuid}`;
        fs.mkdirSync(path.join(DATA_DIR, itemsFolder, d), { recursive: true });
        Object.keys(router.dataFileList || []).forEach(k => {
            const o = router.dataFileList![k];
            const f = `${k}.${o.ext}`;
            fs.writeFileSync(path.join(DATA_DIR, itemsFolder, d, f), o.defaultContent || '');
        });
        return [obj as ItemType, undefined];
    }
    catch (e) {
        return [undefined, e];
    }
}