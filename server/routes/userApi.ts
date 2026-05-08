import { TransExpressRouter } from "@common/apis/tools/transExpressRouter";
import { UserApiUrl } from "@common/apis/user";
import { Router } from "express";
import { createUser, deleteUser, getUser, getUserList, overCancelUser, updateUser, verifyUser, verifyUserFromReq } from "../stores/users";

export function useUserApi(router: Router) {
    const userRouter = new TransExpressRouter(UserApiUrl, router);

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
        const [adminUser, adminError] = verifyUser(req.headers.pathID, req.headers.password);
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
        const [_pathID, err] = overCancelUser(req.headers.pathID);
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

        const [adminUser, adminError] = verifyUser(req.headers.pathID, req.headers.password);
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
        const [user, err] = updateUser(req.headers.pathID, from);
        if (err) {
            return {
                err: err,
                msg: "操作失败",
                code: 500
            };
        }
        return { data: user };
    });




}