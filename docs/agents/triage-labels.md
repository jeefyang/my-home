# Triage 标签

技能用五个固定的 triage 角色说话。本文件把角色映射到本仓库 issue tracker 里实际使用的标签字符串。

| 角色（技能里的叫法） | 本仓库的标签 | 含义 |
| -------------------- | ------------ | ---- |
| `needs-triage`  | `needs-triage`  | 维护者需要先评估这条 issue |
| `needs-info`    | `needs-info`    | 等报告人补充信息 |
| `ready-for-agent` | `ready-for-agent` | 已充分描述，可以交给 AFK agent 直接做 |
| `ready-for-human` | `ready-for-human` | 需要人来实现 |
| `wontfix`       | `wontfix`       | 不做 |

技能提到某个角色时（例如「apply the AFK-ready triage label」），就用表里对应的标签字符串。
要换词汇，改「本仓库的标签」这一列即可。

## Wayfinder 标签（非 triage 角色）

`/wayfinder` 另用一套类型标签，与上面的五角色互不冲突，也不要互相替代：

| 标签 | 用途 |
| ---- | ---- |
| `wayfinder:map` | 探索地图（一条 issue 承载 Notes / Decisions-so-far / Fog） |
| `wayfinder:research` | 地图下的调研票 |
| `wayfinder:prototype` | 地图下的原型票 |
| `wayfinder:grilling` | 地图下的追问票 |
| `wayfinder:task` | 地图下的实施票 |
