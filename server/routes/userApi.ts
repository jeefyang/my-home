import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { UserApiUrl } from "@common/apis/user";
import { Router } from "express";
import { adminResetUserSecondCode, adminUpdateUser, clearUserData, createUser, deleteUser, deleteUserData, editUserPathID, getUser, getUserData, getUserList, toAdminUserItem, updateUser, updateUserData, verifyUser, verifyUserFromReq } from "../stores/users";

export function useUserApi(router: Router) {
    const userRouter = new TransExpressRouter(UserApiUrl, router);

    const routeError = (err: any, fallback = "操作失败") => ({
        code: typeof err?.code === "number" ? err.code : 500,
        msg: err?.msg || fallback,
        err: err?.err || err?.message || String(err),
    });

    // 401 = 未登录/凭据错误；403 = 已登录但非管理员
    const requireAdmin = (req: any) => {
        const [user, err] = verifyUser(req.headers.pathid, req.headers.secondcode);
        if (err || !user) {
            return { error: { code: 401, msg: "身份验证失败", err: err || "Unauthorized" } };
        }
        if (user.type !== "admin") {
            return { error: { code: 403, msg: "需要管理员权限", err: "Forbidden" } };
        }
        return { user };
    };

    userRouter.setRouter("getUser", async (from, req, res) => {
        const [user, err] = verifyUser(req.headers.pathid, req.headers.secondcode);
        if (err) {
            // 未登录/凭据错误按 401 返回，前端据此弹登录框
            return { code: 401, msg: "身份验证失败", err: err };
        }
        // 证明是程序首次运行
        if (!user) {
            const [newUser, err] = createUser("admin");
            if (err) {
                return {
                    err: err,
                };
            }
            return { data: newUser, msg: "程序首次运行,自动创建管理员成功" };
        }
        return { data: user };


    });

    userRouter.setRouter("verifyUser", async (_from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        return { msg: "用户验证成功" };
    });

    userRouter.setRouter("createUser", async (from, req, res) => {
        const auth = requireAdmin(req);
        if (auth.error) {
            return auth.error;
        }
        if (from.type !== "user" && from.type !== "admin") {
            return { code: 400, msg: "用户类型不合法", err: "BadRequest" };
        }
        const keys = Object.keys(from || {});
        if (keys.some(key => !["type", "name", "pathID", "secondCode"].includes(key))) {
            return { code: 400, msg: "包含不允许提交的字段", err: "BadRequest" };
        }
        const [user, err] = createUser(from.type, {
            name: from.name,
            pathID: from.pathID,
            secondCode: from.secondCode,
        });
        if (err) {
            return routeError(err, "创建用户失败");
        }
        return {
            data: {
                user: toAdminUserItem(user!),
                ...(user!.secondCode !== undefined ? { secondCode: user!.secondCode } : {}),
            },
        };
    });

    userRouter.setRouter("deleteUser", async (from, req, res) => {
        const auth = requireAdmin(req);
        if (auth.error) {
            return auth.error;
        }
        if (!from?.uuid) {
            return { code: 400, msg: "缺少用户 uuid", err: "BadRequest" };
        }
        const [result, err] = deleteUser(auth.user!.uuid, from.uuid);
        if (err) {
            return routeError(err, "删除用户失败");
        }
        return {
            data: {
                deleted: true as const,
                ...(result!.warnings.length ? { warnings: result!.warnings } : {}),
            },
        };
    });

    userRouter.setRouter("userList", async (_from, req, res) => {
        const auth = requireAdmin(req);
        if (auth.error) {
            return auth.error;
        }
        const [userList, err] = getUserList();
        if (err) {
            return routeError(err, "获取用户列表失败");
        }
        return { data: userList };
    });

    userRouter.setRouter("adminUpdateUser", async (from, req, res) => {
        const auth = requireAdmin(req);
        if (auth.error) {
            return auth.error;
        }
        if (!from?.uuid) {
            return { code: 400, msg: "缺少用户 uuid", err: "BadRequest" };
        }
        const keys = Object.keys(from);
        if (keys.some(key => key !== "uuid" && key !== "name" && key !== "type")) {
            return { code: 400, msg: "包含不允许修改的字段", err: "BadRequest" };
        }
        const [user, err] = adminUpdateUser(auth.user!.uuid, from.uuid, {
            name: from.name,
            type: from.type,
        });
        if (err) {
            return routeError(err, "更新用户失败");
        }
        return { data: toAdminUserItem(user!) };
    });

    userRouter.setRouter("adminResetUserSecondCode", async (from, req, res) => {
        const auth = requireAdmin(req);
        if (auth.error) {
            return auth.error;
        }
        if (!from?.uuid) {
            return { code: 400, msg: "缺少用户 uuid", err: "BadRequest" };
        }
        const [result, err] = adminResetUserSecondCode(auth.user!.uuid, from.uuid, from.secondCode);
        if (err) {
            return routeError(err, "重置二次码失败");
        }
        return {
            data: {
                user: toAdminUserItem(result!.user),
                ...(result!.secondCode !== undefined ? { secondCode: result!.secondCode } : {}),
                cleared: result!.cleared,
            },
        };
    });

    userRouter.setRouter("updateUser", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const keys = Object.keys(from || {});
        if (!keys.length) {
            return { code: 400, msg: "没有需要更新的字段", err: "BadRequest" };
        }
        const allowed = new Set(["customData", "style", "options"]);
        const forbidden = keys.find(key => !allowed.has(key));
        if (forbidden) {
            return { code: 400, msg: "不允许修改字段: " + forbidden, err: "BadRequest" };
        }
        const [user, err] = updateUser(req.headers.pathid as string, from);
        if (err) {
            return routeError(err, "更新用户失败");
        }
        return { data: toAdminUserItem(user!) };
    });

    userRouter.setRouter("editUserPathID", async (from, req, res) => {

        const [loginUser, loginError] = verifyUser(req.headers.pathid, req.headers.secondcode);
        // 必须先证明自己就是这个 pathID 的主人（拿到旧口令）
        if (loginError || !loginUser) {
            return { code: 401, msg: "身份验证失败", err: loginError || "Unauthorized" };
        }
        // 暂时只能管理员可以修改自己的pathID,普通用户暂不开放
        if (from.newPathID && loginUser.type !== "admin") {
            return { code: 401, msg: "管理员验证失败" };
        }
        if (!from.newPathID && from.newSecondCode == undefined) {
            return { code: 500, msg: "请输入参数" };
        }
        const [user, err] = editUserPathID(req.headers.pathid, from.newPathID, from.newSecondCode);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: user };
    });

    userRouter.setRouter('getUserData', async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [data, err] = getUserData(req.headers.pathid, from.filename);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: data };
    });

    userRouter.setRouter("updateUserData", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [b, err] = updateUserData(req.headers.pathid, from.filename, from.content);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {};
    });

    userRouter.setRouter("deleteUserData", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [b, err] = deleteUserData(req.headers.pathid, from.filename);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {};
    });

    userRouter.setRouter("clearUserData", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [b, err] = clearUserData(req.headers.pathid);
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