# my-life-system-skills

面向 Codex 的个人 skill 集合。仓库按用途分成三组，并通过一个同步脚本把每个包含 `SKILL.md` 的目录链接到用户级 Codex skills 目录。

## 模块

### `creation/`

内容获取、整理与表达：

- `excalidraw-diagram`：生成可编辑、可渲染验证的 Excalidraw 技术图与视觉论证。
- `hot-info-crawler`：按主题聚合热点信息，增量写入 Markdown，并可衔接 Obsidian / 博客。
- `humanizer`：中英文文本去 AI 味、润色与风格改写。
- `knowledge-curator`：为 Claudesidian / Obsidian PARA vault 编译、检索与维护知识 Wiki。

### `decision/`

目标、产品与高不确定性决策：

- `goal-loop`：目标定义、计划、执行、验证、续跑与不稳定上下文交接。
- `ooda-decision-advisor`：按 Observe / Orient / Decide / Act 组织战略判断和最小行动闭环。
- `product-office-hours`：在实现前澄清用户、痛点、最小有用切片、风险与产品取舍。

### `engineering/`

`engineering/skills` 固定为 [mattpocock/skills](https://github.com/mattpocock/skills) 子模块，提供完整的设计、开发与工程协作流程。

推荐的稳定能力包括：

- 需求澄清与路由：`ask-matt`、`grill-with-docs`、`triage`。
- 规格与拆解：`to-spec`、`to-tickets`、`wayfinder`。
- 设计与建模：`domain-modeling`、`codebase-design`、`improve-codebase-architecture`、`prototype`。
- 实现与质量：`implement`、`tdd`、`diagnosing-bugs`、`code-review`、`resolving-merge-conflicts`。
- 研究与人工步骤：`research`、`wizard`。
- 通用生产力：`grill-me`、`grilling`、`handoff`、`teach`、`to-questionnaire`、`wait-what`、`writing-for-agents`。

同步脚本也会安装上游的 `misc/` 与 `in-progress/` skills。它们包含平台特定或实验性能力，使用前应查看各自 `SKILL.md` 的边界。

## 初始化仓库

克隆后先拉取 engineering 子模块：

```powershell
git submodule update --init --recursive
```

## 安装到 Codex

在 PowerShell 中运行：

```powershell
.\sync.ps1 -CleanPersonal
```

该命令会：

1. 清理 `~/.codex/skills` 与 Codex 同样会扫描的 `~/.agents/skills` 中现有个人 skills；真实目录会移到各自的 `skill-backups/<时间戳>/`，旧链接直接移除，`.agents/.skill-lock.json` 会备份后重置为空。
2. 保留 Codex 官方 `.system` skills，不修改 `~/.codex/plugins`，保留插件目标链接，并保留没有 `SKILL.md` 的 Codex 基础设施目录。
3. 自动发现 `creation/`、`decision/`、`engineering/skills/skills/` 下的所有 skills。
4. 优先创建目录符号链接；若 Windows 当前权限不允许，则回退为无需管理员权限的 Junction。
5. 对 engineering 中含 Claude 专用 frontmatter 的 user-invoked skills，在 `.codex-generated/` 生成忽略版本控制的 Codex 兼容镜像；原上游子模块保持干净，`agents/openai.yaml` 的显式调用策略保持不变。
6. 验证每个链接都能解析到对应的 `SKILL.md`。

只做增量同步、不清理其他个人 skills：

```powershell
.\sync.ps1
```

预演而不修改文件系统：

```powershell
.\sync.ps1 -CleanPersonal -WhatIf
```

可用 `-LinkMode SymbolicLink` 或 `-LinkMode Junction` 强制链接类型；默认 `Auto`。

`link_skills.ps1` 是兼容旧用法的入口，参数会转发给 `sync.ps1`。

完成后，新 skills 会在下一轮对话或重新加载 Codex 后进入可用列表。
