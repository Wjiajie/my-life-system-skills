# my-life-system-skills

面向 Codex、WorkBuddy 与 DeepSeek Harness 的个人 skill 集合。仓库按用途分成四组，`sync.ps1` 把每个含 `SKILL.md` 的目录链接进宿主的用户级 skills 目录。完整的 skill 清单、新增规则与宿主差异见 [AGENTS.md](AGENTS.md)。

## 模块

### `creation/`

内容获取、整理与表达：

- `excalidraw-diagram`：生成可编辑、可渲染验证的 Excalidraw 技术图与视觉论证。
- `hot-info-crawler`：按主题聚合热点信息，增量写入 Markdown，并可衔接 Obsidian / 博客。
- `humanizer`：中英文文本去 AI 味、润色与风格改写。
- `knowledge-curator`：为 Claudesidian / Obsidian PARA vault 编译、检索与维护知识 Wiki。
- `omn-plugin-author`：为 OMN 创建或升级 v4 插件包（前置指引、后置处理、提示词、结果视图、Action）。
- `omn-template-author`：为 OMN 创建或升级 v3 模板包（初始化数据、创作提示词、HTML/CSS/JS 风格）。
- `browser-agents`：用真实浏览器做自动化与抓取，底座是 browser-harness，多步表单/导航可选仓库内固化的 jev-ultrafast。

### `decision/`

目标、产品与高不确定性决策：

- `ooda-decision-advisor`：按 Observe / Orient / Decide / Act 组织战略判断和最小行动闭环。
- `product-office-hours`：在实现前澄清用户、痛点、最小有用切片、风险与产品取舍。

### `workflow/`

执行与验收方法（本仓库自维护；上游工程流程在 `engineering/`）：

- `observe-test-verify`：用「观察—修改—测试—验证」闭环定位缺陷、优化性能或验收真实行为，逐轮记录可复查证据。

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

克隆后先拉取两个子模块（`engineering/skills` 与 `tools/jev-ultrafast`）：

```powershell
git submodule update --init --recursive
```

## 安装

三个宿主共用同一个脚本。脚本做了什么、各宿主的 frontmatter 差异、以及改动子模块时的上游规则，都在 [AGENTS.md](AGENTS.md)。

```powershell
.\sync.ps1                             # Codex（默认平台），目标 ~/.codex/skills
.\sync.ps1 -Platform WorkBuddy         # 目标 ~/.workbuddy/skills
.\sync.ps1 -Platform DeepSeekHarness   # 目标 $DSH_HOME/skills，默认 ~/.dsh/skills
```

- 不加参数是增量同步：补齐新 skills，清掉指向本仓库但已失效的旧链接。
- 加 `-CleanPersonal` 会先清理目标目录里的个人 skills，真实目录备份到 `skill-backups/<时间戳>/`。
- `-WhatIf` 预演，不改文件系统。运行结束后脚本会逐个验证链接能解析到 `SKILL.md`，输出 `skill sync complete` 即成功。

完成后，新 skills 会在下一轮对话或重新加载宿主后进入可用列表。

## 关于符号链接

脚本优先创建目录符号链接。PowerShell 5.1 的 `New-Item -ItemType SymbolicLink` 不会传递 `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE`，因此即使开启了 Windows 开发者模式也仍要求管理员权限；脚本改为直接 P/Invoke `CreateSymbolicLinkW` 并带上该标志位，非提权也能建出真符号链接，只有系统仍然拒绝时才回退到 Junction。

删除链接时走 `[System.IO.Directory]::Delete`，不会跟随重解析点，因此只摘链接、不动目标目录。

Windows 上符号链接的 target 会以 `\\?\C:\...` 形式存储，这是 `mklink` 同样会产生的正常结果。
