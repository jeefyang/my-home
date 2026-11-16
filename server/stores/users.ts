import { nanoid } from "nanoid";
import { UsersFolder, DATA_DIR, dataOptions, dataFolder, filesFolder } from "./data";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { ResSendType } from "@common/apis/tools/apiUrlsTrans";
import { deletePagesForUser } from "./pages";
import { type Request } from "express";
import { UrlsUtils } from "../utils/urls";

export const UserFileName = "user.jsonc";

const cacheUserMax = 1000;// 缓存用户数量
export const cacheUserList: UserType[] = [];

/** store 的已知失败形状；路由据此映射 HTTP 状态码 */
export type UserStoreError = {
    code: 400 | 403 | 404 | 409 | 500;
    msg: string;
    err: string;
};

function userError(code: UserStoreError["code"], msg: string, err: string): UserStoreError {
    return { code, msg, err };
}

function isUserStoreError(value: any): value is UserStoreError {
    return Boolean(value && typeof value === "object" && typeof value.code === "number" && typeof value.msg === "string");
}

function defaultName(type: UserTypeType): string {
    return type === "admin" ? "管理员" : "用户";
}

/** 管理端只读投影；name 为空时读取层回退默认名，不写盘 */
export function toAdminUserItem(user: UserType): AdminUserItem {
    return {
        uuid: user.uuid,
        name: user.name?.trim() ? user.name : defaultName(user.type),
        pathID: user.pathID,
        type: user.type,
        pageUUIDList: user.pageUUIDList,
        createTime: user.createTime,
        modifyTime: user.modifyTime,
    };
}

/** 以磁盘为准读取全部用户；坏文件跳过并记录，不因单文件拖垮列表 */
function readAllUsers(): UserType[] {
    const root = path.join(DATA_DIR, UsersFolder);
    const list = fs.readdirSync(root);
    const result: UserType[] = [];
    for (const pathID of list) {
        const file = path.join(root, pathID, UserFileName);
        if (!fs.existsSync(file)) {
            continue;
        }
        try {
            result.push(JSON.parse(fs.readFileSync(file, "utf-8")) as UserType);
        }
        catch (e) {
            console.error("读取用户失败:" + file, e);
        }
    }
    return result;
}

export function countAdmins(): number {
    return readAllUsers().filter(user => user.type === "admin").length;
}

export function getUserByUUID(uuid: string): [UserType | undefined, UserStoreError | any] {
    if (!uuid) {
        return [undefined, userError(400, "缺少用户 uuid", "BadRequest")];
    }
    try {
        const user = readAllUsers().find(v => v.uuid === uuid);
        if (!user) {
            return [undefined, userError(404, "用户不存在", "NotFound")];
        }
        return [user, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

/**
 * 管理员操作目标的统一不变量。多实例部署时这里的检查与写盘之间需要文件锁；
 * 当前 PM2 instances=1 且 store 全同步，不会被同进程请求交错。
 */
export function assertCanMutateUser(
    actor: UserType,
    target: UserType,
    action: "update" | "delete" | "reset",
    patch?: { type?: UserTypeType }
): UserStoreError | undefined {
    if (actor.type !== "admin") {
        return userError(403, "需要管理员权限", "Forbidden");
    }
    if (action === "update" && patch?.type !== undefined && patch.type !== target.type && actor.uuid === target.uuid) {
        return userError(409, "不能修改自己的类型", "Conflict");
    }
    if (action === "delete" && actor.uuid === target.uuid) {
        return userError(409, "不能删除自己", "Conflict");
    }
    if (action === "reset" && actor.uuid === target.uuid) {
        return userError(409, "不能重置自己的二次码", "Conflict");
    }
    if (action === "delete" && target.type === "admin" && countAdmins() <= 1) {
        return userError(409, "至少保留一个管理员", "Conflict");
    }
    if (action === "update" && patch?.type === "user" && target.type === "admin" && countAdmins() <= 1) {
        return userError(409, "至少保留一个管理员", "Conflict");
    }
    return undefined;
}

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


export type CreateUserOptions = {
    name?: string;
    pathID?: string;
    secondCode?: string;
};

const PATH_ID_RE = /^[a-zA-Z0-9_-]{8,20}$/;

function generatePathID(): string | undefined {
    for (let i = 0; i < 5; i++) {
        const id = nanoid(10);
        if (PATH_ID_RE.test(id) && !fs.existsSync(path.join(DATA_DIR, UsersFolder, id))) {
            return id;
        }
    }
    return undefined;
}

/** 创建用户；所有校验先于建目录，失败不落盘 */
export function createUser(
    type: UserTypeType,
    opts: CreateUserOptions = {}
): [UserType | undefined, UserStoreError | any] {
    if (type !== "user" && type !== "admin") {
        return [undefined, userError(400, "用户类型不合法", "BadRequest")];
    }

    let name = defaultName(type);
    if (opts.name !== undefined) {
        if (typeof opts.name !== "string") {
            return [undefined, userError(400, "名称格式不正确", "BadRequest")];
        }
        const trimmed = opts.name.trim();
        if (!trimmed) {
            name = defaultName(type);
        }
        else {
            if (Array.from(trimmed).length > 50) {
                return [undefined, userError(400, "名称需为 1–50 个字符", "BadRequest")];
            }
            name = trimmed;
        }
    }

    let pathID: string | undefined;
    if (opts.pathID !== undefined && typeof opts.pathID !== "string") {
        return [undefined, userError(400, "路径 ID 格式不正确", "BadRequest")];
    }
    const requestedPathID = opts.pathID?.trim();
    if (requestedPathID) {
        if (!PATH_ID_RE.test(requestedPathID)) {
            return [undefined, userError(400, "路径 ID 只能包含字母、数字、下划线、中划线，且 8–20 位", "BadRequest")];
        }
        if (fs.existsSync(path.join(DATA_DIR, UsersFolder, requestedPathID))) {
            return [undefined, userError(409, "路径 ID 已存在", "Conflict")];
        }
        pathID = requestedPathID;
    }
    else {
        pathID = generatePathID();
        if (!pathID) {
            return [undefined, userError(500, "生成路径 ID 失败", "InternalError")];
        }
    }

    let secondCode: string | undefined;
    if (opts.secondCode !== undefined) {
        if (typeof opts.secondCode !== "string") {
            return [undefined, userError(400, "二次码格式不正确", "BadRequest")];
        }
        secondCode = opts.secondCode === "" ? undefined : opts.secondCode;
    }

    const user: UserType = {
        type,
        pageUUIDList: [],
        uuid: nanoid(10),
        name,
        pathID,
        createTime: Date.now(),
        modifyTime: Date.now(),
    };
    if (secondCode !== undefined) {
        user.secondCode = secondCode;
    }

    const p = path.join(DATA_DIR, UsersFolder, pathID);
    try {
        fs.mkdirSync(p);
    }
    catch (e: any) {
        if (e?.code === "EEXIST") {
            return [undefined, userError(409, "路径 ID 已存在", "Conflict")];
        }
        console.error(e);
        return [undefined, e];
    }

    try {
        fs.mkdirSync(path.join(p, dataFolder), { recursive: true });
        fs.mkdirSync(path.join(p, filesFolder), { recursive: true });
        writeUserFile(p, user);
        // 只有写盘成功才翻转状态，否则首次启动会漏掉自动建管理员
        dataOptions.isEmptyUser = false;
        refreshUserCache(user);
        return [user, undefined];
    }
    catch (e) {
        console.error(e);
        // 目录已建但写盘失败时尽力回滚，避免半成品账号
        try {
            fs.rmSync(p, { recursive: true, force: true });
        }
        catch (rollbackError) {
            console.error(rollbackError);
        }
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
        // createUser 已刷新缓存，这里不再重复 push
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

/** 删除账号目录；不再包含“至少一个用户”检查，管理员不变量由调用方保证 */
export function removeUserDirectory(pathID: string): [string | undefined, UserStoreError | any] {
    if (!UrlsUtils.checkSinglePath(pathID)) {
        return [undefined, userError(404, "用户不存在", "NotFound")];
    }
    const p = path.join(DATA_DIR, UsersFolder, pathID);
    if (!fs.existsSync(p)) {
        return [undefined, userError(404, "用户不存在", "NotFound")];
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

/** 删除用户：账号目录必须先删成功，再按快照清理页面与元件 */
export function deleteUser(
    actorUUID: string,
    targetUUID: string
): [{ deleted: true; warnings: string[] } | undefined, UserStoreError | any] {
    const [actor, actorErr] = getUserByUUID(actorUUID);
    if (actorErr) {
        return [undefined, actorErr];
    }
    const [target, targetErr] = getUserByUUID(targetUUID);
    if (targetErr) {
        return [undefined, targetErr];
    }
    const invariantErr = assertCanMutateUser(actor!, target!, "delete");
    if (invariantErr) {
        return [undefined, invariantErr];
    }

    // 先快照，账号目录删除后就不能再读该用户了
    const pageUUIDList = [...(target!.pageUUIDList || [])];
    const [removed, removeErr] = removeUserDirectory(target!.pathID);
    if (removeErr || !removed) {
        console.error(removeErr);
        return [undefined, isUserStoreError(removeErr)
            ? removeErr
            : userError(500, "删除用户失败", "InternalError")];
    }

    const warnings = deletePagesForUser(pageUUIDList);
    return [{ deleted: true, warnings }, undefined];
}

/** 管理端修改名称/类型；身份字段与二次码保持不变 */
export function adminUpdateUser(
    actorUUID: string,
    targetUUID: string,
    patch: { name?: string; type?: UserTypeType }
): [UserType | undefined, UserStoreError | any] {
    const [actor, actorErr] = getUserByUUID(actorUUID);
    if (actorErr) {
        return [undefined, actorErr];
    }
    const [target, targetErr] = getUserByUUID(targetUUID);
    if (targetErr) {
        return [undefined, targetErr];
    }

    const nameProvided = patch.name !== undefined;
    const typeProvided = patch.type !== undefined;
    if (!nameProvided && !typeProvided) {
        return [undefined, userError(400, "没有需要更新的字段", "BadRequest")];
    }

    let name = target!.name;
    if (nameProvided) {
        if (typeof patch.name !== "string") {
            return [undefined, userError(400, "名称格式不正确", "BadRequest")];
        }
        name = patch.name.trim();
        if (!name || Array.from(name).length > 50) {
            return [undefined, userError(400, "名称需为 1–50 个字符", "BadRequest")];
        }
    }

    let type = target!.type;
    if (typeProvided) {
        if (patch.type !== "user" && patch.type !== "admin") {
            return [undefined, userError(400, "用户类型不合法", "BadRequest")];
        }
        type = patch.type;
    }

    const invariantErr = assertCanMutateUser(actor!, target!, "update", { type });
    if (invariantErr) {
        return [undefined, invariantErr];
    }

    try {
        const user: UserType = {
            ...target!,
            name,
            type,
            modifyTime: Date.now(),
        };
        writeUserFile(path.join(DATA_DIR, UsersFolder, user.pathID), user);
        refreshUserCache(user);
        return [user, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

/** 管理端重置他人二次码；undefined=随机生成，""=清除 */
export function adminResetUserSecondCode(
    actorUUID: string,
    targetUUID: string,
    secondCode?: string
): [{ user: UserType; secondCode?: string; cleared: boolean } | undefined, UserStoreError | any] {
    const [actor, actorErr] = getUserByUUID(actorUUID);
    if (actorErr) {
        return [undefined, actorErr];
    }
    const [target, targetErr] = getUserByUUID(targetUUID);
    if (targetErr) {
        return [undefined, targetErr];
    }
    if (secondCode !== undefined && typeof secondCode !== "string") {
        return [undefined, userError(400, "二次码格式不正确", "BadRequest")];
    }

    const invariantErr = assertCanMutateUser(actor!, target!, "reset");
    if (invariantErr) {
        return [undefined, invariantErr];
    }

    const cleared = secondCode === "";
    const nextCode = cleared ? undefined : (secondCode ?? nanoid(12));
    try {
        const user: UserType = {
            ...target!,
            modifyTime: Date.now(),
        };
        if (nextCode === undefined) {
            delete user.secondCode;
        }
        else {
            user.secondCode = nextCode;
        }
        writeUserFile(path.join(DATA_DIR, UsersFolder, user.pathID), user);
        refreshUserCache(user);
        return [{ user, secondCode: nextCode, cleared }, undefined];
    }
    catch (e) {
        console.error(e);
        return [undefined, e];
    }
}

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

/** 管理端用户列表：保留 pathID，永不返回 secondCode */
export function getUserList(): [AdminUserItem[] | undefined, UserStoreError | any] {
    try {
        const data = readAllUsers()
            .map(toAdminUserItem)
            .sort((a, b) => {
                if (a.type === "admin" && b.type !== "admin") {
                    return -1;
                }
                if (a.type !== "admin" && b.type === "admin") {
                    return 1;
                }
                return a.createTime - b.createTime || a.uuid.localeCompare(b.uuid);
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