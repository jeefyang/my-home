import { PageApiUrl } from "@common/apis/page";
import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { Router } from "express";
import { updateUser, verifyUser, verifyUserFromReq } from "../stores/users";
import { addPage, deletePage, getPage, initPages, updatePage } from "../stores/pages";


export function usePageApi(router: Router) {
    const pageRouter = new TransExpressRouter(PageApiUrl, router);

    pageRouter.setRouter("initPages", async (from, req, res) => {
        const [user, err] = verifyUser(req.headers.pathid, req.headers.password);
        if (err) {
            return { err: err };
        }
        const [pageList, pageErr] = initPages();
        if (pageErr) {
            return {
                err: pageErr,
            };
        }
        user!.pageUUIDList.forEach(uuid => {
            deletePage(uuid);
        });
        user!.pageUUIDList = pageList!.map(item => item.uuid);
        const [_user2, err2] = updateUser(user!.pathID, user!);
        if (err2) {
            return {
                err: err2,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: pageList };
    });

    pageRouter.setRouter("getPageList", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const pages: PageType[] = [];
        for (let i = 0; i < from.uuidList.length; i++) {
            const uuid = from.uuidList[i];
            const [page, err] = getPage(uuid);
            if (err) {
                return {
                    err: err,
                    msg: "操作失败",
                    code: 500
                };
            }
            pages.push(page!);
        }
        return { data: pages };
    });

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