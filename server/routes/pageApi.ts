import { PageApiUrl } from "@common/apis/page";
import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { Router } from "express";
import { updateUser, verifyUser } from "../stores/users";
import { clearPageData, deletePage, deletePageData, getPage, getPageData, initPages, updatePage, updatePageData } from "../stores/pages";

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

/** 校验页面归属：只能操作自己 pageUUIDList 里的页面 */
function requirePage(user: UserType, pageUUID?: string): any {
    if (!pageUUID || !(user.pageUUIDList || []).includes(pageUUID)) {
        return { code: 403, msg: "无权访问该页面" };
    }
    return undefined;
}

export function usePageApi(router: Router) {
    const pageRouter = new TransExpressRouter(PageApiUrl, router);

    pageRouter.setRouter("initPages", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const [pageList, pageErr] = initPages();
        if (pageErr || !pageList) {
            return {
                err: pageErr,
                msg: "操作失败",
                code: 500,
            };
        }
        const oldUUIDList = [...(user!.pageUUIDList || [])];
        // 先落盘用户的新页面列表，成功后再清理旧页面，避免中途失败留下死链
        const [, err2] = updateUser(user!.pathID, { ...user!, pageUUIDList: pageList.map(item => item.uuid) });
        if (err2) {
            // 回滚刚创建的新页面，保持与磁盘一致
            pageList.forEach(item => deletePage(item.uuid));
            return {
                err: err2,
                msg: "操作失败",
                code: 500
            };
        }
        oldUUIDList.forEach(uuid => deletePage(uuid));
        return { data: pageList };
    });

    pageRouter.setRouter("getPageList", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const ownUUIDList = new Set(user!.pageUUIDList || []);
        const pages: PageType[] = [];
        for (const uuid of from.uuidList || []) {
            // 只返回属于当前用户的页面，别人的 uuid 直接忽略
            if (!ownUUIDList.has(uuid)) {
                continue;
            }
            const [page, err] = getPage(uuid);
            if (err || !page) {
                // 单个页面损坏时跳过，不再让整个列表 500
                console.error("getPageList: 读取页面失败", uuid, err);
                continue;
            }
            pages.push(page);
        }
        return { data: pages };
    });

    pageRouter.setRouter("getPage", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.uuid);
        if (denied) {
            return denied;
        }
        const [page, err] = getPage(from.uuid);
        if (err || !page) {
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
    });

    pageRouter.setRouter("updatePage", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.uuid);
        if (denied) {
            return denied;
        }
        // 不允许通过更新体改掉 uuid
        const [page, err] = updatePage(from.uuid, { ...from.obj, uuid: from.uuid });
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
    });

    pageRouter.setRouter("getPageData", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        const [data, err] = getPageData(from.pageUUID, from.filename);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: data };
    });

    pageRouter.setRouter("updatePageData", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        const [, err] = updatePageData(from.pageUUID, from.filename, from.content);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {};
    });

    pageRouter.setRouter("deletePageData", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        const [, err] = deletePageData(from.pageUUID, from.filename);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {};
    });

    pageRouter.setRouter("clearPageData", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.pageUUID);
        if (denied) {
            return denied;
        }
        const [, err] = clearPageData(from.pageUUID);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {};
    });
}
