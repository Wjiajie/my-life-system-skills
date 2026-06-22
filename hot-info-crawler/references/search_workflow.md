# 检索执行流程

## 〇、初始化与文件准备

在开始任何检索之前，先完成初始化：

### 步骤 1：读取配置

依次读取以下两个配置文件：

1. **`~/.hot-info-crawler/config.json`** — 获取 `outputDir` 字段
2. **`~/.hot-info-crawler/user_config.md`** — 获取主题列表、信息源开关、Feed 数据源、关注账号

- **如果任一文件不存在**：执行首次 onboarding 流程（详见 `references/install.md`）
- **如果正常**：解析 `user_config.md` 中的 Markdown 表格，提取：
  - `信息源开关` 表 → 确定启用的平台列表
  - `Feed 数据源` 表 → 确定是否执行 Feed 检索及对应 URL
  - `主题列表` 表 → 确定要检索的主题、顺序和平台分配
  - `关注的 X 账号` 表 → 确定要追踪的账号列表

### 步骤 2：创建/打开日期文件

在 `outputDir` 下创建文件 `hot-info-{YYYY-MM-DD}.md`（使用当天日期）。

**如果文件已存在**：
1. 读取文件内容
2. 扫描 `<!-- section:xxx_done -->` 标记，记录已完成的板块
3. 如果包含 `<!-- section:all_done -->`，告知用户"今天已完成抓取"，询问是否重新开始
4. 否则，告知用户将从断点继续，列出已完成和待完成的板块

**如果文件不存在**：
1. 创建文件，写入文件头：

```markdown
# 🔥 热点信息速递 — {YYYY-MM-DD}

> 生成工具：Hot Info Crawler | 开始时间：{HH:MM}

---

<!-- section:header_done -->
```

### 步骤 3：浏览器工具选择

Hermes 环境中所有需要浏览器的页面抓取统一通过 `/ego-browser` skill 执行，调用方式为 `ego-browser nodejs <<'EOF' ... EOF` heredoc 脚本（详见 `/ego-browser` SKILL 文档）：

```
1. 在 Hermes 环境中，通过 /ego-browser skill 打开目标页面：
   - 在 heredoc 中调用 await useOrCreateTaskSpace(name) 复用 task space
   - 使用 await openOrReuseTab(url, { wait: true }) 打开目标 URL
   - 使用 await snapshotText() / await js('...') 提取页面内容
   - 需要时调用 await scrollToBottomUntil(...) / await captureScreenshot() 获取更多内容
   - 在 heredoc 末尾用 await completeTaskSpace(name, { keep: false }) 收尾
   ├─ ✅ 成功 → 使用 ego-browser 抓取到的页面 DOM、可见文本或截图
   └─ ❌ ego-browser 不可用 / 页面反爬 / 登录态不足
       2. 回退到 read_url_content（纯 HTTP 抓取，无 JS 渲染）
```

`ego-browser` 的常用操作方式对照（更多 helper 见 `/ego-browser` SKILL）：

| 操作 | `/ego-browser` (heredoc) | `read_url_content` |
|------|--------------------------|--------------------|
| 访问页面 | `await openOrReuseTab(url, { wait: true })` | `read_url_content(url)` |
| 获取内容 | `await snapshotText()` 或 `await js('(() => { ... })()')` | 工具直接返回 Markdown |
| 滚动加载 | `await scrollToBottomUntil(predicate, opts)` 或 `await scrollBy(n)` | ❌ 不支持 |
| 点击交互 | `await click('@N')` 或 `await click(selector)` | ❌ 不支持 |
| 截图 | `await captureScreenshot()` | ❌ 不支持 |

---

## 一、Feed 数据源检索（条件执行）

> ⏭️ 如果 `user_config.md` 中未配置 Feed 数据源，或所有 Feed 状态为 `❌`，**跳过此步骤**。
> ⏭️ 如果文件中已有 `<!-- section:feed_done -->`，**跳过此步骤**。

### 步骤 1：拉取 Feed JSON

从 `user_config.md` 的 `Feed 数据源` 表中读取状态为 `✅` 的条目，使用 `read_url_content` 拉取对应的 JSON URL。

> **注意**：此步骤**始终使用 `read_url_content`**，无需浏览器工具。

### 步骤 2：解析与总结

按 `references/follow_builders_feed.md` 中定义的**中文强 Markdown 格式**生成总结：

- **推文部分**：逐个 Builder 总结其推文核心观点（2-4 句中文），附上推文链接和互动数据。按互动量降序排列。跳过无实质内容的推文
- **Podcast 部分**：从完整转录文本中提炼 200-400 字的深度中文摘要，包含核心观点、关键洞察（3-4 条）和一条精选引用

### 步骤 3：写入文件

将生成的总结**追加写入**日期文件，末尾添加标记：

```markdown
<!-- section:feed_done -->
```

---

## 二、主题检索流程

按 `user_config.md` 中 `主题列表` 表的行顺序**依次执行**，每个主题完成后立即写入文件。

### AI 相关主题的路由

主题的抓取方式由 `user_config.md` 主题列表的 `优先平台` 字段决定，不再依赖"主题类型"硬编码：

- `AI 工具 / agent`（优先平台 = `AI HOT API`）→ 读取 `references/aihot_skill.md`，调用 aihot.virxact.com 的 AI HOT API 获取内容。**不要**先用 `/ego-browser` 抓取 X.com、HuggingFace、YouTube 或 Reddit 替代
- `LLM 理论`（优先平台 = `HuggingFace Papers`）→ 读取 `references/aihot_skill.md` 调用 AI HOT API，或者用 `/ego-browser` 打开 `https://huggingface.co/papers` 日期页 / 搜索页抓取论文条目；不要扩展到 X.com 或 Reddit
- `具身智能`（优先平台 = `X.com`）→ **不要使用 AI HOT API**，**不要打开 HuggingFace Papers / AI HOT 前端**，统一用 `/ego-browser` skill 打开 X.com 搜索页或相关账号主页抓取

只有 `AI 工具 / agent` 走纯 API；`LLM 理论` 主要走 HuggingFace Papers；`具身智能` 和所有软技能类主题统一通过 `/ego-browser` skill 抓取。思维模型、家庭教育、投资管理等软技能主题在 Hermes 环境中必须使用 `/ego-browser` skill 打开 Reddit / YouTube / X.com / 即刻等目标页面，从 `snapshotText` / `js` / `captureScreenshot` 提取条目；不得把 Reddit JSON、搜索 API 或纯 HTTP 抓取作为首选路径。

### 主题执行顺序与标记（动态生成）

板块标记根据主题的 `板块标记ID` 字段动态生成：

```
完成标记 = <!-- section:theme_{板块标记ID}_done -->
```

例如，主题表格中有一行 `板块标记ID = ai_tools`，则完成标记为 `<!-- section:theme_ai_tools_done -->`。

> ⏭️ 对每个主题，先检查文件中是否已有对应标记。如已有，**跳过该主题**。

### 每个主题的执行步骤

#### 步骤 1：确定检索平台

1. 读取该主题的 `优先平台` 列表
2. 与 `user_config.md` 中 `信息源开关` 表的启用状态（`✅`）做**交集**
3. 如果即刻在信息源开关中启用，自动追加即刻作为补充源（参见 `references/themes.md` 平台分配规则）
4. 仅对交集中的平台执行检索

#### 步骤 1.5：确定抓取方式

- 主题抓取方式以 `user_config.md` 主题表格中的 `优先平台` 字段为准：
  - `AI HOT API` → 按 `references/aihot_skill.md` 的 AI HOT API 流程
  - `HuggingFace Papers` → 用 `/ego-browser` 打开 `https://huggingface.co/papers` 日期页 / 搜索页抓取论文条目
  - `X.com` → 用 `/ego-browser` 打开 X.com 搜索页 / 相关账号主页
  - `YouTube` / `Reddit` / `即刻` 等多平台组合 → 用 `/ego-browser` 打开对应平台页面
- `具身智能`（优先平台 = `X.com`）绝不使用 AI HOT API，绝不打开 HuggingFace Papers / AI HOT 前端
- 软技能类（思维模型 / 家庭教育 / 投资管理）必须先浏览器抓页面；YouTube 视频结果必须再用 `/media/youtube-content` skill 拉字幕做深度总结（详见"步骤 3.5"）
- 只有当 ego-browser 不可用、页面反爬、页面加载失败或登录态不足导致无法提取可见内容时，才允许回退到 JSON / HTTP；回退后必须在报告的"抓取备注"中写明原因

#### 步骤 2：访问目标 URL 并获取内容

根据确定的平台列表，构造对应平台的搜索 URL（参见 `references/platforms.md`），然后使用已确定的工具获取页面内容：

**`/ego-browser` skill（Hermes 唯一浏览器）：**

在 Bash 中执行 `ego-browser nodejs <<'EOF' ... EOF` heredoc 脚本，调用 `/ego-browser` 提供的 helper：

```js
const task = await useOrCreateTaskSpace('hot-info-crawler <主题名>')
await openOrReuseTab('<目标 URL>', { wait: true, timeout: 20 })
// semantic workflow：默认
const tree = await snapshotText()       // 返回带 @N refs 的页面语义树
cliLog(tree)
// direct DOM 提取：把 IIFE 字符串传给 js()
const data = await js(String.raw`(() => {
  const items = [...document.querySelectorAll('article')]
  return items.map(el => ({ title: el.innerText, links: [...el.querySelectorAll('a')].map(a => a.href) }))
})()`)
cliLog(JSON.stringify(data, null, 2))
// 滚动加载更多
await scrollToBottomUntil(
  async () => await js(String.raw`document.querySelectorAll('article').length`) >= 20,
  { step: 900, wait: 1, maxSteps: 20 },
)
// 收尾
await completeTaskSpace(task.id, { keep: false })
```

要点：

- 同一次任务的多轮 heredoc 之间复用 `useOrCreateTaskSpace(name)` 保持同一 task space
- 提取条目后再 `completeTaskSpace(name, { keep: false })` 关闭 task space
- 对 X.com、YouTube、即刻等登录态相关站点，ego-browser 可继承用户登录态
- 跨多次 `snapshotText()` 时，ref 编号（N）来自 `backendNodeId` 会保持稳定，但 N 必须出现在最新一次 `snapshotText()` 输出中；需要长期引用的元素请用 `loc=...` 或 CSS selector

**`read_url_content`（兜底）：**

只有当 `/ego-browser` 不可用、页面反爬、加载失败或登录态不足时，才回退到 `read_url_content` 获取 URL 返回的 Markdown 内容。回退后必须在报告"抓取备注"中写明原因。

> **提示**：访问即刻（web.okjike.com）前需确保 ego-browser 已登录即刻账号，可继承用户登录态；无登录态时仅能获取公开内容。
> **强制要求**：非 AI / 软技能主题优先打开目标站点页面并从浏览器页面快照 / DOM / 可见内容提取；不要用搜索引擎结果页替代站内页面。只有 ego-browser 不可用、页面反爬或内容无法加载时，才回退到 JSON / HTTP 读取，并在输出备注中说明。

#### 步骤 3：数据提取

- 每个主题**至少提取 10 条**信息
- 必须包含：标题、链接、互动数据（点赞数/浏览量等）
- **核心标准**：
  - **中文化呈现**：标题可保留原文，但必须补充中文主题说明；摘要、入选理由和核心观点必须是中文。
  - **全中文摘要**：即便源内容为英文，摘要也必须使用准确、专业的中文呈现。
  - **深度概括**：摘要需覆盖帖子的核心结论、核心技术点或主要争议点。**不截断、不省略、不以"太长"为理由用 `…` / `...` 收尾**——原贴文多少字、API 摘要多长就输出多少字，可以长但不能短。
  - **必须带来源链接**：每条内容**必须附上原始 URL**。无链接 = 不收录。X.com 帖子链接格式为 `https://x.com/{用户名}/status/{推文ID}`。
- **英文原贴正文翻译策略（适用所有英文源，硬约束）**：**所有**英文源都按这套混合策略翻译，禁止出现"英文原文 + 英文摘要"或"只翻标题不翻正文"。覆盖范围明确列举：
  - **AI HOT API 返回的英文条目**（标题/摘要都是英文的）→ 走混合策略
  - **X.com 英文帖子** → 走混合策略
  - **Reddit 英文帖子正文与热门评论** → 走混合策略
  - **HuggingFace 论文摘要与标题** → 走混合策略
  - **YouTube 视频简介**（来自搜索页/频道页的 description 字段）→ 走混合策略；视频字幕（`/media/youtube-content` skill 拉的）→ 章节标题/摘要/引用全部走混合策略
  - **Podcast 转录文本**（来自 Follow Builders Feed 的 `feed-podcasts.json`）→ 走混合策略
  - **即刻英文内容** → 走混合策略
  - **其他英文站点**（Hacker News / The Verge / Bloomberg 等 RSS）→ 走混合策略
  - **中文源帖子**（X.com 中文 / Reddit 中文 / 即刻中文）按现有"中文化呈现"规则不变，本身就是中文不需要翻译

  混合策略细节：
  - **保留英文（不翻译）**：技术术语、模型/产品/API/人名/公司/库名、代码片段、命令行/配置示例、专有名词、行业固定缩写（如 LLM、AGI、RLHF、RAG、GPU、CUDA）
  - **意译为中文**：自然语言论述、观点、解释性句子、过渡句、举例说明
  - **首译术语**：英文帖子中首次出现的核心概念，给出"中文译名（English original）"格式，后续只用中文译名
  - **不做整段直译**：保留英文原贴的关键术语 + 意译自然语言论述，而不是逐句翻译整段英文原文

  **质量自检**（subagent 在落盘前自查，主代理合并前再查一次）：
  - 扫描所有"摘要"列、播客摘要、章节描述、引言段——**任何一句英文自然语言句子都必须翻译**
  - 仅允许保留英文的字段：专有名词、技术术语、代码/命令、URL、引用块里的原文（如果整段作为引用块附在条目尾部）
  - 发现漏翻译的英文句子 → 当场补翻译，不留到 humanize 阶段

#### 步骤 3.5：YouTube 视频深度总结（软技能类强制）

> 仅适用于软技能类（思维模型 / 家庭教育 / 投资管理）和其他将 YouTube 列入 `优先平台` 的主题。技术类主题从 YouTube 拿到的视频不在此强制范围内，仍按"步骤 3"的通用规则处理。

凡是从 YouTube 搜索页 / 频道页提取到、且准备写入报告的**每一条**视频，**必须**额外调用 `/media/youtube-content` skill 拉取字幕并生成结构化总结，不能只靠 YouTube 页面上的简介/标题/首句。

执行流程：

1. **收集候选**：在 `步骤 3` 中按 YouTube 模板提取的视频条目（含视频 URL、标题、频道）整理成待处理列表
2. **拉取字幕**：对每条视频依次执行：

   ```bash
   uv run python3 /Users/jiajie/.hermes/skills/media/youtube-content/scripts/fetch_transcript.py "<视频 URL>" --text-only --timestamps
   ```

   - 依赖未装时先 `uv pip install youtube-transcript-api`
   - 字幕为空/被禁用/私密视频 → 跳过该视频，在该条记录的"备注"列写"字幕不可用，仅保留 YouTube 简介"
3. **生成结构化总结**：调用 `/media/youtube-content` skill 提供的输出格式（任选其一，按视频价值判断）：
   - **章节版**（长视频 / 教程）：时间戳 + 主题分组，**完整列出所有章节**，不截断
   - **摘要版**（默认）：**覆盖全部核心观点和结论**，按需可长可短，**不限制 5-10 句**——长视频可以十几句、二十句，**禁止用 `…` 收尾**
   - **章节摘要版**：每个章节一段中文小结，章节全部列出
   - **引用版**：抽取金句配时间戳，**所有有价值的金句都列出**，不限制数量
4. **写入表格**：将结构化总结以"📺 深度总结"子小节挂在该视频条目下方，**保留**原 YouTube 模板行的所有字段（标题、链接、播放量等）

模板示例：

```markdown
| # | 视频 | 频道 | 👀 | 发布 | 简介 |
|---|------|------|-----|------|------|
| 1 | [视频标题](视频链接) | 频道名 | 播放量 | 发布时间 | YouTube 简介完整中文翻译/概述 |

#### 📺 视频 1 深度总结（/media/youtube-content）

**章节**（完整列出，不截断）
- `00:00` 开场：介绍本集要解决的问题
- `03:45` 背景：现有方案的不足
- `12:20` 核心方法：提出新方案
- `25:10` 实验结果与对比
- `38:40` 局限性与未来工作

**摘要**：完整中文概述，覆盖视频全部核心观点和结论。短则 3-5 句，长则 15-20 句，按视频实际内容决定。

**关键引用**
> "金句原文" — 12:34
> "另一句金句" — 24:10
> "第三句金句" — 36:50
```

异常处理：

- 字幕拉取失败 → 跳过 `/media/youtube-content` 流程，仅保留原 YouTube 简介，并在该条"备注"列写明"字幕不可用"
- 字幕超过 50K 字符 → 按 `/media/youtube-content` 的"Chunk if needed"规则分块总结后再合并
- 多个视频 → 逐条处理，不要并发（避免 IP 限流）

#### 步骤 4：写入文件

将该主题的结果以 Markdown 表格格式**追加写入**日期文件，末尾添加对应标记。各平台使用如下表格模板：

**HuggingFace Papers 表格模板：**

```markdown
| # | 论文 | 👍 | 摘要 |
|---|------|-----|------|
| 1 | [论文标题](论文链接) | 点赞数 | 中文摘要 |
```

**X.com 热点讨论表格模板：**

```markdown
| # | 内容 | 作者 | 🔗 | ❤️ |
|---|------|------|-----|-----|
| 1 | **标题/核心观点加粗**：中文摘要正文 | 作者名 | [原文](https://x.com/用户名/status/推文ID) | 点赞数 |
```

> ⚠️ **X.com 来源链接为必填项**：每一条 X.com 热点讨论**必须包含推文原始链接**。如果无法获取到链接，应使用搜索 URL 作为替代（`https://x.com/search?q=关键词`），但不可留空。

**YouTube 视频表格模板：**

```markdown
| # | 视频 | 频道 | 👀 | 发布 | 简介 |
|---|------|------|-----|------|------|
| 1 | [视频标题](视频链接) | 频道名 | 播放量 | 发布时间 | 视频核心内容的完整中文摘要（不截断） |
```

**Reddit 帖子表格模板：**

```markdown
| # | 帖子 | 子版块 | 👍 | 💬 | 摘要 |
|---|------|--------|-----|-----|------|
| 1 | [帖子标题](帖子链接) | r/子版块名 | upvotes | 评论数 | 帖子核心观点的完整中文摘要（不截断） |
```

> **Reddit 检索策略**：优先用浏览器打开用户配置中指定的子版块（subreddit）的本周热门帖子，再用关键词搜索作为补充。子版块 URL 格式为 `https://www.reddit.com/r/{子版块名}/top/?t=week`。`https://www.reddit.com/r/{子版块名}/top.json` 只允许在浏览器页面不可用或作为补充校验时使用。

---

## 三、关注账号追踪流程（条件执行）

> ⏭️ 如果 `user_config.md` 中 `关注的 X 账号` 表为空（仅有表头、无数据行），**跳过此步骤**。
> ⏭️ 如果文件中已有 `<!-- section:accounts_done -->`，**跳过此步骤**。

在完成所有主题检索后，额外执行：

### 步骤 1：读取账号列表

从 `user_config.md` 的 `关注的 X 账号` 表中加载所有账号。

### 步骤 2：逐一访问并提取

**`/ego-browser` skill（Hermes 唯一浏览器）：**

在 Bash 中执行 `ego-browser nodejs <<'EOF' ... EOF` heredoc 脚本，调用 `/ego-browser` 提供的 helper：

```js
const task = await useOrCreateTaskSpace('hot-info-crawler accounts')
await openOrReuseTab('https://x.com/<username>', { wait: true, timeout: 20 })
const tree = await snapshotText()
cliLog(tree)
// 或用 js() 提取结构化数据
const posts = await js(String.raw`(() => {
  return [...document.querySelectorAll('article')].slice(0, 3).map(a => ({
    text: a.innerText,
    links: [...a.querySelectorAll('a[href*="/status/"]')].map(x => x.href),
  }))
})()`)
cliLog(JSON.stringify(posts, null, 2))
await completeTaskSpace(task.id, { keep: false })
```

**`read_url_content`（兜底）：**

只有当 `/ego-browser` 不可用时，才回退到 `read_url_content` 获取账号主页内容。注意：X.com 动态内容通常无法通过纯 HTTP 抓取获取，必须依赖浏览器。

### 步骤 3：数据提取

提取每个账号的**最新 3 条帖子**，包含：
- 发布时间
- 帖子内容摘要
- 互动数据（点赞、转发、浏览量）
- 帖子链接

### 步骤 4：写入文件

以独立的 "🔔 关注账号动态" 板块**追加写入**日期文件，按账号分组，使用 Markdown 表格。末尾添加标记：

```markdown
<!-- section:accounts_done -->
```

---

## 四、完成

所有板块完成后，在文件末尾追加：

```markdown
---

✅ 抓取完成 | {已完成板块数} 个板块 | 完成时间：{HH:MM}

<!-- section:all_done -->
```

然后告知用户文件路径，例如：「热点信息已保存到 `C:\Users\jiaji\Documents\hot-info-crawler\hot-info-2026-03-21.md`」

---

## 五、Obsidian 同步

> 此步骤在**所有板块写入完成后**自动执行，无需用户手动触发。

### 前置条件

- Obsidian 应用正在后台运行
- 已安装 **Remotely Save** 插件并完成云端配置
- 建议在 Remotely Save 设置中开启「自动同步」（如每隔 5 分钟）

### 执行步骤

在文件写入完成后，使用 `run_command` 工具执行以下命令，通过 Obsidian 原生 URI 协议唤起 vault：

```powershell
Start-Process "obsidian://open?vault=claudesidian"
```

> **说明**：Obsidian 原生 URI 协议不支持直接执行任意插件命令。上述命令将唤起/激活 Obsidian 窗口，如 Remotely Save 已配置自动同步，则会在下一个同步周期自动触发。如未配置自动同步，需提示用户手动点击同步按钮。

### 错误处理

- **如果命令执行失败**（如 Obsidian 未安装）：不阻塞整体流程，向用户提示同步失败原因，建议手动在 Obsidian 中执行同步
- **如果命令执行成功**：在最终输出中附加提示「📤 已唤起 Obsidian，Remotely Save 将在下一个同步周期自动同步」

---

## 六、注意事项

- 在检索开始前确认 `/ego-browser` skill 可用，整个任务期间统一使用 `/ego-browser`；思维模型、家庭教育、投资管理等远程软技能主题默认从 `/ego-browser` 开始
- 思维模型、家庭教育、投资管理等软技能主题必须先走浏览器页面抓取；如果用了 JSON / HTTP 兜底，必须在输出文件备注中说明"ego-browser 不可用 / 页面失败 / 登录态不足"等具体原因
- **每个板块完成后必须立即写入文件**，不要在内存中积累多个板块后一次性写入
- 如果某个主题中文关键词信息不足，自动尝试英文关键词（即刻除外，即刻仅使用中文）
- 关注账号列表可随时在 `~/.hot-info-crawler/user_config.md` 中增删修改
- 即刻搜索默认直接通过 URL 传参进行综合搜索
- 使用 `read_url_content` 兜底时，需登录平台的信息获取可能受限，这属于预期行为
- **断点续跑**：通过 `<!-- section:xxx_done -->` 标记判断已完成板块，跳过后从下一个继续
- **所有用户特定配置**（主题、账号、Feed 源、平台开关）均从 `~/.hot-info-crawler/user_config.md` 读取，skill 文件中不包含任何用户特定内容
- **Obsidian 同步**：每次抓取完成后通过 `obsidian://` URI 唤起 Obsidian，配合 Remotely Save 自动同步；如 Obsidian 未运行则跳过并提示用户
