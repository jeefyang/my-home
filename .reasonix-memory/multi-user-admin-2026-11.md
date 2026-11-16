# 2026-11 多用户管理（管理员专用）

实现票 #18 / 地图 #12；规格 docs/specs/multi-user-admin.md；原型 prototype/user-manager.html。分支 feat/multi-user-admin。

## 功能
- 工具栏第一格改为 People20Regular“用户管理”，仅 dataStore.user.type === "admin" 渲染；打开底部抽屉 UserManagerDrawer。
- 列表两行：首字头像、名称、我、角色、pathID、创建日期、页面数；自己高亮；行内编辑/删除。
- 新增普通用户或管理员；管理员改他人名称/类型；改自己只能改名称；pathID 仅创建时可选填（8–20 位，留空 nanoid(10)），创建后只读。
- 重置他人二次码：随机 / 手填 / 清除；自己的二次码仍走 RouterModal。
- 硬删除 + 二次确认（显示页面数）；不变量在 store：不能删/降级/重置自己，任何删除或降级后至少一个 admin。
- 创建/重置后一次性弹 UserCredentialModal 展示 pathID + 二次码；不回显既有码，不写 store/localStorage；仅用户主动“复制登录链接”时生成带凭据 URL。

## 后端契约
- server/stores/users.ts：AdminUserItem 投影（含 pathID，无 secondCode）；createUser(type, opts)；getUserList 管理员优先 + createTime 稳定排序；getUserByUUID；countAdmins；assertCanMutateUser；adminUpdateUser；adminResetUserSecondCode；deleteUser(actorUUID,targetUUID)；removeUserDirectory。
- server/routes/userApi.ts：requireAdmin（401 未登录/凭据错，403 非 admin）；五个 admin handler；createUser 只接受 type/name/pathID/secondCode（其他字段 400）；公开 updateUser 只允许 customData/style/options；overCancelUser 移除。
- 错误码：401 未登录/凭据错误，403 非管理员，404 目标不存在，400 参数/禁改字段，409 pathID 冲突/自删/自降级/自重置换码/最后管理员，500 存储失败。
- 删除顺序：快照 pageUUIDList → 删 users/{pathID}（必须成功）→ 逐页 deletePage 删页面与元件；页面清理失败只返回 warnings，仍 200。
- server/stores/pages.ts：removeItemDir；deletePage 先删所有 itemGroup 元件再删页面；deletePagesForUser 逐页尽力清理并收集 warnings；删分组/单件复用。
- secondCode 仍是明文存储；只保证不回显，哈希化另开安全 effort。

## 前端
- src/stores/userAdmin.ts + src/utils/userAdmin.ts + tests/userAdmin.test.ts（9 个测试）。
- UserEditModal：新增/编辑共用；名称 1–50；自己类型禁用；pathID 编辑只读；二次码三态；手动码不 trim。
- UserResetModal：随机/手动/清除；手动码不 trim；清除提示只需 pathID 登录。
- UserCredentialModal：一次性展示、单项/全部复制、clipboard 失败降级 textarea + execCommand、关闭清空局部状态；新增“复制登录链接”，生成 origin+pathname?pathid=...&secondcode=...，无码时只带 pathid，link 内固定提示只发给该用户。
- UserManagerDrawer：80% 底部抽屉；skeleton/403/错误重试/空态；401 文案“登录已失效，请刷新页面重新登录”；busy 阻止关闭与操作；创建成功开凭据卡；编辑自己名称后同步 dataStore.user。

## 验证
- pnpm type-check 通过。
- pnpm test：9 文件 96/96 通过（新增登录链接 2 例）。
- pnpm build 通过；UserManagerDrawer 35.41 kB（gzip 12.63 kB）；仅有既有 pages.ts:36 direct eval 与 LoginModal path externalized 警告。
- node scripts/security-check.mjs：26/26 通过。
- 未自动验证：390px/暗色真实浏览器视觉；账号目录删除失败 500 场景只在单测模拟。

## 教训
- types/index.d.ts 是全局声明文件，不能 import type { AdminUserItem }；直接使用全局类型。
- 管理端编辑自己时若把 type 一起提交，即使值相同也会撞“不能改自己类型”的 409；前端编辑自己不要提交 type。
