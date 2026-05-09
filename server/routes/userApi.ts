import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { UserApiUrl } from "@common/apis/user";
import { Router } from "express";
import { clearUserData, createUser, deleteUser, deleteUserData, editUserPathID, getUser, getUserData, getUserList, overCancelUser, updateUser, updateUserData, verifyUser, verifyUserFromReq } from "../stores/users";

export function useUserApi(router: Router) {
    const userRouter = new TransExpressRouter(UserApiUrl, router);

    userRouter.setRouter("getUser", async (from, req, res) => {
        const [user, err] = verifyUser(req.headers.pathid, req.headers.password);
        if (err) {
            return { err: err };
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
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
        const [adminUser, adminError] = verifyUser(req.headers.pathid, req.headers.password);
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

        const [adminUser, adminError] = verifyUser(req.headers.pathid, req.headers.password);
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
        const check = await verifyUserFromReq(req);
        if (check) {
            return check;
        }
        const [user, err] = editUserPathID(req.headers.pathid, from.newPathID);
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