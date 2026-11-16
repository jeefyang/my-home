# 多用户管理 规格

> 状态：ready-for-implementation · 2026-11-16 · 作者：wayfinder 会话
> 地图：《多用户管理（管理员专用增删改 · 凭据交付）》（#12）
> 依据：#13《删除用户时页面与元件数据怎么处理》、#14《管理端与现有自助设置的分工》、#15《管理端用户 CRUD 接口契约与安全不变量》、#16《用户管理抽屉与凭据交付原型》
> 原型：`prototype/user-manager.html`（A 方案为验收基准）

## 1. 目标

工具栏第一格的“用户设置”改为管理员专用的“用户管理”入口。管理员打开底部抽屉后可以：

- 查看全部用户：名称、角色、pathID、创建日期、页面数；当前用户高亮并标“我”。
- 新增普通用户或管理员：可指定名称、类型、可选 pathID、可选二次码；pathID 留空自动生成。
- 修改他人的名称与类型；修改自己的名称；不能修改自己的类型。
- 重置他人的二次码（随机、手填或清除）；自己的二次码仍走“路由设置”。
- 删除用户或管理员：硬删除，二次确认，级联删除该用户的页面与元件数据。
- 创建或重置后，一次性展示 pathID + 二次码；关闭后不再回显。

本规格的产出是“可实施的契约与验收标准”，不是实现代码。实现由独立实现票承担。

## 2. 既有事实（实现锚点）

| 事实 | 位置 |
| --- | --- |
| 工具栏“用户设置”只有 User 图标，无 `@click` | `src/components/ToolBar.vue:6-11` |
| 工具栏现有按钮、弹窗与异步抽屉模式 | `src/components/ToolBar.vue:13-74` |
| 底部抽屉 + 列表行 + 行内操作 + 底部新增 | `src/components/NavManagerDrawer.vue:1-103` |
| 居中卡片弹窗 + 字段 + 错误条 + footer | `src/components/PageEditModal.vue:1-37` |
| 自助 pathID / 二次码 / URL 参数 | `src/components/RouterModal.vue:69-101` |
| `initUser` 写 `pathid` / `secondcode` | `src/stores/data.ts:86-96` |
| 页面列表与页面 CRUD action | `src/stores/data.ts:119-226` |
| `UserType` 与角色 | `types/index.d.ts:11-26` |
| 当前用户 API 定义 | `common/apis/user.ts:3-56` |
| 现有 admin-only 端点与 401 语义 | `server/routes/userApi.ts:38-105` |
| 公开 `updateUser` 可 spread 任意字段（改名后门） | `server/routes/userApi.ts:107-121` |
| 自助改 pathID / 二次码 | `server/routes/userApi.ts:123-146` |
| `createUser` 只接受 type，自动 pathID | `server/stores/users.ts:46-71` |
| 自助改 pathID 的 8–20 位校验 | `server/stores/users.ts:112-154` |
| 旧注销只保证“至少一个用户” | `server/stores/users.ts:157-181` |
| 旧删除只删用户目录，不清理页面/元件 | `server/stores/users.ts:184-208` |
| 旧更新强制保留 uuid/pathID/type/secondCode | `server/stores/users.ts:211-232` |
| 旧列表删掉 pathID 与 secondCode | `server/stores/users.ts:235-265` |
| `verifyUser` 的 sha256 + timingSafeEqual | `server/stores/users.ts:268-296` |
| `deletePage` 只删页面目录 | `server/stores/pages.ts:88-104` |
| 删分组 / 删元件时才删 `data/items/{type}-{uuid}` | `server/stores/pages.ts:224-250`、`:309-333` |
| 普通删页路由的默认页迁移与回滚 | `server/routes/pageApi.ts:185-234` |
| 只有 `data.err` 为真才走错误响应 | `common/apis/tools/expressRouter.ts:14-28`（实际文件：`common/apis/tools/transExpressRouter.ts`） |
| PM2 单实例 | `ecosystem.config.cjs:11` |
| 安全回归脚本依赖旧 createUser 响应与 401 | `scripts/security-check.mjs:139-151` |

数据目录：`DATA_DIR/users/{pathID}/user.jsonc`、`DATA_DIR/pages/{uuid}/page.jsonc`、`DATA_DIR/items/{type}-{uuid}/`。用户、页面、元件按构造独占，没有页面共享或转移 API。

## 3. 角色与权限不变量

角色只有 `user` 与 `admin`：

- 未登录 / 凭据错误：`401`。
- 已登录但不是管理员：`403`；不得返回任何用户列表。
- 管理员：可列出全部用户；可新增用户或管理员；可改他人名称与类型；可重置他人二次码；可删除他人。
- 管理员可管理其他管理员，包括降级或删除；但不能删除自己、不能把自己的类型改为 `user`、不能经管理端重置自己的二次码。
- 任何删除或降级之后，系统必须至少保留一个管理员。
- pathID 在管理端创建后不可修改；uuid 不可修改；type 只能由管理员经管理接口修改。
- secondCode 只写不读：列表、创建、更新、重置响应都不得回显“当前已存在的二次码”。创建/重置响应可以返回“本次刚生效的二次码”，仅此一次。
- 普通用户不能列出用户、不能新增、不能改他人、不能删除；工具栏也不渲染管理入口。
- 自己的 pathID、二次码、URL 参数继续走“路由设置”；管理端不取代它。

不变量必须在 store 层成立，不能只靠路由。理由：页面 API 等内部调用也写用户文件；未来新增调用方不应绕开规则。

### 3.1 最后管理员检查的说明

正常路径下，“不能删自己 / 不能降自己”已经保证至少一个管理员：操作者必须是管理员，目标若是另一个管理员，则系统至少有两个管理员。`countAdmins()` 检查仍保留为第二道保险，防止未来放开自操作或新增内部调用方时破坏不变量。

## 4. 数据模型

`UserType` 字段不变，不新增存储字段：

- `uuid`：服务端 `nanoid(10)`，不可指定、不可修改。
- `name`：`trim` 后 1–50 个 Unicode 码点；允许重名；创建时留空按类型默认“管理员 / 用户”。
- `pathID`：登录标识。创建时可留空，服务端 `nanoid(10)` 生成；手填时 `trim` 后必须匹配 `/^[a-zA-Z0-9_-]{8,20}$/`；冲突返回 `409`；创建后管理端不可改。
- `type`：`user | admin`；创建时必填；更新时可改，但不能改自己。
- `secondCode`：可选；不 `trim`；创建时省略或空字符串表示“不设置”；重置时省略表示服务端 `nanoid(12)` 生成，空字符串表示清除，非空字符串表示使用手填值。
- `pageUUIDList`：该用户的页面，按构造独占；管理端不直接编辑。
- `createTime` / `modifyTime`：毫秒时间戳；管理端只刷新 `modifyTime`。

新增一个只读投影，避免把 `secondCode` 带进列表：

```ts
// types/index.d.ts
type AdminUserItem = Pick<
    UserType,
    "uuid" | "name" | "pathID" | "type" | "pageUUIDList" | "createTime" | "modifyTime"
>;
```

`AdminUserItem` 不含 `secondCode`、`options`、`customData`、`style`。`name` 为空时读取层回退为类型默认名，不写盘。

## 5. 接口契约

`common/apis/user.ts` 的键调整如下。删除 `overCancelUser`；新增两个管理端点。

| key | method | from | to | 权限 |
| --- | --- | --- | --- | --- |
| `getUser` | GET | — | `UserType` | 已登录；首次运行例外 |
| `userList` | GET | — | `AdminUserItem[]` | admin |
| `createUser` | POST | `{ type; name?; pathID?; secondCode? }` | `{ user: AdminUserItem; secondCode?: string }` | admin |
| `adminUpdateUser` | POST | `{ uuid; name?; type? }` | `AdminUserItem` | admin |
| `adminResetUserSecondCode` | POST | `{ uuid; secondCode? }` | `{ user: AdminUserItem; secondCode?: string; cleared: boolean }` | admin |
| `deleteUser` | POST | `{ uuid }` | `{ deleted: true; warnings?: string[] }` | admin |
| `updateUser` | POST | `Partial<Pick<UserType, "customData" \| "style" \| "options">>` | `AdminUserItem` | 本人 |
| `verifyUser` | POST | — | `UserType` | 公开 |
| `editUserPathID` | POST | `{ newPathID?; newSecondCode? }` | `UserType` | 本人；改 pathID 仅 admin |
| `getUserData` / `updateUserData` / `clearUserData` / `deleteUserData` | POST | 不变 | 不变 | 本人 |

> `updateUser` 是“本人非身份字段”的白名单接口。页面 API 不经过这个路由，而是直接调用 store 的 `updateUser` 写 `pageUUIDList`；因此白名单不会破坏页面顺序/列表。

### 5.1 公共约定

- 成功：`{ code: 200, msg, data }`。
- 失败：`{ code, msg, err }`；`err` 必须是真值，否则 `TransExpressRouter` 会当成成功。
- 错误信息用中文 `msg`，机器可读 `err` 用稳定短串（`Unauthorized` / `Forbidden` / `NotFound` / `BadRequest` / `Conflict` / `InternalError`）。
- 所有 admin 端点先做认证，再做角色检查，再做目标存在性检查，最后做不变量检查。
- 所有写操作前先完成校验；校验失败不落盘、不建目录。

### 5.2 `userList`

1. 认证失败 / 无用户：`401`。
2. 不是 admin：`403`。
3. 读取 `DATA_DIR/users/*/user.jsonc`，跳过没有 `user.jsonc` 的目录。
4. 返回 `AdminUserItem[]`，包含 `pathID`，绝不包含 `secondCode`。
5. 排序确定：admin 在前；同类型按 `createTime` 升序；再按 `uuid` 字典序。
6. 读取单个用户文件失败：跳过并 `console.error`；不要因为一个坏文件让整个列表 500。

### 5.3 `createUser`

1. admin 校验；`type` 必须是 `user | admin`，否则 `400`。
2. `name`：省略或 `trim` 后为空 -> 默认“管理员/用户”；否则 `trim` 后必须 1–50 码点，否则 `400`。
3. `pathID`：省略或 `trim` 后为空 -> 服务端生成 `nanoid(10)`，生成值必须匹配正则且目录不存在；最多重试 5 次。手填 -> `trim` 后校验正则，不合法 `400`；目录已存在 `409`。
4. `secondCode`：`undefined` 或 `""` -> 不设置；其他字符串原样写入，不 `trim`。非字符串 `400`。
5. 创建 `DATA_DIR/users/{pathID}`、`data/`、`files/`，原子写 `user.jsonc`；`uuid` 使用 `nanoid(10)`，`pageUUIDList=[]`。
6. 成功返回 `{ user: AdminUserItem, secondCode? }`；只有本次实际设置的二次码才出现。未设置时省略字段。
7. 失败返回 `500`，不留下半成品目录；若目录已建但写文件失败，尽力 `rmSync` 回滚。

### 5.4 `adminUpdateUser`

1. admin 校验；`uuid` 必填，目标不存在 `404`。
2. 只接受 `name`、`type`；出现 `pathID`、`secondCode`、`pageUUIDList`、`uuid` 之外的字段（或显式提交这些禁改字段）-> `400`。
3. `name` 若提供：`trim` 后 1–50 码点，空 -> `400`。
4. `type` 若提供：必须是 `user | admin`；目标是自己 -> `409`“不能修改自己的类型”；目标不是自己但降级后管理员数为 0 -> `409`“至少保留一个管理员”。
5. 合并写入：保留 `uuid`、`pathID`、`secondCode`、`pageUUIDList`、`createTime`；刷新 `modifyTime`；原子写盘并刷新缓存。
6. 成功返回更新后的 `AdminUserItem`；没有任何可更新字段 -> `400`。

### 5.5 `adminResetUserSecondCode`

1. admin 校验；`uuid` 必填，目标不存在 `404`。
2. 目标是自己 -> `409`“不能重置自己的二次码”；自己的二次码走“路由设置”。
3. `secondCode === undefined` -> 服务端 `nanoid(12)` 生成并设置。
4. `secondCode === ""` -> 删除 `user.secondCode`，标记 `cleared: true`。
5. 非空字符串 -> 原样设置（不 `trim`）。
6. 非字符串（`null`、数字等）-> `400`。
7. 原子写盘、刷新缓存；返回 `{ user: AdminUserItem, secondCode?: string, cleared: boolean }`。清除时 `secondCode` 省略。
8. 对方的旧二次码立即失效：下一次请求 `401`；新码可立即登录。

### 5.6 `deleteUser`

1. admin 校验；`uuid` 必填，目标不存在 `404`。
2. 目标是自己 -> `409`“不能删除自己”。
3. 目标是 admin 且删除后管理员数为 0 -> `409`“至少保留一个管理员”（正常情况下不可达，见 3.1）。
4. 读取目标 `pageUUIDList` 快照。
5. 先删除 `DATA_DIR/users/{pathID}`（账号目录）；这一步必须成功，失败 `500`，不做页面清理。
6. 再按快照逐页清理页面与元件；单页/单件失败只记 warning，不回滚账号，仍返回 `200`。
7. 返回 `{ deleted: true, warnings? }`；`warnings` 为空时省略。

### 5.7 `updateUser` 公开路由收窄

- 只允许 `customData`、`style`、`options`；出现 `name`、`type`、`pathID`、`secondCode`、`uuid`、`pageUUIDList`、`createTime`、`modifyTime` 任一 -> `400`。
- 空对象 -> `400`。
- 只调用 store 的 `updateUser(req.headers.pathid, patch)`；store 仍强制保留身份字段。
- 页面 API 继续直接 import store `updateUser`，允许写 `pageUUIDList`；不要改为调用公开路由。

### 5.8 移除 `overCancelUser`

- 从 `common/apis/user.ts` 与 `server/routes/userApi.ts` 删除。
- store 的 `overCancelUser(pathID)` 改名为 `removeUserDirectory(pathID)`；不再做“至少一个用户”检查，由 `deleteUser` 的不变量负责。
- 旧路径 `/api/user/overCancelUser` 返回 404；不保留兼容层。

### 5.9 错误码

| code | 场景 | 示例 msg |
| --- | --- | --- |
| 400 | 类型非法、名称长度、pathID 格式、没有可更新字段、提交禁改字段、secondCode 非字符串 | “用户类型不合法”“名称需为 1–50 个字符”“路径 ID 只能包含字母、数字、下划线、中划线，且 8–20 位” |
| 401 | 未登录、pathID 不存在、二次码错误 | “身份验证失败” |
| 403 | 已登录但非管理员 | “需要管理员权限” |
| 404 | 目标 uuid 不存在；页面不存在 | “用户不存在”“页面不存在” |
| 409 | pathID 冲突、删/降级/重置自己、最后管理员、删最后一页 | “路径 ID 已存在”“不能删除自己”“不能修改自己的类型”“不能重置自己的二次码”“至少保留一个管理员” |
| 500 | 磁盘 IO、账号目录删除失败、原子写失败 | “操作失败”“账号目录删除失败” |

## 6. 服务端实现

### 6.1 store 错误对象

新增统一错误形状，避免路由靠中文猜状态码：

```ts
export type UserStoreError = {
    code: 400 | 403 | 404 | 409 | 500;
    msg: string;
    err: string;
};
```

store 的已知失败返回 `UserStoreError`；未知异常原样返回（路由统一 500）。路由 helper：

```ts
function toErrorResponse(err: any, fallbackMsg = "操作失败"): ResSendType<any> {
    if (err && typeof err === "object" && typeof err.code === "number" && err.msg) {
        return { code: err.code, msg: err.msg, err: err.err || "Error" };
    }
    return { code: 500, msg: fallbackMsg, err: err?.message || String(err) };
}
```

### 6.2 `server/stores/users.ts` 签名

```ts
type CreateUserOptions = {
    name?: string;
    pathID?: string;
    secondCode?: string;
};

export function toAdminUserItem(user: UserType): AdminUserItem;
export function countAdmins(): number;

export function createUser(
    type: UserTypeType,
    opts?: CreateUserOptions
): [UserType | undefined, UserStoreError | any];

export function getUserByUUID(
    uuid: string
): [UserType | undefined, UserStoreError | any];

export function assertCanMutateUser(
    actor: UserType,
    target: UserType,
    action: "update" | "delete" | "reset",
    patch?: { type?: UserTypeType }
): UserStoreError | undefined;

export function adminUpdateUser(
    actorUUID: string,
    targetUUID: string,
    patch: { name?: string; type?: UserTypeType }
): [UserType | undefined, UserStoreError | any];

export function adminResetUserSecondCode(
    actorUUID: string,
    targetUUID: string,
    secondCode?: string
): [{ user: UserType; secondCode?: string; cleared: boolean } | undefined, UserStoreError | any];

export function deleteUser(
    actorUUID: string,
    targetUUID: string
): [{ deleted: true; warnings: string[] } | undefined, UserStoreError | any];

export function removeUserDirectory(
    pathID: string
): [string | undefined, UserStoreError | any];

export function getUserList(): [AdminUserItem[] | undefined, any];
```

要点：

- `getUserByUUID` 扫 `DATA_DIR/users/*/user.jsonc`，以磁盘为准；缓存仅作加速，不作为权限判断依据。
- `countAdmins` 扫全部 `user.jsonc`，统计 `type === "admin"`；IO 异常向上抛，管理操作捕获后返回 `500`。
- `assertCanMutateUser` 先检查 `actor.type === "admin"`（`403`），再检查目标存在（由调用方先查），再检查自删/自降级/自重置换码（`409`），最后检查最后管理员（`409`）。
- `createUser` 的目录创建失败要回滚已建目录；`writeUserFile` 保持 tmp+rename；成功后 `refreshUserCache(user)`。
- `adminUpdateUser` 只 merge `name/type`；不要用公开 `updateUser` 的 spread 逻辑，避免误改身份字段。
- `adminResetUserSecondCode` 用 `delete user.secondCode` 表示清除；`JSON.stringify` 会省略 undefined。
- `deleteUser` 先 `removeUserDirectory`，再调用 `deletePagesForUser`；`deletePagesForUser` 不抛异常，返回 warning 数组。
- `getUserList` 用 `toAdminUserItem` 投影，不再 `delete user.pathID`；`name` 空值回退默认名；排序见 5.2。
- 保留 `updateUser(pathID, obj)` 供页面 API 使用，继续强制保留 `uuid/pathID/type/secondCode`。

### 6.3 `server/routes/userApi.ts`

新增本地 helper：

```ts
function requireAdmin(req): [UserType | undefined, ResSendType<any> | undefined];
```

行为：`verifyUser(headers.pathid, headers.secondcode)` 失败/无用户 -> `401`；`user.type !== "admin"` -> `403`。

各 handler：

- `userList`：`requireAdmin` -> `getUserList` -> `{ data }`。
- `createUser`：`requireAdmin` -> 拒绝 `uuid/pageUUIDList` 等指定字段 -> `createUser(from.type, { name, pathID, secondCode })` -> `{ data: { user: toAdminUserItem(user), ...(secondCode ? { secondCode } : {}) } }`。
- `adminUpdateUser`：`requireAdmin` -> `from.uuid` 必填 -> 拒绝 `pathID/secondCode/pageUUIDList` -> `adminUpdateUser(admin.uuid, from.uuid, { name, type })` -> `{ data: toAdminUserItem(user) }`。
- `adminResetUserSecondCode`：`requireAdmin` -> `from.uuid` 必填 -> `adminResetUserSecondCode(admin.uuid, from.uuid, from.secondCode)` -> `{ data: { user: toAdminUserItem(result.user), ...(result.secondCode ? { secondCode: result.secondCode } : {}), cleared: result.cleared } }`。
- `deleteUser`：`requireAdmin` -> `from.uuid` 必填 -> `deleteUser(admin.uuid, from.uuid)` -> `{ data: { deleted: true, ...(warnings.length ? { warnings } : {}) } }`。
- `updateUser`：保留 `verifyUserFromReq`，白名单见 5.7；返回 `toAdminUserItem(user)`。
- `getUser/verifyUser/editUserPathID/getUserData/...`：除必要的 store 签名适配外不改。
- 删除 `overCancelUser` handler。

所有错误 return 必须带 `err`。错误 `msg` 用中文；`err` 用 5.1 的短串。

### 6.4 `server/stores/pages.ts` 级联删除

新增/调整：

```ts
function removeItemDir(item: ItemType): string | undefined; // 返回 warning；成功/已不存在返回 undefined

export function deletePage(
    uuid: string
): [string | undefined, any, string[]?];

export function deletePagesForUser(
    uuids: string[]
): string[];
```

`deletePage` 顺序：

1. `uuid` 为空/页面目录不存在 -> `[undefined, "页面不存在", []]`。
2. `getPage(uuid)`；读取失败 -> `[undefined, err, []]`。
3. 遍历 `page.itemGroupList[].list[]`，对每个 `item.type + item.uuid` 调 `removeItemDir`；失败加入 warnings，继续。
4. `fs.rmSync(DATA_DIR/pages/{uuid}, { recursive: true })`；成功后 `pageCache.delete(uuid)`，返回 `[uuid, undefined, warnings]`。
5. 页面目录删除失败 -> `[undefined, e, warnings]`；不恢复已删元件（无事务，极端情况下页面可能缺件；记录 warning）。

`deletePageItemGroup` / `deletePageItem` 改为复用 `removeItemDir`，保证三处删除规则一致。

`deletePagesForUser(uuids)`：

- 只遍历传入的 `uuids`，不扫描全局孤儿、不动其他用户。
- 每页调 `deletePage`；`err` 或未删除 -> `页面 {uuid} 清理失败：{msg}`；合并该页 warnings。
- 不抛异常；调用方（`deleteUser`）把 warnings 返回给前端。

### 6.5 `server/routes/pageApi.ts` 删除页

- 保留现有顺序：鉴权 -> `requirePage` -> 至少 1 页 -> 读页 -> 默认页迁移 -> 写用户列表 -> `deletePage`。
- `const [deleted, delErr, warnings] = deletePage(from.uuid)`。
- `delErr` -> 按现有逻辑恢复用户列表与默认页标记，返回 `500`。
- 成功 -> `{ data: { uuidList: nextList, ...(warnings.length ? { warnings } : {}) } }`。
- `initPages` 重置旧页时同样复用 `deletePage`；warnings 记录日志，不影响新列表。
- `common/apis/page.ts` 的 `deletePage.to` 增加 `warnings?: string[]`。

### 6.6 单实例约束

`ecosystem.config.cjs` 当前 `instances: 1`，store 全是同步 `fs`；检查与写入不会被同进程请求交错。代码注释写明：多实例部署必须加文件锁，本规格不实现。

## 7. 删除数据语义

- 页面与元件按 `user.pageUUIDList`、`page.itemGroupList` 独占；没有共享/转移 API，因此级联删除不会误删他人数据。
- 删除用户：**账号目录先删，页面/元件后清理**。账号目录删除失败 -> `500`，不清理页面；账号删除成功后，页面清理失败只 warning，不回滚账号。
- 进程若在账号目录删除后、页面清理完成前中断，可能留下不可访问的孤儿页面/元件；不做回收站，兜底是运维层文件系统备份。
- 普通删页、`initPages` 重置旧页也走同一套 `deletePage`，不再留下元件孤儿。
- 删除页面时先删该页的元件目录，再删页面目录；这是 #13 已定的顺序。
- 不做全局孤儿扫描；不删其他用户的页面；不因页面读取失败而盲删无法映射的元件。
- 删除确认文案（前端）：
  `该用户有 N 个页面，页面内全部组件数据一并删除，不可恢复。`
  N 取列表中的 `pageUUIDList.length`；实际删除以服务端当前 `pageUUIDList` 为准。
- 删除成功但 warnings 非空：`200`，前端用 `msg.warning` 展示；不要显示成失败。

## 8. 前端结构

新增文件：

| 文件 | 职责 |
| --- | --- |
| `src/stores/userAdmin.ts` | 管理员用户列表状态与 CRUD action；只存 `AdminUserItem`，绝不持久化二次码 |
| `src/components/UserManagerDrawer.vue` | 底部抽屉、列表、加载/空/错误/无权限、行内编辑/删除、底部新增 |
| `src/components/UserEditModal.vue` | 新增/编辑表单：名称、类型、pathID（仅新增）、二次码（仅新增）；编辑时 pathID 只读、提供“重置二次码”入口 |
| `src/components/UserResetModal.vue` | 重置二次码：随机/手填/清除 |
| `src/components/UserCredentialModal.vue` | 一次性凭据卡片：pathID + 二次码 + 复制 + 关闭后不再显示 |

修改：

| 文件 | 改动 |
| --- | --- |
| `src/components/ToolBar.vue` | 第一格改为双人图标“用户管理”，仅 admin 渲染；打开 `UserManagerDrawer`；保留“路由设置” |
| `src/stores/data.ts` | 管理员改自己名称后同步 `dataStore.user`；页面删除 warnings 透传（可选） |
| `common/apis/user.ts` | 按第 5 节调整键与类型 |
| `common/apis/page.ts` | `deletePage` 响应加 `warnings?` |
| `types/index.d.ts` | 新增 `AdminUserItem` |

### 8.1 `userAdmin` store

```ts
const list = ref<AdminUserItem[]>([]);
const loading = ref(false);
const error = ref("");
const errorCode = ref(0);

async function load(): Promise<{ ok: boolean; msg?: string; code?: number }>;
async function create(payload: {
    type: UserTypeType;
    name?: string;
    pathID?: string;
    secondCode?: string;
}): Promise<{ ok: boolean; msg?: string; code?: number; data?: { user: AdminUserItem; secondCode?: string } }>;
async function update(uuid: string, patch: { name?: string; type?: UserTypeType }): Promise<...>;
async function resetSecondCode(uuid: string, secondCode?: string): Promise<...>;
async function remove(uuid: string): Promise<{ ok: boolean; msg?: string; warnings?: string[] }>;
```

- 每次打开抽屉调用 `load()`；成功替换列表，失败保留旧列表并设置 `error/errorCode`。
- `create` 成功后插入并按 5.2 的排序规则重排；`update` 替换并重排；`remove` 过滤。
- 403：`errorCode=403`，抽屉显示无权限；401：提示“登录已失效，请刷新页面重新登录”；404：提示目标不存在并 `load()`；409：展示服务端 msg。
- 不把 `secondCode` 写入 store 或 localStorage；除用户主动点击“复制登录链接”生成的剪贴板文本外，也不自动写入地址栏；凭据只存在于组件局部变量。

### 8.2 表单校验

- 名称：创建可空；编辑必填；`Array.from(trim).length` 1–50。
- pathID：仅创建；非空时正则 `/^[a-zA-Z0-9_-]{8,20}$/`；留空提示“自动生成”。
- 二次码（创建）：三态“留空（不设置）/ 手动输入 / 随机生成”。手动模式必须非空；随机模式前端 `nanoid(12)` 生成并提交，凭据卡展示。留空模式不提交该字段。
- 二次码（重置）：三态“随机生成（默认）/ 手动输入 / 清除”。随机模式不传 `secondCode`（服务端生成）；手动模式必填；清除传 `""`。
- 类型：创建默认 `user`；编辑自己时禁用类型选择；编辑他人可改。
- 前端校验只用于体验；服务端仍完整校验。

## 9. 界面与交互

### 9.1 工具栏入口

- 第一格，图标 `People20Regular`（`@vicons/fluent`），`title="用户管理"`、`aria-label="用户管理"`。
- `v-if="dataStore.user?.type === 'admin'"`；普通用户不渲染，不保留空位。
- 点击打开 `UserManagerDrawer`；打开时按钮可高亮（与导航管理一致）。
- 保留“路由设置”按钮与 `RouterModal`；不要移除 `LoginModal`。
- `ToolBar.vue` 移除不再使用的 `User` 图标 import，新增 `dataStore` 与 `People20Regular`。

### 9.2 抽屉

- `n-drawer placement="bottom" height="80%"`，`:mask-closable="!busy"`，`:closable="!busy"`。
- `n-drawer-content title="用户管理" :native-scrollbar="false"`；内部 `max-width:640px; margin:0 auto`。
- 顶部可选副标题：`共 N 个用户，其中 M 个管理员`。
- 列表两行式：
  - 第一行：圆形首字头像（`Array.from(name)[0]`，无名称用“用”）、名称、“我”标签（当前用户）、角色标签（管理员/用户）。
  - 第二行：pathID（等宽字体）、创建日期 `YYYY-MM-DD`、`N 页`。
  - 当前用户行高亮（`rgba(127,127,127,.14)`）。
  - 行内操作：编辑、删除；删除在自己这一行禁用并 `title="不能删除自己"`。
- 底部 `新增用户` 主按钮，block。
- 打开时 loading 骨架 3 行；空态 `n-empty description="暂无用户"`；只有自己时在列表上方提示“只有你一个管理员，可新增用户或其他管理员”。
- 错误：`n-alert type="error"` + 重试；403：`n-result status="403" title="无权访问"`，不再重试。
- 列表操作期间 `busy` 禁用行内按钮与新增；关闭被阻止。
- 页面数取 `pageUUIDList.length`；v1 不分页、不搜索。

### 9.3 新增/编辑弹窗

新增（`UserEditModal`）：

- 标题“新增用户”。
- 名称（可空，占位“留空按类型默认”）。
- 类型分段：用户 / 管理员，默认用户。
- pathID（可空，8–20 位提示）。
- 二次码三态；手动输入使用密码框，可切换显示。
- footer：取消 / 创建；提交中 loading；错误 `n-alert`。
- 成功：关闭编辑弹窗，打开凭据弹窗；刷新列表。

编辑：

- 标题“编辑用户”。
- 名称；类型（自己禁用并提示“不能修改自己的类型”）。
- pathID 只读展示，提示“创建后不可修改”。
- 二次码区：不显示当前值，也不显示“是否已设置”的布尔值；只显示说明“二次码只写不读”与“重置二次码”按钮。自己的二次码显示“请在「路由设置」中修改”，不提供重置按钮。
- 点击“重置二次码”：关闭编辑弹窗，打开 `UserResetModal`。
- footer：取消 / 保存；保存只提交名称与类型（自己只提交名称）。

### 9.4 重置二次码

- 标题“重置二次码”；说明“重置后对方下一次请求会要求重新登录”。
- 单选：随机生成（默认）/ 手动输入 / 清除二次码。
- 随机：不传字段，服务端生成；成功进凭据弹窗。
- 手动：必填；成功进凭据弹窗。
- 清除：传 `""`；成功只 toast“二次码已清除”，不进凭据弹窗。
- 清除后该用户变为“无二次码”登录（现有 verify 语义）；文案提示“该用户将只需 pathID 登录”。

### 9.5 一次性凭据

- `n-modal preset="card"`，`:mask-closable="false"`，`:closable="false"`，`:close-on-esc="false"`；只有“我已保存，关闭”。
- 标题：创建 -> “账号已创建”；重置 -> “二次码已重置”。
- 红色 `n-alert type="error"`：“请立即复制，关闭后不再显示。” 未设置二次码时改为“pathID 可在列表中查看；本次未设置二次码。”
- 字段行：用户名称、pathID（等宽 + 复制）、二次码（等宽 + 复制；未设置显示“未设置”）。
- 按钮：“复制登录链接”（primary）、“复制全部”、“我已保存，关闭”；窄屏允许换行。复制全部格式：
  ```
  pathID: ...
  二次码: ...
  ```
  无二次码时第二行写“二次码: 未设置”。
- “复制登录链接”生成当前站点 origin + 当前 pathname + `pathid`，有二次码时再加 `secondcode`；用 `URLSearchParams` 编码，丢弃原有查询与 hash。示例：`https://host/?pathid=abcdefgh&secondcode=code123`；无二次码时只带 `pathid`。打开后应用从 URL 参数直接登录。
- 登录链接含真实凭据，属于用户主动复制的一次性交付；卡内固定提示“登录链接包含 pathID 与二次码，请只发给该用户”。应用不得自动把凭据写进地址栏。
- 复制优先 `navigator.clipboard.writeText`；失败用隐藏 textarea + `document.execCommand("copy")`；仍失败提示“请手动选中复制”，文本保持可选中。
- 关闭时清空组件内凭据对象；再次打开编辑不显示旧码。凭据不得写入 store 或 localStorage；除用户主动复制登录链接外，也不得写入地址栏。
- 打开后焦点落在“复制登录链接”。

### 9.6 删除确认

- `dialog.warning`，标题“删除用户”。
- 内容：`确定删除「{name}」吗？该用户有 N 个页面，页面内全部组件数据一并删除，不可恢复。`
- 按钮：删除（error）/ 取消；删除中 loading。
- 自己的删除按钮禁用，服务端 409 兜底。
- 成功移除行；warnings 非空用 `msg.warning`；失败保留行并展示 msg。

## 10. 自助设置与管理端分工

| 能力 | 管理抽屉（admin-only） | 路由设置 RouterModal（所有用户） |
| --- | --- | --- |
| 查看全部用户 | 是 | 否 |
| 新增用户/管理员 | 是 | 否 |
| 改他人名称/类型 | 是 | 否 |
| 改自己名称 | 是 | 否（不新增名称字段） |
| 重置他人二次码 | 是 | 否 |
| 改自己二次码 | 否（提示去路由设置） | 是 |
| 改自己 pathID | 否（只读） | 是，仅 admin（现有行为） |
| 改他人 pathID | 否 | 否 |
| URL 参数 | 否 | 是 |
| 删除用户 | 是（不能删自己） | 否 |

- 普通用户：工具栏无管理入口；名称不可改；二次码/pathID 仍走 RouterModal；pathID 输入对普通用户保持禁用。
- 管理员：可在抽屉改自己名称；类型只读；删除禁用；二次码与 pathID 走 RouterModal。
- 管理员编辑其他管理员：可改名称/类型、重置二次码、删除；降级/删除后对方下一次请求按新角色处理。
- 重置他人二次码：旧码立即失效；对方下一次请求 401；服务端不推送，对方刷新/重登后 UI 更新。`App.vue` 只在初始化 `initUser` 非 200 时弹登录框，后续请求的 401 不会自动弹框；这是现有行为，本 effort 不改。
- 降级他人：对方下一次 admin 请求 403；普通页面请求仍可用。UI 以登录时 `dataStore.user` 为准，刷新/重登后管理入口消失。
- 删除他人：对方下一次请求 401；账号与页面数据已删除。

## 11. 状态、错误与凭据

- 列表状态：loading / 正常 / 空 / 403 / 错误。错误保留旧列表，避免界面闪空。
- 操作状态：`busy` 独立于列表 loading；同一时间只允许一个写操作。
- 409 处理：展示服务端中文 msg；pathID 冲突时把错误显示在 pathID 字段下；自删/自降级/最后管理员显示在弹窗顶部。
- 404 处理：目标已不存在 -> 提示并 `load()`。
- 401 处理：提示“登录已失效，请刷新页面重新登录”；不静默重试。
- 500：保留当前列表与表单，允许重试。
- 凭据：只在创建/重置成功的响应中出现一次；列表永远没有 `secondCode` 字段；编辑弹窗不读取、不猜测当前码。
- 日志：服务端对页面清理失败 `console.error`，响应 warnings；不要只写日志不告诉管理员。

## 12. 无障碍与响应式

- 所有图标按钮有 `title` 与 `aria-label`；行内编辑/删除的 aria-label 带用户名称。
- 抽屉 `role="dialog"` / `aria-modal` 由 Naive UI 提供；打开后焦点进入抽屉，Esc 关闭（busy 时除外）。
- 凭据弹窗不自动关闭；焦点落在复制按钮；关闭按钮是唯一出口。
- 列表行不是按钮；操作按钮可 Tab 到达；当前用户“我”标签是文本，不只靠颜色。
- 390px 宽：两行式行不横向溢出；pathID 单行省略；行内操作保持 2 个按钮，必要时缩到 26px。
- 暗色主题：使用 Naive UI token 与 `n-tag`/`n-alert`；不硬编码仅亮色可读的颜色。
- 复制失败时文本可选中，保证无剪贴板权限也能手工复制。

## 13. 验收

| # | 场景 | 期望 |
| --- | --- | --- |
| 1 | 普通用户打开应用 | 工具栏无“用户管理”；直接请求 `userList` 得 403 |
| 2 | 未登录请求管理端点 | 401，且不泄露用户数据 |
| 3 | 管理员打开抽屉 | 列表含 pathID、角色、日期、页面数；无 `secondCode` 字段 |
| 4 | 新增用户，名称/pathID/二次码都留空 | 默认名“用户”；生成 10 位 pathID；无二次码；凭据卡显示 pathID 与“未设置” |
| 5 | 新增管理员，手填 pathID 与二次码 | 创建成功；凭据卡显示两项；新管理员可登录并打开管理抽屉 |
| 6 | 手填重复 pathID | 409；不创建目录；列表不变 |
| 7 | 手填非法 pathID / 51 字名称 | 400；表单显示字段错误；不落盘 |
| 8 | 改他人名称/类型 | 列表更新；被降级者下一次 admin 请求 403 |
| 9 | 改自己类型 | 409“不能修改自己的类型”；类型选择禁用 |
| 10 | 删除自己 | 409；按钮禁用；列表不变 |
| 11 | 删除有 2 个页面的用户 | 账号目录、2 个页面目录、页面内元件目录都删除；200 |
| 12 | 删除时某页目录已缺失 | 200 + warnings；账号已删；不因缺页失败 |
| 13 | 账号目录删除失败 | 500；页面与元件不清理；列表保留 |
| 14 | 重置他人二次码（随机） | 凭据卡一次性显示新码；旧码 401；新码可登录 |
| 15 | 重置他人二次码（清除） | 200 + `cleared:true`；该用户只需 pathID 登录 |
| 16 | 重置自己二次码 | 409；提示去路由设置 |
| 17 | 创建后再次编辑该用户 | 不回显二次码；pathID 只读；无“查看当前码”入口 |
| 18 | 公开 `updateUser` 提交 name/type/pathID | 400；提交 style/options 成功 |
| 19 | 旧 `overCancelUser` 路径 | 404 |
| 20 | 普通删页 / `initPages` 重置 | 页面内元件目录一并删除，无新增孤儿 |
| 21 | 管理员改自己名称 | 抽屉与 `dataStore.user` 同步；刷新后仍是新名称 |
| 22 | 凭据卡关闭后重新打开编辑 | 不显示旧二次码；无 localStorage/URL 残留 |
| 23 | 390px / 暗色主题 | 两行列表不溢出；按钮可点；文字可读 |
| 24 | 凭据卡点击“复制登录链接” | 剪贴板为当前 origin+pathname，仅含 pathid/secondcode；无二次码时只含 pathid；打开链接直接登录 |

## 14. 测试计划

- **store 单测**（新增 `tests/users.test.ts`，临时 `DATA_DIR`）：
  - 创建默认值、自定义 name/pathID/secondCode、pathID 冲突、非法 pathID、名称边界（1/50/51）。
  - `userList` 含 pathID、不含 secondCode、admin 优先且排序稳定。
  - 改名称/类型；改自己类型 409；删自己 409；重置自己 409。
  - 重置随机/手填/清除；旧码 `verifyUser` 失败、新码成功；清除后无码可登录。
  - 删除用户级联：页面目录、元件目录都消失；缺页给 warning；账号删除失败不清理页面（可用只读目录/权限模拟，失败则记录手工验证）。
  - 最后管理员：`countAdmins()` 在删除/降级后至少为 1；自保护优先于最后管理员提示。
- **页面 store 单测**（更新 `tests/pages.test.ts`）：
  - `deletePage` 删除页面内元件目录并清 pageCache；返回 warnings。
  - 缺页仍返回错误；重复删除报错。
- **安全回归**（更新 `scripts/security-check.mjs`）：
  - 旧 createUser 响应从 `data.type/pathID/secondCode` 改为 `data.user.*` + `data.secondCode`。
  - 普通用户 createUser 期望从 401 改为 403。
  - 新增：未认证 `userList` 401；普通用户 `userList` 403；管理员 `userList` 200 且无 `secondCode` 字段、有 `pathID`；管理员自删/自降级 409。
  - 保留既有页面归属、上传、未认证检查。
- **手工/接口**：
  - 管理员创建带码用户 -> 退出 -> 用新 pathID/码登录 -> 看到默认页。
  - 重置他人码 -> 对方下一次请求 401 -> 刷新后用新码登录。
  - 删除有页面/元件的用户 -> 检查 `DATA_DIR/users`、`pages`、`items` 无残留。
  - 普通用户无入口；直接 curl admin 端点 403。
- **门禁**：`pnpm type-check && pnpm test && pnpm build && node scripts/security-check.mjs`（或 `pnpm verify`）。

## 15. 实施顺序

1. **类型与 API 定义**：`AdminUserItem`；`common/apis/user.ts` 新键/响应；`common/apis/page.ts` warnings。
2. **用户 store**：`UserStoreError`、`toAdminUserItem`、`getUserByUUID`、`countAdmins`、`assertCanMutateUser`、`createUser` 扩展、`adminUpdateUser`、`adminResetUserSecondCode`、`deleteUser` 级联、`removeUserDirectory`、`getUserList`。
3. **页面 store**：`removeItemDir`、`deletePage` 级联、`deletePagesForUser`；更新 `deletePageItemGroup`/`deletePageItem` 复用。
4. **路由**：`requireAdmin`、五个 admin handler、`updateUser` 白名单、删除 `overCancelUser`、页面删除 warnings。
5. **测试与安全脚本**：新增/更新 store 测试、`security-check.mjs`；先让后端在无 UI 下通过。
6. **前端状态**：`userAdmin` store。
7. **前端组件**：`UserCredentialModal` -> `UserResetModal` -> `UserEditModal` -> `UserManagerDrawer` -> `ToolBar` 接线。
8. **收口**：空/错/403/loading/busy、复制降级、390px/暗色、验收表逐条。
9. **文档与票**：规格已在 `docs/specs/multi-user-admin.md`；实现完成后把结果回填实现票与地图 #12。

后端 1–5 可独立验收；前端 6–8 依赖后端契约。除 8 的视觉收口外，6–7 可在后端完成后并行推进。

## 16. 兼容与迁移

- 无数据迁移：`user.jsonc` / `page.jsonc` 字段不变；旧用户缺少 `name` 时列表回退默认名，不回写。
- `overCancelUser` 无仓内前端调用；移除后旧 API 404。外部脚本若依赖，需改用 `deleteUser`（admin）或自行迁移。
- `createUser` 响应形状变化：仓内唯一消费者是 `scripts/security-check.mjs`，随实现同步更新；当前前端没有调用。
- `userList` 现在返回 pathID（管理端需要），不再返回 secondCode；当前前端没有调用。
- 公开 `updateUser` 收窄：当前前端没有调用；页面 API 直接走 store，不受影响。
- `deletePage` 响应新增可选 warnings：向后兼容；前端忽略也不出错。
- 删除用户从“只删账号目录”改为“级联清理”；这是行为变更，符合 #13 决策。
- 管理端 pathID 不可改；管理员本人仍可通过 RouterModal 改自己的 pathID（现有 admin-only 自助行为）。两者不冲突。
- secondCode 仍明文存储；哈希化与迁移不在本 effort，另开安全 effort。
- 单实例前提：PM2 `instances:1`；多实例需文件锁，本 effort 不实现。
- 现有登录流程、`getUser` 首启建管理员、`editUserPathID` 自助行为保持不变。

## 17. 已定默认

| 原模糊项 | 决定 | 理由 |
| --- | --- | --- |
| 入口位置与图标 | 工具栏第一格；`People20Regular`；仅 admin 渲染 | 用户确认“第一格 + 双人图标”；隐藏不占位避免普通用户看到空按钮 |
| 表单形态 | A：抽屉列表 + 居中弹窗表单/凭据 | 复用 PageEditModal 模式；移动端不丢列表上下文 |
| 列表密度 | 两行式：名称/角色 + pathID/日期/页数 | 管理需要同时看身份与规模；390px 可容纳 |
| 重置二次码默认 | 随机生成；另可手填/清除 | 随机最省事；手填兼容外部约定；清除用于取消口令 |
| 删除确认 | 显示页面数 + 通用警告；不要求输入名称/勾选 | 页面数让管理员感知影响；额外输入增加操作成本 |
| 凭据交付 | 一次性卡片 + 单行复制 + 复制全部；关闭不再显示 | 二次码只写不读；复制全部减少漏抄 |
| pathID 管理端可改 | 否；创建后只读 | 用户确认；pathID 是账号目录名，改名会牵动数据目录 |
| 普通用户改名称 | 否 | 用户确认；名称由管理员维护 |
| 管理员改自己类型 | 否 | 用户确认；避免误操作把自己降级 |
| 删除方式 | 硬删除 + 级联 | 用户确认；不做软删除/回收站 |
| secondCode 存储 | 本 effort 不改，仍明文 | 哈希化另开安全 effort；本 effort 只保证不回显 |

## 18. Out of scope

- secondCode 哈希存储与旧数据迁移。
- 软删除、停用、恢复、回收站、备份。
- 审计日志、批量导入/导出、邀请注册、OAuth、单点登录。
- super-admin / 只读管理员等更细角色。
- 管理员修改他人 pathID；管理员修改自己 pathID 仍走 RouterModal。
- 用户列表搜索、分页、排序 UI、头像上传。
- 普通用户自助改名、自助注册。
- 修改全局 401 自动弹登录框行为；修改登录流程。
- 多实例文件锁/并发写事务。
- 工具栏其他未实现按钮（项目设置、缓存设置）。

## 19. 参考

- 原型：`prototype/user-manager.html`（A 方案；`?v=A&open=1`）。
- 地图 #12：https://github.com/jeefyang/my-home/issues/12
- #13：https://github.com/jeefyang/my-home/issues/13
- #14：https://github.com/jeefyang/my-home/issues/14
- #15：https://github.com/jeefyang/my-home/issues/15
- #16：https://github.com/jeefyang/my-home/issues/16
- 既有规格风格：`docs/specs/custom-bottom-nav.md`。
- 既有安全笔记：`.reasonix-memory/security-hardening-2026-11.md`（只覆盖越权/口令比较，不覆盖管理端 CRUD）。
