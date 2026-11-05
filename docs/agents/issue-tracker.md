# Issue tracker: GitHub

本仓库的 issue 与 spec 都放在 GitHub Issues（`jeefyang/my-home`），一律用 `gh` CLI 操作。

在仓库目录内运行时 `gh` 会自动推断仓库；跨仓库或首次创建前先确认目标：
`gh repo view --json nameWithOwner`。

## 常用操作

- **创建**：`gh issue create --title "..." --body "..."`（多行正文用 heredoc）
- **读取**：`gh issue view <number> --json number,title,body,labels,comments`
- **列表**：`gh issue list --state open --json number,title,body,labels --jq '[.[] | {number, title, body, labels: [.labels[].name]}]'`，配合 `--label` / `--state` 过滤
- **设为子 issue**：`gh issue create --parent <parent> ...`，或 `gh issue edit <parent> --add-sub-issue <child>`（`gh` 2.94+）。老版本用
  `gh api --method POST repos/<owner>/<repo>/issues/<parent>/sub_issues -F sub_issue_id=<child-db-id>`；不支持子 issue 时，在子 issue 正文顶部写 `Part of #<parent>`。
- **阻塞关系**：优先用 GitHub 原生依赖，`gh issue create --blocked-by <n>,<n>` 或 `gh issue edit <child> --add-blocked-by <blocker>`（`gh` 2.94+）。老版本用
  `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`（`<blocker-db-id>` 是阻塞方的数字 database id：`gh api repos/<owner>/<repo>/issues/<n> --jq .id`，不是 `#number`，也不是 `node_id`）。无法使用依赖时，在子 issue 正文顶部写 `Blocked by: #<n>, #<n>`。所有阻塞方都关闭才算解除阻塞。
- **统计未关闭的阻塞方**：`gh api repos/<owner>/<repo>/issues/<n> --jq .issue_dependencies_summary.blocked_by`（0 表示可开工）；`gh issue view <n> --json blockedBy` 会连已关闭的一起列出，需要过滤：
  `--jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'`
- **评论**：`gh issue comment <number> --body "..."`
- **打标签 / 摘标签**：`gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **关闭**：先 `gh issue comment <number> --body "..."` 说明原因，再 `gh issue close <number>`。已关闭的 issue 上用 `gh issue close --comment` 会丢掉评论但退出码仍为 0。

只往用户自己的仓库提 issue，绝不往 `mattpocock/skills`（这些技能的上游）提。
fork 场景下 `gh` 可能默认指向父仓库，因此每个会话的第一次 `gh issue create` 之前，用
`gh repo view --json nameWithOwner` 确认目标是本仓库。

## Pull request 是否作为 triage 入口

**PRs as a request surface: no.**（若本仓库把外部 PR 当作需求入口，改成 `yes`；`/triage` 会读这个开关。）

设为 `yes` 时，PR 与 issue 走同一套标签和状态，命令换成 `gh pr` 系列：

- **读取 PR**：`gh pr view <number>`，再看评论 `gh pr view <number> --comments`（非 TTY 下 `--comments` 只打印评论、不含正文），diff 用 `gh pr diff <number>`
- **列出待 triage 的外部 PR**：
  `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`
- **评论 / 打标签 / 关闭**：`gh pr comment`、`gh pr edit --add-label` / `--remove-label`、`gh pr close`

GitHub 的 issue 与 PR 共用一个编号空间，裸 `#42` 可能是两者之一：先 `gh pr view 42`，失败再 `gh issue view 42`。

## 当技能要求「publish to the issue tracker」

创建一条 GitHub issue。

## 当技能要求「fetch the relevant ticket」

按上面的**读取**方式取。

## Wayfinding 操作

由 `/wayfinder` 使用。**地图（map）**是一条 issue，**子票**是它的子 issue。

- **地图**：单条 issue，打 `wayfinder:map` 标签，正文承载 Notes / Decisions-so-far / Fog。`gh issue create --label wayfinder:map`
- **子票**：作为地图的子 issue 挂上去（见上文**设为子 issue**）。不支持子 issue 时，把子票加进地图正文的任务列表，并在子票正文顶部写 `Part of #<map>`。标签用 `wayfinder:<type>`：`research` / `prototype` / `grilling` / `task`。认领后把票 assign 给执行者。
- **阻塞**：见上文**阻塞关系**
- **Frontier 查询**：列出地图下未关闭的子 issue（`gh issue list --state open`，限定为该地图的子 issue / 任务列表），剔除存在未关闭阻塞方（见**统计未关闭的阻塞方**，或正文里 `Blocked by` 行中仍打开的 issue）或已有 assignee 的，地图顺序里的第一条即下一条。
- **认领**：`gh issue edit <n> --add-assignee @me`，这是本会话的第一次写操作。
- **解决**：`gh issue comment <n> --body "<结论>"`，然后 `gh issue close <n>`，再把上下文指针（要点 + 链接）追加到地图的 Decisions-so-far。
