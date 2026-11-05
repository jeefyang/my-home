# Domain 文档

工程技能在探索本仓库代码之前，应如何消费这里的领域文档。

**布局结论：single-context** —— 一个仓库共用一份根目录的 `GLOSSARY.md`，架构决定统一放 `docs/adr/`。本仓库不是多上下文（monorepo）结构，因此不建 `GLOSSARY-MAP.md`，也不建 `src/<context>/GLOSSARY.md`。

## 探索前先读这些

- **`GLOSSARY.md`**（仓库根目录）
- **`docs/adr/`**：只读与当前要动的区域相关的 ADR

如果这些文件还不存在，**静默跳过**：不要提示缺失，也不要建议先建。`/domain-modeling` 技能（经由 `/grill-with-docs` 和 `/improve-codebase-architecture`）会在术语或决定真正定下来时按需创建。

本仓库的 `GLOSSARY.md` 与 `GLOSSARY-MAP.md` 目前都还不存在，属于「第一次真正写下词条时再建」。

## 文件结构（single-context）

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-xxx.md
│   └── 0002-yyy.md
├── docs/agents/          ← 技能配置（本文件所在处）
└── src/
```

## 使用词表里的词汇

输出里命名领域概念时（issue 标题、重构提案、假设、测试名），用 `GLOSSARY.md` 里定义的词，不要漂移到词表明确避开的同义词。

如果需要的概念还不在词表里，这是一个信号：要么你在发明项目不用的语言（重新考虑），要么存在真实缺口（记下来交给 `/domain-modeling`）。

本仓库已有的事实词汇可先参考 `CLAUDE.md` 的「关键名词」一节（user / page / item / itemGroup）。

## 与 ADR 冲突要显式指出

如果输出与已有 ADR 冲突，明确指出来，而不是悄悄覆盖：

> _与 ADR-0007（event-sourced orders）冲突，但值得重开，因为……_
