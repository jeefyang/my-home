import { ItemApiUrl } from "@common/apis/item";
import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { Router } from "express";
import { verifyUserFromReq } from "../stores/users";
import { addPageItem, addPageItemGroup, deletePageItem, deletePageItemGroup, updatePageItem, updatePageItemGroup } from "../stores/pages";
import { clearItemData, deleteItemData, getItemData, updateItemData } from "../stores/items";
export function useItemApi(router: Router) {
    const itemRouter = new TransExpressRouter(ItemApiUrl, router);

    itemRouter.setRouter('addItem', async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [uuid, err] = deletePageItemGroup(from.pageUUID, from.uuid);
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [data, err] = updateItemData(from.itemUUID, from.itemType, from.filename, from.content);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
            };
        }
        return {};
    });

    itemRouter.setRouter('clearItemData', async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [data, err] = clearItemData(from.itemUUID, from.itemType);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
            };
        }
        return {};
    });

    itemRouter.setRouter('deleteItemData', async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [data, err] = deleteItemData(from.itemUUID, from.itemType, from.filename);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
            };
        }
        return {};
    });

}