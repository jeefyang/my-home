import { nanoid } from "nanoid";
import { UsersFolder, DATA_DIR, dataOptions, dataFolder, filesFolder } from "./data";
import fs from "fs";
import path from "path";
import { verify } from "crypto";
import { ResSendType } from "@common/apis/tools/apiUrlsTrans";
import { type Request } from "express";
import { UrlsUtils } from "../utils/urls";

export const UserFileName = "user.jsonc";

const cacheUserMax = 1000;// 缓存用户数量
export const cacheUserList: UserType[] = [];


/** 创建用户 */
export function createUser(type: UserTypeType): [UserType | undefined, any] {
    // 提前触发,阻止重复创建
    dataOptions.isEmptyUser = false;
    const pathID = nanoid(10);
    const user: UserType = {
        type,
        pageUUIDList: [],
        uuid: nanoid(10),
        name: type == "admin" ? "管理员" : "用户",
        pathID,
        createTime: Date.now(),
        modifyTime: Date.now(),
    };
    const p = path.join(DATA_DIR, UsersFolder, pathID);
    try {
        fs.mkdirSync(p);
        fs.mkdirSync(path.join(p, dataFolder), { recursive: true });
        fs.mkdirSync(path.join(p, filesFolder), { recursive: true });
        fs.writeFileSync(path.join(p, UserFileName), JSON.stringify(user, null, '\t'));
        return [user, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

/** 获取用户 */
export function getUser(pathID: string, autoInit?: boolean): [UserType | undefined, any] {

    const index = cacheUserList.findIndex(v => v.pathID == pathID);
    // 缓存中存在
    if (index != -1) {
        const user = cacheUserList.splice(index, 1)[0];
        cacheUserList.push(user);
        return [user, undefined];
    }

    //  如果是首次加载，则创建一个用户
    if (!dataOptions.isEmptyUser && autoInit) {
        const [user, err] = createUser('admin');
        if (err) {
            return [undefined, err];
        }
        console.log(`首次管理员创建成功,uuid:${user!.uuid},pathID:${user!.pathID}`);
        cacheUserList.push(user!);
        if (cacheUserList.length > cacheUserMax) {
            cacheUserList.shift();
        }

        return [user, undefined];

    }
    const p = path.join(DATA_DIR, UsersFolder, pathID);
    if (!fs.existsSync(p)) {
        return [undefined, "用户不存在"];
    }
    const user = JSON.parse(fs.readFileSync(path.join(p, UserFileName), "utf-8")) as UserType;
    cacheUserList.push(user);
    if (cacheUserList.length > cacheUserMax) {
        cacheUserList.shift();
    }
    return [user, undefined];
}

/** 修改用户路径id */
export function editUserPathID(fromPathID: string, toPathID: string): [UserType | undefined, any] {
    const p = path.join(DATA_DIR, UsersFolder, fromPathID);
    if (!fs.existsSync(p)) {
        return [undefined, "用户不存在"];
    }
    const toP = path.join(DATA_DIR, UsersFolder, toPathID);
    if (fs.existsSync(toP)) {
        return [undefined, "用户已存在"];
    }
    if (!/^[a-zA-Z0-9_-]{8,20}$/.test(toPathID)) {
        return [undefined, "路径id只能包含数字、字母、下划线、中划线、且8-20位"];
    }
    try {
        fs.renameSync(p, toP);
        const data = getUser(toPathID);
        if (data[1]) {
            return [undefined, data[1]];
        }
        data[0]!.pathID = toPathID;
        data[0]!.modifyTime = Date.now();
        fs.writeFileSync(path.join(toP, UserFileName), JSON.stringify(data[0]!, null, '\t'));
        return [data[0]!, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }

}

/** 注销用户 */
export function overCancelUser(pathID: string): [string | undefined, any] {
    const p = path.join(DATA_DIR, UsersFolder, pathID);
    if (!fs.existsSync(p)) {
        return [undefined, "用户不存在"];
    }
    try {
        const index = cacheUserList.findIndex(v => v.pathID == pathID);
        if (index != -1) {
            cacheUserList.splice(index, 1);
        }
        fs.rmSync(p, { recursive: true });
        return [pathID, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

/** 删除用户 */
export function deleteUser(uuid: string): [string | undefined, any] {
    try {
        const p = path.join(DATA_DIR, UsersFolder);
        const list = fs.readdirSync(p);
        if (list.length <= 1) {
            return [undefined, "至少需要一个管理员"];
        }
        for (const pathID of list) {
            const f = path.join(p, pathID, UserFileName);
            if (!fs.existsSync(f)) {
                continue;
            }
            const user = JSON.parse(fs.readFileSync(f, "utf-8")) as UserType;
            if (user.uuid != uuid) {
                continue;
            }
            return overCancelUser(user.pathID);
        }
        return [undefined, "用户不存在"];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
};

/** 更新用户 */
export function updateUser(pathID: string, obj: Partial<UserType>): [UserType | undefined, any] {
    if (!pathID) {
        return [undefined, "用户不存在"];
    }
    const data = getUser(pathID);
    if (data[1]) {
        return [undefined, data[1]];
    }
    try {
        data[0] = { ...data[0]!, ...obj, uuid: data[0]!.uuid, pathID: data[0]!.pathID, type: data[0]!.type };
        data[0]!.modifyTime = Date.now();
        fs.writeFileSync(path.join(DATA_DIR, UsersFolder, pathID, UserFileName), JSON.stringify(data[0]!, null, '\t'));
        return [data[0]!, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

/** 获取用户列表 */
export function getUserList(): [Partial<UserType>[] | undefined, any] {
    try {
        const list = fs.readdirSync(path.join(DATA_DIR, UsersFolder));
        let data: Partial<UserType>[] = [];
        for (const pathID of list) {
            const f = path.join(DATA_DIR, UsersFolder, pathID, UserFileName);
            if (!fs.existsSync(f)) {
                continue;
            }
            const user = JSON.parse(fs.readFileSync(f, "utf-8")) as Partial<UserType>;
            // 删除pathID,防止pathID泄露,尊重隐私(doge)
            delete user.pathID;
            data.push(user);
        }
        data = data.sort((a, b) => {
            if (a.type == 'admin' && b.type != 'admin') {
                return -1;
            }
            if (a.type != 'admin' && b.type == 'admin') {
                return 1;
            }
            return 0;
        });
        return [data, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

/** 验证用户 */
export function verifyUser(pathID: string, password?: string): [UserType | undefined, any] {
    // 空用户,双undefined判断
    if (dataOptions.isEmptyUser) {
        return [undefined, undefined];
    }
    if (!pathID) {
        return [undefined, "用户不存在"];
    }
    const data = getUser(pathID);
    if (data[1]) {
        return [undefined, data[1]];
    }
    const user = data[0]!;
    if (user.password && user.password != password) {
        return [undefined, "密码错误"];
    }
    return [user, undefined];
}

export async function verifyUserFromReq(req: Request): Promise<ResSendType<any> | undefined> {
    const data = verifyUser(req.headers.pathid, req.headers.password);
    if (data[1]) {
        return { code: 401, msg: data[1], err: 'Unauthorized' };
    }
    if (!data[0]) {
        return { code: 200, msg: "用户列表暂时为空,请创建管理员" };
    }
    return undefined;
}

export function getUserData(pathID: string, filename: string): [string | undefined, any] {
    try {
        if (!UrlsUtils.checkSinglePath(pathID, filename)) {
            return [undefined, "用户不存在"];
        }
        const p = path.join(DATA_DIR, UsersFolder, pathID);
        if (!fs.existsSync(p)) {
            return [undefined, "用户不存在"];
        }
        if (!fs.existsSync(path.join(p, dataFolder, filename))) {
            return [undefined, undefined];
        }
        return [fs.readFileSync(path.join(p, dataFolder, filename), "utf-8"), undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function updateUserData(pathID: string, filename: string, content: string): [boolean | undefined, any] {
    try {
        if (!UrlsUtils.checkSinglePath(pathID, filename)) {
            return [undefined, "用户不存在"];
        }
        const p = path.join(DATA_DIR, UsersFolder, pathID);
        if (!fs.existsSync(p)) {
            return [undefined, "用户不存在"];
        }
        fs.writeFileSync(path.join(p, dataFolder, filename), content);
        return [true, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function deleteUserData(pathID: string, filename: string): [boolean | undefined, any] {
    try {
        if (!UrlsUtils.checkSinglePath(pathID, filename)) {
            return [undefined, "用户不存在"];
        }
        const p = path.join(DATA_DIR, UsersFolder, pathID);
        if (!fs.existsSync(p)) {
            return [undefined, "用户不存在"];
        }
        if (fs.existsSync(path.join(p, dataFolder, filename))) {
            fs.rmSync(path.join(p, dataFolder, filename));
        }
        return [true, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

export function clearUserData(pathID: string): [boolean | undefined, any] {
    try {
        if (!UrlsUtils.checkSinglePath(pathID)) {
            return [undefined, "用户不存在"];
        }
        const p = path.join(DATA_DIR, UsersFolder, pathID);
        if (!fs.existsSync(p)) {
            return [undefined, "用户不存在"];
        }
        fs.rmSync(path.join(p, dataFolder), { recursive: true });
        fs.mkdirSync(path.join(p, dataFolder), { recursive: true });
        return [true, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}