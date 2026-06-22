---
name: hot-info-crawler
description: 专门用于抓取用户自定义主题的最新、最热门信息并写入本地 Markdown 信息库（Obsidian + 个人博客）的技能。当用户明确要求"抓取当前热点信息"、"获取最新趋势"、"更新信息库"、"AI 热点"、"AI 资讯"、"AI 日报"、"最近 AI 圈"或类似请求时启动该技能。AI 工具 / agent 主题统一使用 aihot.virxact.com 的 **AI HOT API**（见 `references/aihot_skill.md`）获取；LLM 理论主要从 HuggingFace Papers 抓取；具身智能只从 X.com 抓取；思维模型、家庭教育、投资管理等软技能主题通过 `/ego-browser` skill（`ego-browser nodejs <<'EOF' ... EOF` heredoc 驱动）打开 YouTube / Reddit / X.com / 即刻等平台页面，YouTube 视频再用 `/media/youtube-content` skill 拉字幕做深度总结。ego-browser 不可用、页面反爬或加载失败时，才允许回退到 JSON/HTTP 抓取，并必须在报告备注中说明。支持的主题和信息源均可在用户配置文件中自定义。

**最终交付物规范（必读，硬约束）**：
1. **中文优先（字段级规则）**：所有交付物里的"中文输出"必须按字段区别对待——
   - **必须中文**（禁止英文）：摘要、入选理由、核心观点、章节描述、表格的"摘要"列、表格的"分类"列、表格的"时间"列（按 YYYY-MM-DD HH:MM 中文格式）、播客要点提炼、引用块释义
   - **可保留原文**：标题/链接文本本身（作为事实呈现，链接到原始 URL）、专有名词（公司/人名/产品/模型/库名）、技术术语与行业缩写（LLM/AGI/RLHF/RAG/GPU/CUDA/embedding/agent）、代码片段/命令行/配置示例、URL
   - **翻译策略**：所有英文源（AI HOT API 返回条目、X.com 帖子、Reddit 帖子与热门评论、HuggingFace 论文摘要、YouTube 简介、Podcast 转录文本、即刻英文内容、其他英文站点）统一走 `references/search_workflow.md` 的"英文原贴正文翻译策略（混合策略）"——保留专有名词 + 意译自然语言论述 + 首译术语给"中文译名（English original）"
   - **英文原贴作为引用块附在条目尾部时**：保留原文不翻译，但**前面的中文摘要必须覆盖原贴核心内容**，不能"摘要 = 一句标题翻译"
2. **落盘前 humanize**：抓取阶段保持机器摘要便于质量筛选；**仅在落盘到 Obsidian / 博客前**，用 `humanizer` skill 跑一次最终稿，剥离 AI 味、补足人味。落盘的是 humanize 后的版本，中间产物不进 Obsidian / 博客。**注意：humanizer 负责"润色中文"和"剥 AI 味"，不负责翻译补漏——所有翻译必须在 `/tmp/<topic>-block.md` 阶段就完成，humanizer 不会把英文条目自动翻成中文**
3. **去流水账**：最终文档只保留信息本身 + 数据源标注。ego-browser 调用次数、跳过的数据源、retry 次数、错误日志、子代理内部状态等处理痕迹**一律不进最终文档**。如需排查，过程日志写到 `/tmp/hot-info-YYYY-MM-DD.log` 即可。
4. **🛑 抓取完必须清理 ego-browser task space（硬约束）**：每个抓取轮次（主代理 + 任何子代理）使用的 task space **必须**在 heredoc 末尾 `completeTaskSpace(name, { keep: false })` 关闭，**不允许** "抓完就退出让 space 留着"。漏关一个 space 就会持续占用 Chromium 进程和内存，累积多了会拖慢甚至崩溃 ego lite。**这是硬性要求，不是建议**——具体执行见下文"清理 task space"章节和 `scripts/cleanup-ego-spaces.sh`。
5. **🛑 摘要完整输出，禁止任何形式截断（硬约束）**：所有"摘要"字段——表格的"摘要"列、列表式条目摘要、播客摘要、章节描述、引用释义、入选理由——**必须完整输出**，**禁止**用 `…` / `...` / `[truncated]` / `（后略）` / `etc.` 等任何省略号/截断标记强行截断。原贴文多少字、API 摘要多长，就输出多少字，可以长但不能短。`references/search_workflow.md` 步骤 3 旧的"50-100 字"规则已作废；表格的"摘要"列允许横跨多行、占多行内容，**禁止为了"看起来短"而截断**。**没有"摘要过长需要省略"这种场景——长摘要的解决方案是把它写成多行段落或拆分到多个引用块，不是截断**。
---

# Hot Info Crawler 技能指南

此技能使用结构化 API、订阅 Feed 与浏览器自动化工具执行热点检索任务，支持按主题选择最合适的信息源。AI 工具 / agent 走 AI HOT API；LLM 理论走 HuggingFace Papers；具身智能走 X.com；软技能类（思维模型 / 家庭教育 / 投资管理）走 YouTube / Reddit / X.com / 即刻页面抓取，YouTube 视频用 `/media/youtube-content` skill 拉字幕做深度总结。Hermes 环境中所有需要浏览器的页面抓取统一通过 `/ego-browser` skill（`ego-browser nodejs <<'EOF' ... EOF` heredoc 驱动）打开目标站点页面，因为它能复用用户 ego-browser 的登录态和真实 Chromium 页面。检索结果**增量写入**本地 Markdown 文件，防止中断丢失。

> 首次使用？请先阅读 `references/install.md` 完成依赖安装与配置。

## 任务触发

### 抓取热点信息

当接收到"抓取热点信息"的指令时：

1. **初始化**：读取配置文件
   - 读取 `~/.hot-info-crawler/config.json` 获取 `outputDir`
   - 读取 `~/.hot-info-crawler/user_config.md` 获取主题、信息源开关、Feed 源、关注账号
   - 如任一配置缺失，执行 onboarding 流程（详见 `references/install.md`）
   - 在 `outputDir` 下创建/打开日期文件 `hot-info-{YYYY-MM-DD}.md`
   - 如文件已存在，扫描已完成的板块标记，从断点继续
2. **执行**：依次检索各板块，**每完成一个板块立即追加写入文件**
   - AI 工具 / agent：读取 `references/aihot_skill.md`，使用 AI HOT API 获取并按质量规则筛选
   - LLM 理论：使用 `/ego-browser` 打开 `https://huggingface.co/papers` 日期页 / 搜索页抓取论文条目
   - 具身智能：使用 `/ego-browser` 打开 X.com 搜索页或相关账号主页
   - 软技能类：使用 `/ego-browser` 抓取配置平台页面；YouTube 视频结果再走 `/media/youtube-content` skill 拉字幕做深度总结
   - 主题 ≥ 3 个时，**优先使用多子代理并行执行**（见下文"并行执行策略"）
3. **完成**：写入完成标记
   - 通知用户文件路径
   - **【落盘前 humanize】**用 `humanizer` skill 处理当日报告初稿（剥离 AI 味、补足人味），得到最终稿
     - 中文输出检查：所有英文原始信息必须翻译/意译成中文，标题与摘要用中文
     - 去流水账：ego-browser 调用次数、跳过数据源、retry 次数、子代理内部状态、错误日志等处理痕迹一律从最终文档中删除；如需保留请写到 `/tmp/hot-info-YYYY-MM-DD.log` 单独存档
   - 把 humanize 后的最终稿写入 Obsidian 对应目录 + 个人博客目录
   - 触发 Obsidian 同步（详见 `references/output_config.md`）
   - 触发博客发布（若已配置 `blogPublish`）

### 重置配置

当接收到"重置热点抓取配置"、"重新配置热点信息"或类似重置指令时：

1. **确认**：告知用户即将清除所有已有配置，询问是否继续
2. **清除**：删除 `~/.hot-info-crawler/user_config.md` 和 `~/.hot-info-crawler/config.json`
3. **重新初始化**：执行完整的 onboarding 流程（详见 `references/install.md`）
   - 步骤 1：配置输出路径 → 写入 `config.json`
   - 步骤 2：从模板创建 `user_config.md` → 引导用户自定义主题、信息源、账号
4. **确认**：展示最终配置摘要

## 参考文档

详细的信息源配置和执行流程已拆分到 `references/` 目录：

| 文档 | 内容 |
|------|------|
| `references/install.md` | 依赖安装、工具配置与用户配置初始化（首次使用必读） |
| `references/user_config_template.md` | 用户配置文件模板与字段说明 |
| `references/output_config.md` | 输出路径配置、增量写入与断点续跑 |
| `references/follow_builders_feed.md` | Follow-Builders Feed 数据源配置与输出格式 |
| `references/aihot_skill.md` | AI HOT API 使用说明；AI 工具 / agent 主题统一使用此文档流程 |
| `references/platforms.md` | 平台 URL 模板与使用说明（X / HuggingFace / YouTube / Reddit / 即刻） |
| `references/themes.md` | 平台分配规则（类型与平台的通用映射逻辑） |
| `references/search_workflow.md` | 完整的检索执行流程（初始化 + Feed + 主题检索 + 账号追踪） |

## 用户配置

所有用户特定配置存储在 `~/.hot-info-crawler/user_config.md`，包括：

- **信息源开关**：启用/禁用 HuggingFace、X.com、YouTube、Reddit、即刻等平台
- **Feed 数据源**：可选的结构化数据源（如 Follow Builders）
- **主题列表**：自定义检索主题、关键词和平台分配
- **关注的 X 账号**：额外追踪的 X 账号列表

首次运行时，skill 会自动从模板创建配置文件并引导用户自定义。详见 `references/user_config_template.md`。

## 快速概览

### 浏览器工具回退策略

AI 工具 / agent 走 AI HOT API（`references/aihot_skill.md`）；LLM 理论走 HuggingFace Papers；具身智能走 X.com；软技能类（思维模型 / 家庭教育 / 投资管理）统一通过 `/ego-browser` skill（`ego-browser nodejs <<'EOF' ... EOF` heredoc 驱动）打开目标站点页面（详见 `references/search_workflow.md`），YouTube 视频再用 `/media/youtube-content` skill 拉字幕做深度总结：

| 优先级 | 工具 | 适用条件 | 特点 |
|--------|------|----------|------|
| 🥇 Hermes 唯一浏览器 | `/ego-browser` skill（heredoc 驱动） | Hermes 环境中所有需要浏览器的页面抓取 | 复用 ego-browser 登录态、独立 task space、`snapshotText` / `js` / `captureScreenshot` / `scroll` / `click` 等全套 API |
| 兜底 | `read_url_content` | ego-browser 不可用、页面反爬或页面加载失败时 | 最轻量，纯 HTTP 抓取，无 JS 渲染；使用后必须在报告备注中说明 |

### 检索策略

平台分配由用户配置中主题的 `类型` 字段决定（详见 `references/themes.md`）：

- **AI 工具 / agent**主题 → AI HOT API（`references/aihot_skill.md`），质量筛选后每个板块输出 10-15 条
- **LLM 理论**主题 → HuggingFace Papers（论文），AI HOT API 作为补充
- **具身智能**主题 → X.com（用 `/ego-browser` 抓搜索页/账号主页）
- **非 AI 技术类**主题 → 默认 X.com + Reddit / 其他配置平台
- **软技能类**主题 → 默认 YouTube + Reddit + X.com，即刻作为中文补充源；在 Hermes 中必须先用 `/ego-browser` skill 打开配置平台页面抓取，不能直接把 Reddit JSON / 搜索 API 当作首选路径。YouTube 视频结果再用 `/media/youtube-content` skill 拉字幕做深度总结
- 用户可在配置中自由覆盖每个主题的优先平台

### 执行要点（增量写入 + 输出净化）

每个步骤完成后**立即追加写入**日期文件。HTML 注释标记（`<!-- section:*_done -->`）**只在文件内部用于断点续跑**，**最终交付给用户前必须全部移除**——用户看到的产物只有板块标题 + 条目 + 摘要 + URL。

写入流程：

0. **【初始化】** 读取配置 → 创建/打开日期文件 → 写入文件头 `<!-- section:header_done -->`
1. **【Feed】** 拉取配置的 Feed 数据源 → 生成中文总结 → 写入文件 `<!-- section:feed_done -->`
2. **【主题检索】** 按配置逐个主题检索；AI 工具 / LLM 理论使用 AI HOT API，具身智能和非 AI / 软技能主题使用浏览器页面抓取 → 每个主题完成后写入文件 `<!-- section:theme_{ID}_done -->`
3. **【账号追踪】** 追踪配置的关注账号 → 写入文件 `<!-- section:accounts_done -->`
4. **【完成】** 写入完成标记 `<!-- section:all_done -->`
5. **【输出净化（必做）】** 交付前用 `sed -i '' '/<!-- section:/d'` 移除所有 `<!-- section:* -->` 标记；**保留**板块标题、条目、摘要、URL；**保留**真实的失败说明（如「XX 板块今日为空」「XX 数据源今日不可用」）；**移除**任何「执行过程叙述」（ego-browser 调用记录、子代理分工、抓取次数、batch 关 space 统计等）
6. **【🛑 清理 ego-browser task space（硬约束）】** **必须**在 Obsidian 同步 + 博客发布**之前**跑最终清理 heredoc（见下文"清理 ego-browser task space"章节 + `scripts/cleanup-ego-spaces.sh`）。**遗漏这一步视为任务未完成**——agent 漏关的 space 会持续占用 Chromium 进程。下次抓取累积会拖慢甚至崩溃 ego lite
7. **【Obsidian 同步】** humanize 完成后通过 `obsidian://` URI 唤起 Obsidian，配合 Remotely Save 推送
8. **【博客发布】** 若 `config.json` 含 `blogPublish` 段，则拷贝 + commit + push 到指定分支（详见 `references/output_config.md`）
9. **【humanize + 落盘】** 用 `humanizer` skill 处理最终稿（中文优先、剥 AI 味），落盘到 Obsidian + 博客

**净化原则**：

- 用户看到的是**信息产品**，不是**执行日志**——任何「怎么抓的」都不该出现在最终文件里
- 「抓不到」的失败说明保留（影响内容判断）；「抓的过程」剔除（用户不关心）
- Obsidian 同步 / 博客发布的结果可**只写一行**状态（成功路径 + 目标分支 / 远端 commit），不展开过程

### 并行执行策略

主题数 ≥ 3 时，**强烈建议使用多子代理并行抓取**，可显著缩短总耗时（典型节省 40-60%）。

**触发条件**：

- 主题数 ≥ 3 且
- 待抓取的主题中存在 2 个以上"软技能类"（X + Reddit + YouTube 三平台）或"FDE 行业"（多 X 查询）

**并行分组建议**：

- **子代理 A**（快任务）：思维模型 + 家庭教育（共用类似查询 + YouTube 字幕）
- **子代理 B**（中任务）：投资管理 + FDE 行业发展（FDE 含 7 个固定信源 curl）
- **子代理 C**（多 tab 任务）：15 个 X 关注账号（每账号 1 个 tab 最高效）
- **主代理**：串行处理 Feed / AI 工具 / LLM 理论 / 具身智能（这些是 API + 单一抓取，并行收益小）

**子代理约束**（必须在 prompt 里明确）：

- **只写 `/tmp/<topic>-block.md`**，不直接修改主文件
- 必须含 `<!-- section:theme_{ID}_done -->` 或 `<!-- section:accounts_done -->` 标记（**这些标记由主代理合并后用输出净化步骤移除**）
- 板块以 `## ` 二级标题开头
- 中文输出，保留原 URL
- **YouTube 字幕失败时**直接跳过该视频、在备注列写"字幕不可用"，不要无限重试
- **不在产物里写任何执行痕迹**：不要写「ego-browser 调用了 X 次」「读取了 Y 个 page」「某 subagent 返回了 Z 条」之类的过程叙述
- 完成后**只返回**必要的失败信息（如有）+ 抓到条数；ego-browser 调用次数、清理 task space 记录等执行细节**不要带回主上下文**——这些只对当前 subagent 自己有意义

**主代理合并**：

子代理全部返回后，主代理**顺序**追加所有 `/tmp/<topic>-block.md` 到主文件，最后写完成尾部和触发 Obsidian 同步 + 博客发布。**追加顺序按 user_config.md 主题列表的行顺序**，账号追踪永远在最后。**追加完成后立即执行输出净化步骤**（移除所有 `<!-- section:* -->` 标记 + 任何混入的执行叙述）。

### 清理 ego-browser task space（🛑 硬约束）

ego-browser 的 task space **不会自动关闭**。每次 `useOrCreateTaskSpace(name)` 都会创建一个独立 space + 多个 tab。主代理 + 子代理多轮抓取累积下来，截图里会同时存在 5-10 个 space。每个 space 占用 Chromium 进程和内存，**累积多了会拖慢甚至崩溃 ego lite**。**这是硬性要求，不是建议**。

**清理规则（缺一不可）**：

1. **每个子代理在 heredoc 最后一步必须关自己创建的 space**。每个 subagent 的 prompt 里必须明确写：
   > "在你这个 heredoc 的最后一步，**必须**执行 `await completeTaskSpace(task.id, { keep: false })` 关闭你创建的所有 task space（task 对象是 `useOrCreateTaskSpace` 的返回值）。**完成后把 task.id 列表带回主代理**，主代理会做二次清扫。"
2. **主代理在所有 block 合并 + 输出净化之后**（详见"输出净化"段），**必须**跑一次最终清理 heredoc（见下文模板）。
3. **清理范围**：`ownership === 'agent' && createdBy === 'agent'` 的所有 space。**user-owned space 不要碰**——会被跳过、浪费 round trip。
4. **失败处理**：单个 space 关闭失败不阻塞其他 space；最终 `listTaskSpaces().length === 0`（或只剩 user-owned）才视为清理完成。

**主代理最终清理 heredoc 模板**（写在输出净化之后、Obsidian 同步 + 博客发布之前；可粘贴即用）：

```bash
ego-browser nodejs <<'EOF'
// 二次清扫：列所有 agent-owned space，逐一关闭
const spaces = await listTaskSpaces()
const scratch = spaces.filter(s => s.ownership === 'agent' && s.createdBy === 'agent')
const closed = []
const skipped = []
for (const s of scratch) {
  const r = await completeTaskSpace(s.name, { keep: false })
  if (r.done) closed.push(s.name)
  else skipped.push({ name: s.name, reason: r.skipped || 'unknown' })
}
// 验证：剩余 space 数
const remaining = await listTaskSpaces()
const agentLeftover = remaining.filter(s => s.ownership === 'agent' && s.createdBy === 'agent')
cliLog(JSON.stringify({
  total_before: spaces.length,
  closed: closed.length,
  skipped: skipped,
  agent_leftover: agentLeftover.length,
  user_owned_remaining: remaining.filter(s => s.ownership === 'user').length,
}, null, 2))

// 硬约束：agent-owned 必须清零；未清零则抛错，主代理必须排查
if (agentLeftover.length > 0) {
  throw new Error(`EGO_BROWSER_CLEANUP_FAILED: ${agentLeftover.length} agent-owned space(s) leaked: ${agentLeftover.map(s => s.name).join(', ')}`)
}
EOF
```

**降级方案**：如果 `ego-browser` 不在 PATH，先 `export PATH="$HOME/.local/bin:$PATH"` 再跑；如果 shell 仍报 `command not found`，改用绝对路径 `/Users/jiajie/.local/bin/ego-browser nodejs <<'EOF' ... EOF`；如果绝对路径也不存在，直接用 `bash scripts/cleanup-ego-spaces.sh`（脚本内置同款 heredoc + 自动找 ego-browser 路径）。

**验证**：清理后 `listTaskSpaces()` 应返回 0 个 agent-owned space（或只剩 user-owned）。如果仍 > 0，**主代理必须停下来排查**（常见原因：某个子代理的 prompt 里没强制关 space、某个子代理 heredoc 中途抛错导致没执行到 `completeTaskSpace`、或 task.id 没带回来）。

**不能做**：

- ❌ agent 试图关闭整个 ego-browser 应用（无权限、也不必要）
- ❌ agent 关闭 user-owned space（被跳过 + 浪费 round trip）
- ❌ 抓取过程中累积不清理（崩溃风险）
- ❌ 跳过最终清理 heredoc 直接进 Obsidian 同步（违反硬约束）

### 子代理 prompt 模板（必用）

每次 `delegate_task` 启动子代理时，**必须**使用以下 prompt 模板（**`task.id 列表`字段不允许省略**）：

```
你是 hot-info-crawler 的子代理，负责抓取：{主题名}。

【任务】
- 抓取平台：{优先平台列表}
- 关键词：{中英文关键词}
- 输出文件：/tmp/{topic}-block.md（板块以 `## ` 开头，含 `<!-- section:theme_{ID}_done -->` 标记）
- 中文输出，保留原 URL

【🛑 硬约束：必须清理 ego-browser task space】
1. 在你的 heredoc 第一行执行：
   const task = await useOrCreateTaskSpace('hot-info-{topic}')
   cliLog('TASK_ID=' + task.id)
2. **在你这个 heredoc 的最后一步**（在 cliLog 输出完成条数之前），**必须**执行：
   await completeTaskSpace(task.id, { keep: false })
   // 不要把这一行放到 try/catch 里吞掉；失败也要 cliLog 出来
3. **返回主代理时**必须把 task.id 列表带回来（`TASK_ID=<id>` 一行），主代理会做二次清扫

【产物约束】
- 只写 /tmp/{topic}-block.md，不直接修改主文件
- 不要写任何执行痕迹（"ego-browser 调用了 X 次"等）
- YouTube 视频必须走 /media/youtube-content 拉字幕；字幕不可用时跳过 + 备注列写"字幕不可用"
- **🛑 摘要必须完整输出，禁止任何形式截断**（禁止 `…` / `...` / `[truncated]` / `（后略）`）。原贴/API/字幕多长就输出多长，可以长但不能短。**没有"摘要过长需要省略"这种场景**——长摘要是多行段落或多个引用块，**不是截断**

【返回格式】
- TASK_ID=<task.id>
- 抓到条数：N
- 失败说明：（如 "X.com 搜索无结果"）
- 不要再带其他执行细节
```

### 注意事项
- **最终交付物三原则**(硬约束):
  1. **中文优先（字段级规则）**：必读区第 1 条的字段级规则在所有场景下都生效——
     - **摘要/入选理由/核心观点/分类/时间/章节描述/播客要点**必须中文
     - **专有名词/技术术语/代码/URL**允许保留英文
     - 表格的"摘要"列即使原文是英文（X.com 帖子、Reddit 帖子、YouTube 简介、Podcast 转录、AI HOT API 返回的英文标题条目），输出时也必须是中文摘要
     - 翻译策略走 `references/search_workflow.md` 的"英文原贴正文翻译策略"——保留专有名词 + 意译自然语言
  2. **落盘前 humanize**：抓取阶段可用机器摘要便于筛选；**仅在落盘到 Obsidian / 博客前**用 `humanizer` skill 处理一次最终稿，落盘版本必须是 humanize 之后的。中间产物（`/tmp/<topic>-block.md`、抓取日志）不直接进 Obsidian / 博客。**humanizer 负责润色中文和剥 AI 味，不负责翻译补漏**——所有英文 → 中文翻译必须在 `/tmp/<topic>-block.md` 阶段就完成
  3. **去流水账**：最终文档只保留信息本身 + 简短数据源标注。ego-browser 调用次数、跳过数据源、retry 次数、子代理内部状态、错误堆栈、AI 生成过程提示词等处理痕迹一律**不得**出现在最终文档中。过程日志单独写到 `/tmp/hot-info-YYYY-MM-DD.log`
  4. **🛑 摘要完整输出（硬约束）**：必读区第 5 条的"不截断"规则在所有场景下都生效——
     - 表格的"摘要"列、列表式摘要、播客摘要、章节描述、引用释义、入选理由**必须完整输出**
     - 禁止用 `…` / `...` / `[truncated]` / `（后略）` 等任何省略号/截断标记
     - 旧的"50-100 字左右"规则已作废；长摘要是**多行段落**或**多个引用块**，**不是截断**
     - "为了视觉简洁"不能成为截断理由——视觉简洁靠排版（引用块、缩进、列表）而不是删内容
- AI 工具 / agent 使用 `references/aihot_skill.md` 中的 AI HOT API（`aihot.virxact.com`），不要混用其他源
- LLM 理论主要从 HuggingFace Papers 抓取，AI HOT API 作为补充
- 具身智能只从 X.com 抓取，不要使用 AI HOT API，也不要打开 HuggingFace Papers / AI HOT 前端
- 在 Hermes 环境中处理软技能类主题时统一通过 `/ego-browser` skill 抓取目标页面；ego-browser 不可用、页面反爬或内容无法加载时才回退到 `read_url_content`，并在备注中说明
- 软技能类主题从 YouTube 拿到的每一条视频，**必须**额外调用 `/media/youtube-content` skill 拉字幕做结构化总结（章节/摘要/引用），不能只用 YouTube 页面简介
- 对思维模型、家庭教育、投资管理等软技能主题，`Reddit top.json`、搜索 API、纯 HTTP 抓取只能作为兜底或补充，不可作为首选抓取方式
- 访问即刻（web.okjike.com）前需确保 ego-browser 已登录即刻账号，可继承用户登录态；登录态不足时获取内容将受限
- 中文关键词信息不足时，自动切换英文关键词重试
- **断点续跑**：如果当天文件已存在且包含部分标记，跳过已完成板块从断点继续（详见 `references/output_config.md`）
- **所有用户特定配置**均从 `~/.hot-info-crawler/user_config.md` 读取
- **Obsidian 同步**：humanize 完成后再触发 `obsidian://` URI 协议唤起 Obsidian，配合 Remotely Save 自动同步完成云端推送
- **博客发布**：humanize 完成后，拷贝到博客仓库的 `feeds` 目录、git commit + push（详见 `references/output_config.md`）
