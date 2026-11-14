import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { UserApiUrl } from "@common/apis/user";
import { Router } from "express";
import { clearUserData, createUser, deleteUser, deleteUserData, editUserPathID, getUser, getUserData, getUserList, overCancelUser, updateUser, updateUserData, verifyUser, verifyUserFromReq } from "../stores/users";

export function useUserApi(router: Router) {
    const userRouter = new TransExpressRouter(UserApiUrl, router);

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
        // 只有管理员可以创建用户，且类型必须在白名单内
        const [adminUser, adminError] = verifyUser(req.headers.pathid, req.headers.secondcode);
        if (adminError || !adminUser || adminUser.type !== "admin") {
            return { code: 401, msg: "管理员验证失败" };
        }
        if (from.type !== "user" && from.type !== "admin") {
            return { code: 400, msg: "用户类型不合法" };
        }
        const [user, err] = createUser(from.type);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {
            data: user!
        };
    });

    userRouter.setRouter("deleteUser", async (from, req, res) => {
        const [adminUser, adminError] = verifyUser(req.headers.pathid, req.headers.secondcode);
        if (adminError || !adminUser || adminUser.type !== "admin") {
            return { code: 401, msg: "管理员验证失败" };
        }
        const [user, err] = deleteUser(from.uuid);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {};
    });

    userRouter.setRouter("overCancelUser", async (_from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [_pathID, err] = overCancelUser(req.headers.pathid);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return {};
    });

    userRouter.setRouter("userList", async (_from, req, res) => {

        const [adminUser, adminError] = verifyUser(req.headers.pathid, req.headers.secondcode);
        if (adminError || !adminUser || adminUser.type !== "admin") {
            return { code: 401, msg: "管理员验证失败" };
        }
        const [userList, err] = getUserList();
        if (err) {
            return { code: 500, msg: err };
        }
        return {
            data: userList
        };
    });

    userRouter.setRouter("updateUser", async (from, req, res) => {
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [user, err] = updateUser(req.headers.pathid, from);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: user };
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