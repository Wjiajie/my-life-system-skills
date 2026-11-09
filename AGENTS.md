# AGENTS.md

本仓库是一套个人 skill 集合：每个 skill 是含 `SKILL.md` 的独立目录，`sync.ps1` 把它们软链接进各宿主的用户级 skills 目录。仓库是唯一副本，改完文件后在宿主端立即可见，不需要复制。

## 结构

| 路径 | 内容 | 维护方 |
| --- | --- | --- |
| `creation/` | 内容获取、整理与表达的 skill | 本仓库 |
| `decision/` | 目标、产品与高不确定性决策的 skill | 本仓库 |
| `workflow/` | 执行与验收方法（观察—修改—测试—验证）的 skill | 本仓库 |
| `engineering/skills/` | git 子模块 [mattpocock/skills](https://github.com/mattpocock/skills)，下分 `engineering/`、`productivity/`、`misc/`、`in-progress/` 四个 bucket | 上游 |
| `tools/jev-ultrafast/` | git 子模块 [browser-use/jev-ultrafast](https://github.com/browser-use/jev-ultrafast)，只被 `browser-agents` skill 使用，不参与 skill 发现 | 上游 |
| `tools/browser-harness/` | `keep-alive.ps1`：常驻 browser-harness daemon，把 Chrome 的「Allow remote debugging?」弹窗从「每条命令一次」降为「每个 Chrome 会话最多一次」 | 本仓库 |
| `sync.ps1` | 唯一的同步入口：发现、镜像、链接、验证 | 本仓库 |

克隆后先跑 `git submodule update --init --recursive`，它会同时拉取 `engineering/skills` 与 `tools/jev-ultrafast`。只有前者缺失才会让 `sync.ps1` 报 `Skill collection is missing`；后者缺失只影响 `browser-agents` 里的 jev 路径。

## Skill 清单（48）

`调用` 列读自 `SKILL.md` 的 `disable-model-invocation`：`模型` 表示模型可以自行触发，`用户` 表示只能由人显式调用。Codex 侧是例外，见下文「宿主 frontmatter 差异」。

### creation/（7）

| skill | 用途 | 调用 |
| --- | --- | --- |
| `excalidraw-diagram` | 生成可编辑、可渲染验证的 Excalidraw 技术图与视觉论证，手绘白板可检索内置原生图标库 | 模型 |
| `hot-info-crawler` | 按自定义主题抓取最新热点信息，按来源质量筛选并增量写入 Markdown 信息库 | 模型 |
| `humanizer` | 中英文去 AI 味、润色、降重与风格改写 | 模型 |
| `knowledge-curator` | Claudesidian / Obsidian PARA vault 的知识 Wiki 编译、检索与维护 | 模型 |
| `omn-plugin-author` | 为 OMN 生成或升级可自由装载的 v4 插件包，含校验、打包与预览 | 模型 |
| `omn-template-author` | 为 OMN 生成或升级可独立导入的 v3 模板包，含校验、打包与预览 | 模型 |
| `browser-agents` | 真实浏览器任务：browser-harness 底座，多步表单或导航循环可切到仓库内 jev-ultrafast | 模型 |

### decision/（2）

| skill | 用途 | 调用 |
| --- | --- | --- |
| `ooda-decision-advisor` | 基于 OODA 循环的高不确定性战略决策引擎 | 模型 |
| `product-office-hours` | 实现前澄清用户、痛点、最小有用切片、风险与产品取舍 | 模型 |

### workflow/（1）

| skill | 用途 | 调用 |
| --- | --- | --- |
| `observe-test-verify` | 观察—修改—测试—验证闭环：缺陷定位、性能归因与真实运行验收，逐轮留可复查证据 | 模型 |

### engineering/skills/skills/engineering/（18）

| skill | 用途 | 调用 |
| --- | --- | --- |
| `ask-matt` | 路由：判断当前处境该用哪个 skill 或流程 | 用户 |
| `codebase-design` | 深模块设计词汇：接口、深化机会、接缝位置 | 模型 |
| `code-review` | 以固定基点（commit / branch / merge-base）审查改动，标准与规格两轴并行 | 模型 |
| `diagnosing-bugs` | 难 bug 与性能回退的诊断循环 | 模型 |
| `domain-modeling` | 建立与打磨领域模型：术语、`CONTEXT.md`、ADR | 模型 |
| `grill-with-docs` | 边拷问计划边产出 ADR 与术语表 | 用户 |
| `implement` | 按 spec 或 ticket 实现 | 用户 |
| `improve-codebase-architecture` | 扫描深化机会，产出 HTML 报告，再逐个拷问 | 用户 |
| `prototype` | 为回答一个设计问题写一次性原型 | 模型 |
| `research` | 用高可信一手资料调研，落成仓库内的 Markdown | 模型 |
| `resolving-merge-conflicts` | 解决进行中的 merge / rebase 冲突 | 模型 |
| `setup-matt-pocock-skills` | 首次使用前配置 issue tracker、triage 标签与领域文档布局 | 用户 |
| `tdd` | 测试先行，红绿重构 | 模型 |
| `to-spec` | 把当前对话综合成 spec 并发布到 issue tracker | 用户 |
| `to-tickets` | 把计划或 spec 拆成带阻塞边的 tracer-bullet tickets | 用户 |
| `triage` | issue 与外部 PR 的 triage 状态机与 agent brief | 用户 |
| `wayfinder` | 把超出一个会话的大工程规划成决策 ticket 地图并逐个解决 | 用户 |
| `wizard` | 生成交互式 bash 向导，带人完成只有人能做的步骤 | 模型 |

### engineering/skills/skills/productivity/（7）

| skill | 用途 | 调用 |
| --- | --- | --- |
| `grill-me` | 拷问一个计划或设计，直到它站得住 | 用户 |
| `grilling` | 拷问计划、决策或想法的通用流程 | 模型 |
| `handoff` | 把当前对话压缩成交接文档 | 用户 |
| `teach` | 在本工作区内教学新技能或概念 | 用户 |
| `to-questionnaire` | 把无法独立回答的决策变成给他人填的问卷 | 用户 |
| `wait-what` | 上一段没讲清，要求换一种方式重讲 | 用户 |
| `writing-for-agents` | 写 agent 消费的文档：skill、`AGENTS.md`、`CLAUDE.md` | 模型 |

### engineering/skills/skills/misc/（4）

上游保留但低频使用，未进入推广集合的 skill。

| skill | 用途 | 调用 |
| --- | --- | --- |
| `git-guardrails-claude-code` | 用 Claude Code hooks 拦下危险 git 命令 | 模型 |
| `migrate-to-shoehorn` | 把测试里的 `as` 断言迁移到 `@total-typescript/shoehorn` | 模型 |
| `scaffold-exercises` | 生成含章节、题目、解答、讲解的练习目录 | 模型 |
| `setup-pre-commit` | 装 Husky + lint-staged + 类型检查 + 测试的提交钩子 | 模型 |

### engineering/skills/skills/in-progress/（9）

上游的 beta 集合：公开但未随插件发布，行为可能变化。

| skill | 用途 | 调用 |
| --- | --- | --- |
| `claude-handoff` | 把当前对话交给一个立刻接手的后台 agent | 用户 |
| `implement-spec` | 按规格实现代码 | 用户 |
| `loop-me` | 针对要建的工作流反复拷问 spec | 用户 |
| `pr` | 写 PR 正文 | 模型 |
| `retro` | 对一次编码会话做复盘 | 用户 |
| `setup-ts-deep-modules` | 接入 dependency-cruiser，让每个包成为深模块 | 用户 |
| `writing-beats` | 写作·展开：把素材组织成 beats 的旅程 | 用户 |
| `writing-fragments` | 写作·探索：先挖素材碎片，不排结构 | 用户 |
| `writing-shape` | 写作·成形：逐段把素材塑成文章 | 用户 |

## 新增或修改 skill 的规则

- 目录名必须与 frontmatter 的 `name` 完全一致，且匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`（kebab-case）。不一致时 `sync.ps1` 抛 `does not match folder`。
- frontmatter 必须同时有 `name` 与 `description`；文件必须是 UTF-8 **无 BOM**，首行就是 `---`。
- 四个集合之间不能有同名 skill，`sync.ps1` 会抛 `Duplicate skill names`。
- 只能由人调用的 skill 写 `disable-model-invocation: true`。不要写 legacy camelCase 键（`disableModelInvocation`、`modelInvocable`、`userInvocable`）：DeepSeek Harness 遇到它们会整条忽略该 skill。
- `engineering/skills/` 下的文件归上游：新增、重命名、删除 skill，或改动它的 `README.md`、`.claude-plugin/plugin.json` 之前，先读 `engineering/skills/CLAUDE.md` 的 bucket 与 docs 规则；本仓库只做链接，不改子模块内容。
- 新增 skill 后重跑对应宿主的 `sync.ps1`，不要手工复制目录。

## 链接到各宿主

三个宿主共用 `sync.ps1`，差别只在目标目录和 frontmatter 处理。每条命令结束时会逐个验证链接能解析到 `SKILL.md`，输出 `... skill sync complete` 即成功；任一项验证失败脚本会抛错并以非零码退出。

### Codex

```powershell
.\sync.ps1                  # 增量：补新 skill，清掉指向本仓库但已失效的旧链接
.\sync.ps1 -CleanPersonal   # 先清空 ~/.codex/skills 里的个人 skill，真实目录备份到 skill-backups/<时间戳>/
```

- 目标目录：`$CODEX_HOME/skills`，未设置 `CODEX_HOME` 时为 `~/.codex/skills`。
- 对 24 个 user-invoked skill，在 `.codex-generated/skills/` 生成剥掉 `disable-model-invocation` 的文本镜像，链接指向镜像而非子模块，上游子模块保持干净。该目录已 gitignore，可随时重建，不要手工编辑。
- 保留 `.system`、`codex-primary-runtime` 等宿主基础设施目录，不动 `~/.codex/plugins`。
- `-CleanPersonal` 同时清理 `~/.agents/skills`（Codex 也会扫描它），并把 `.agents/.skill-lock.json` 备份后重置为空。

### DeepSeek Harness

```powershell
.\sync.ps1 -Platform DeepSeekHarness
```

- 目标目录：`$DSH_HOME/skills`，未设置 `DSH_HOME` 时为 `~/.dsh/skills`，脚本会按需创建。
- 与 WorkBuddy 一致：不生成 `.codex-generated` 镜像，链接直接指向 `creation/`、`decision/`、`workflow/` 和上游子模块的原始目录，`disable-model-invocation` 原样保留。
- Harness 读取 skill 的根目录（rank 高者胜出）：项目级 `<repo>/.dsh/skills`、`<repo>/.agents/skills`；用户级 `~/.dsh/skills`、`~/.agents/skills`。它跟随目录符号链接，所以链接进来的 skill 与真实目录等价，新会话的 skill 列表即可见。
- 这些链接放在 `~/.dsh/skills`，不要放 `~/.agents/skills`：`sync.ps1 -Platform Codex -CleanPersonal` 会清掉后者的个人 skill。

### WorkBuddy

```powershell
.\sync.ps1 -Platform WorkBuddy
```

- 目标目录：`~/.workbuddy/skills`；不动 `~/.codex`，也不扫描或清理 `~/.agents`。
- WorkBuddy 与 Claude Code 使用同一套 frontmatter，`disable-model-invocation` 与 `argument-hint` 都保留原样，user-invoked 语义得以保持。

### 参数

| 参数 | 作用 |
| --- | --- |
| `-Platform Codex \| WorkBuddy \| DeepSeekHarness` | 选宿主，默认 `Codex` |
| `-WhatIf` | 预演，只打印将要执行的操作，不改文件系统 |
| `-CleanPersonal` | 先清理目标目录里的个人 skill，真实目录备份到 `skill-backups/<时间戳>/` |
| `-Force` | 删除并重建已存在的链接，可用于把早期 Junction 升级成真符号链接 |
| `-LinkMode Auto \| SymbolicLink \| Junction` | 强制链接类型，默认 `Auto`（先符号链接，失败回退 Junction） |
| `-SkillsDirectory <path>` | 覆盖目标目录，路径最后一段必须是 `skills`，否则脚本拒绝执行 |

## 宿主 frontmatter 差异

| 键 | Codex | WorkBuddy | DeepSeek Harness |
| --- | --- | --- | --- |
| `name`、`description` | 必需 | 必需 | 必需，且 `name` 必须是 kebab-case |
| `disable-model-invocation` | 镜像中剥除，24 个 user-invoked skill 变成模型可调用 | 保留 | 保留，原生支持 |
| `argument-hint` | 镜像中剥除 | 保留但被忽略 | 被忽略 |
| legacy camelCase 调用键 | 不关心 | 不关心 | 整条 skill 被忽略 |
| UTF-8 BOM | frontmatter 探针报 `Malformed frontmatter` | 可解析 | 首行不是 `---`，整条 skill 被忽略 |

## 改 `sync.ps1` 前必读

- 读文本一律用 `[IO.File]::ReadAllText`，不要用 `Get-Content -Raw`：Windows PowerShell 5.1 会按 ANSI 代码页解码无 BOM 的 UTF-8 文件，中文 frontmatter 被打乱后会误报 `Malformed frontmatter`，镜像重写还会把内容写成乱码。
- 建链接走 P/Invoke `CreateSymbolicLinkW` 并带 `SYMBOLIC_LINK_FLAG_ALLOW_UNPRIVILEGED_CREATE`，非提权也能建出真符号链接；被系统拒绝时回退 Junction。
- 删链接用 `[System.IO.Directory]::Delete`，只摘重解析点，不跟随、不删除目标目录。
- 清理时的保护名单：Codex 是 `.system`、`codex-primary-runtime`，DeepSeek Harness 是 `.system`，WorkBuddy 为空。
- 所有删除与移动都包在 `ShouldProcess` 里，所以 `-WhatIf` 是安全预演；新增破坏性操作时保持这一点。

## 验证

改完 skill 或脚本后，三个宿主各预演一次，都应以 `skill sync complete` 结束，且 `discovered` 等于仓库里实际的 skill 目录数：

```powershell
.\sync.ps1 -Platform Codex -WhatIf
.\sync.ps1 -Platform WorkBuddy -WhatIf
.\sync.ps1 -Platform DeepSeekHarness -WhatIf
```

真链接之后额外确认目标目录里每个条目都能解析到 `SKILL.md`：

```powershell
Get-ChildItem -Force (Join-Path $env:USERPROFILE ".dsh/skills") | ForEach-Object { "{0} -> {1}" -f $_.Name, (Test-Path (Join-Path $_.FullName "SKILL.md")) }
```
