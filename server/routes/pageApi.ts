import { PageApiUrl } from "@common/apis/page";
import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { Router } from "express";
import { verifyUserFromReq } from "../stores/users";
import { addPage, deletePage, getPage, updatePage } from "../stores/pages";


export function usePageApi(router: Router) {
    const pageRouter = new TransExpressRouter(PageApiUrl, router);

    pageRouter.setRouter("getPage", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [page, err] = getPage(from.uuid);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {
            data: page
        };
    });

    pageRouter.setRouter("addPage", async (from, req, res) => {

        // 暂不开放
        return { msg: "暂不支持添加页面", code: 500 };

        // const check = await verifyUserFromReq(req);
        // if (check) {
        //     return check;
        // }
        // const [page, err] = addPage(from);
        // if (err) {
        //     return {
        //         err: err,
        //         msg: "操作失败",
        //         code: 500
        //     };
        // }
        // return { data: page };
    });

    pageRouter.setRouter("updatePage", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [page, err] = updatePage(from.uuid, from.obj);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: page };
    });

    pageRouter.setRouter("deletePage", async (from, req, res) => {

        // 暂不开放
        return { msg: "暂不支持删除页面", code: 500 };

        // const check = await verifyUserFromReq(req);
        // if (check) {
        //     return check;
        // }
        // const [uuid, err] = deletePage(from.uuid);
        // if (err) {
        //     return {
        //         err: err,
        //         msg: "操作失败",
        //         code: 500
        //     };
        // }
        // return { data: uuid };
    });
}