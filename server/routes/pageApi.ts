import { PageApiUrl } from "@common/apis/page";
import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { Router } from "express";
import { updateUser, verifyUser } from "../stores/users";
import { addPage, clearPageData, deletePage, deletePageData, getPage, getPageData, initPages, updatePage, updatePageData } from "../stores/pages";
import { validatePageIcon } from "../utils/pageIcon";
import { isValidPageOrder } from "../utils/pageOrder";

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
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const rawTitle = typeof from.title === "string" ? from.title.trim() : "";
        const title = rawTitle || "新页面";
        if (Array.from(title).length > 20) {
            return { code: 400, msg: "页面标题不能超过 20 个字" };
        }
        let icon: string | undefined;
        if (from.icon !== undefined && from.icon !== null && from.icon !== "") {
            const [validIcon, iconErr] = validatePageIcon(from.icon);
            if (iconErr) {
                return { code: 400, msg: `图标不合法：${iconErr}` };
            }
            icon = validIcon;
        }
        const [page, addErr] = addPage({ title, ...(icon ? { icon } : {}), style: {}, isDefault: false });
        if (addErr || !page) {
            return { err: addErr, msg: "添加页面失败", code: 500 };
        }
        const uuidList = [...(user!.pageUUIDList || []), page.uuid];
        const [, userErr] = updateUser(user!.pathID, { ...user!, pageUUIDList: uuidList });
        if (userErr) {
            // 用户列表没写成，删掉刚创建的页面目录，避免留下孤儿数据
            deletePage(page.uuid);
            return { err: userErr, msg: "保存页面列表失败", code: 500 };
        }
        return { data: { page, uuidList } };
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
        // 不允许通过更新体改掉 uuid / isDefault（默认页迁移只走 deletePage）
        const patch: Partial<PageType> = { ...from.obj };
        delete patch.uuid;
        delete patch.isDefault;
        if (typeof patch.title === "string") {
            const title = patch.title.trim();
            if (!title) {
                return { code: 400, msg: "页面标题不能为空" };
            }
            if (Array.from(title).length > 20) {
                return { code: 400, msg: "页面标题不能超过 20 个字" };
            }
            patch.title = title;
        }
        if ("icon" in patch) {
            if (patch.icon === undefined || patch.icon === null || patch.icon === "") {
                // 置空会随 merge 覆盖旧值，序列化时被丢弃，即删除图标
                patch.icon = undefined;
            }
            else {
                const [validIcon, iconErr] = validatePageIcon(patch.icon);
                if (iconErr) {
                    return { code: 400, msg: `图标不合法：${iconErr}` };
                }
                patch.icon = validIcon;
            }
        }
        const [page, err] = updatePage(from.uuid, { ...patch, uuid: from.uuid });
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
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const denied = requirePage(user!, from.uuid);
        if (denied) {
            return denied;
        }
        const uuidList = [...(user!.pageUUIDList || [])];
        if (uuidList.length <= 1) {
            return { code: 409, msg: "至少需要保留 1 个页面" };
        }
        const [page, pageErr] = getPage(from.uuid);
        if (pageErr || !page) {
            return { err: pageErr, msg: "页面不存在", code: 404 };
        }
        const index = uuidList.indexOf(from.uuid);
        const nextList = uuidList.filter(uuid => uuid !== from.uuid);
        // 删除当前页时落到后一页，没有后一页则落到前一页
        const successor = nextList[index] ?? nextList[index - 1];
        let migratedDefaultUUID: string | undefined;
        if (page.isDefault && successor) {
            const [, defaultErr] = updatePage(successor, { isDefault: true });
            if (defaultErr) {
                return { err: defaultErr, msg: "迁移默认页失败", code: 500 };
            }
            migratedDefaultUUID = successor;
        }
        // 先落盘用户列表，成功后再删目录；任一步失败都回滚到操作前的状态
        const [, userErr] = updateUser(user!.pathID, { ...user!, pageUUIDList: nextList });
        if (userErr) {
            if (migratedDefaultUUID) {
                updatePage(migratedDefaultUUID, { isDefault: false });
                // 删除没有发生，原默认页要恢复默认标记
                updatePage(from.uuid, { isDefault: true });
            }
            return { err: userErr, msg: "保存页面列表失败", code: 500 };
        }
        const [, delErr] = deletePage(from.uuid);
        if (delErr) {
            updateUser(user!.pathID, { ...user!, pageUUIDList: uuidList });
            if (migratedDefaultUUID) {
                updatePage(migratedDefaultUUID, { isDefault: false });
                updatePage(from.uuid, { isDefault: true });
            }
            return { err: delErr, msg: "删除页面失败", code: 500 };
        }
        return { data: { uuidList: nextList } };
    });

    pageRouter.setRouter("updatePageOrder", async (from, req, res) => {
        const [user, authErr] = requireUser(req);
        if (authErr) {
            return authErr;
        }
        const currentList = user!.pageUUIDList || [];
        if (!isValidPageOrder(currentList, from.uuidList)) {
            return { code: 409, msg: "页面列表已变化，请刷新后重试" };
        }
        const nextList = [...from.uuidList];
        const [, userErr] = updateUser(user!.pathID, { ...user!, pageUUIDList: nextList });
        if (userErr) {
            return { err: userErr, msg: "保存页面顺序失败", code: 500 };
        }
        return { data: { uuidList: nextList } };
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
