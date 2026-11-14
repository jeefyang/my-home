import { nanoid } from "nanoid";
import { UsersFolder, DATA_DIR, dataOptions, dataFolder, filesFolder } from "./data";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ResSendType } from "@common/apis/tools/apiUrlsTrans";
import { type Request } from "express";
import { UrlsUtils } from "../utils/urls";

export const UserFileName = "user.jsonc";

const cacheUserMax = 1000;// 缓存用户数量
export const cacheUserList: UserType[] = [];

/** 常量时间字符串比较，避免口令被逐字节试探 */
function safeEqual(a: string, b: string): boolean {
    const ha = crypto.createHash("sha256").update(a).digest();
    const hb = crypto.createHash("sha256").update(b).digest();
    return crypto.timingSafeEqual(ha, hb);
}

/** 原子写 user.jsonc：先写临时文件再 rename，避免进程中断留下半截 JSON */
function writeUserFile(dir: string, user: UserType) {
    const file = path.join(dir, UserFileName);
    const tmp = file + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(user, null, '\t'));
    fs.renameSync(tmp, file);
}

/** 同步刷新缓存，避免改名/改口令后命中旧对象 */
function refreshUserCache(user: UserType) {
    // 先把同一 uuid 的旧条目全部清掉，避免改名换路径后缓存里留下两份
    for (let i = cacheUserList.length - 1; i >= 0; i--) {
        if (cacheUserList[i].uuid === user.uuid) {
            cacheUserList.splice(i, 1);
        }
    }
    cacheUserList.push(user);
    if (cacheUserList.length > cacheUserMax) {
        cacheUserList.shift();
    }
}


/** 创建用户 */
export function createUser(type: UserTypeType): [UserType | undefined, any] {
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
        writeUserFile(p, user);
        // 只有写盘成功才翻转状态，否则首次启动会漏掉自动建管理员
        dataOptions.isEmptyUser = false;
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
export function editUserPathID(fromPathID: string, toPathID?: string, secondCode?: string): [UserType | undefined, any] {
    const p = path.join(DATA_DIR, UsersFolder, fromPathID);
    if (!fs.existsSync(p)) {
        return [undefined, "用户不存在"];
    }
    try {
        const data = getUser(fromPathID);
        let newP = p;
        if (data[1]) {
            return [undefined, data[1]];
        }
        const user = data[0]!;
        if (toPathID) {
            newP = path.join(DATA_DIR, UsersFolder, toPathID);
            if (fs.existsSync(newP)) {
                return [undefined, "用户已存在"];
            }
            if (!/^[a-zA-Z0-9_-]{8,20}$/.test(toPathID)) {
                return [undefined, "路径id只能包含数字、字母、下划线、中划线、且8-20位"];
            }
            fs.renameSync(p, newP);
            const data = getUser(toPathID);
            if (data[1]) {
                return [undefined, data[1]];
            }
            user.pathID = toPathID;
            user.modifyTime = Date.now();
        }
        if (secondCode != undefined) {
            user.secondCode = secondCode;
            user.modifyTime = Date.now();
        }
        writeUserFile(newP, user);
        refreshUserCache(user);

        return [user, undefined];
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
        // 至少保留一个用户，避免把系统删成空壳
        const allUsers = fs.readdirSync(path.join(DATA_DIR, UsersFolder)).filter(name => {
            return fs.existsSync(path.join(DATA_DIR, UsersFolder, name, UserFileName));
        });
        if (allUsers.length <= 1) {
            return [undefined, "至少需要一个用户"];
        }
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
        const oldUser = data[0]!;
        // 不允许修改pathID,type,secondCode
        const user: UserType = { ...oldUser, ...obj, uuid: oldUser.uuid, pathID: oldUser.pathID, type: oldUser.type, secondCode: oldUser.secondCode, modifyTime: Date.now() };
        writeUserFile(path.join(DATA_DIR, UsersFolder, pathID), user);
        // 缓存里可能还是旧对象，必须同步替换
        refreshUserCache(user);
        return [user, undefined];
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
            // 删除各自身份凭据,防止泄露
            delete user.pathID;
            delete user.secondCode;
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
export function verifyUser(pathID: string, secondCode?: string): [UserType | undefined, any] {
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
    if (user.secondCode && !safeEqual(user.secondCode, secondCode || "")) {
        return [undefined, "密码错误"];
    }
    return [user, undefined];
}

export async function verifyUserFromReq(req: Request): Promise<ResSendType<any> | undefined> {
    const data = verifyUser(req.headers.pathid, req.headers.secondcode);
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