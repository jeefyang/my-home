import { ItemApiUrl } from "@common/apis/item";
import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { Router } from "express";
import { verifyUser } from "../stores/users";
import { addPageItem, addPageItemGroup, deletePageItem, deletePageItemGroup, getPage, updatePageItem, updatePageItemGroup } from "../stores/pages";
import { clearItemData, deleteItemData, getItemData, updateItemData } from "../stores/items";

/** 从请求头取当前用户；失败时返回可直接 return 的错误响应 */
function requireUser(req: any): [UserType | undefined, any] {
    const [user, err] = verifyUser(req.headers.pathid, req.headers.secondcode);
    if (err) {
        return [undefined, { code: 401, msg: err, err: "Unauthorized" }];
    }
    if (!user) {
        return [undefined, { code: 401, msg: "用户不存在", err: "Unauthorized" }];
    }
    return [user, undefined];
}

/** 校验页面归属 */
function requirePage(user: UserType, pageUUID?: string): any {
    if (!pageUUID || !(user.pageUUIDList || []).includes(pageUUID)) {
        return { code: 403, msg: "无权访问该页面" };
    }
    return undefined;
}

/** 扫描用户自己的页面，判断元件是否归属于他 */
function ownsItem(user: UserType, itemUUID?: string, itemType?: string): boolean {
    if (!itemUUID) {
        return false;
    }
    for (const pageUUID of user.pageUUIDList || []) {
        const [page] = getPage(pageUUID);
        if (!page) {
            continue;
        }
        for (const group of page.itemGroupList || []) {
            const hit = (group.list || []).find(it => it && it.uuid === itemUUID);
            if (hit && (!itemType || hit.type === itemType)) {
                return true;
            }
        }
    }
    return false;
}

function ownedItemError(user: UserType, itemUUID?: string, itemType?: string) {
    return ownsItem(user, itemUUID, itemType) ? undefined : { code: 403, msg: "无权访问该元件" };
}

export function useItemApi(router: Router) {
    const itemRouter = new TransExpressRouter(ItemApiUrl, router);

    itemRouter.setRouter('addItem', async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }

        const [item, err] = addPageItem(from.pageUUID, from.itemGroupUUID, from.obj, from.insertIndex);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: item };
    });

    itemRouter.setRouter("updateItem", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        if (from.obj?.uuid && !ownsItem(user!, from.obj.uuid, from.obj.type)) {
            return { code: 403, msg: "无权访问该元件" };
        }

        const [item, err] = updatePageItem(from.pageUUID, from.obj);

        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: item };
    });

    itemRouter.setRouter("deleteItem", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        const itemDenied = ownedItemError(user!, from.uuid);
        if (itemDenied) {
            return itemDenied;
        }

        const [item, err] = deletePageItem(from.pageUUID, from.uuid);

        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: item };
    });

    itemRouter.setRouter("addItemGroup", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        const [itemGroup, err] = addPageItemGroup(from.pageUUID, from.obj, from.insertIndex);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: itemGroup };
    });

    itemRouter.setRouter("updateItemGroup", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        const [itemGroup, err] = updatePageItemGroup(from.pageUUID, from.obj);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: itemGroup };
    });


    itemRouter.setRouter("deleteItemGroup", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        const [, err] = deletePageItemGroup(from.pageUUID, from.uuid);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {};
    });

    itemRouter.setRouter('getItemData', async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const itemDenied = ownedItemError(user!, from.itemUUID, from.itemType);
        if (itemDenied) {
            return itemDenied;
        }
        const [data, err] = getItemData(from.itemUUID, from.itemType, from.filename);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: data };
    });

    itemRouter.setRouter('updateItemData', async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const itemDenied = ownedItemError(user!, from.itemUUID, from.itemType);
        if (itemDenied) {
            return itemDenied;
        }
        const [, err] = updateItemData(from.itemUUID, from.itemType, from.filename, from.content);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
            };
        }
        return {};
    });

    itemRouter.setRouter('clearItemData', async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const itemDenied = ownedItemError(user!, from.itemUUID, from.itemType);
        if (itemDenied) {
            return itemDenied;
        }
        const [, err] = clearItemData(from.itemUUID, from.itemType);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
            };
        }
        return {};
    });

    itemRouter.setRouter('deleteItemData', async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const itemDenied = ownedItemError(user!, from.itemUUID, from.itemType);
        if (itemDenied) {
            return itemDenied;
        }
        const [, err] = deleteItemData(from.itemUUID, from.itemType, from.filename);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
            };
        }
        return {};
    });

}
