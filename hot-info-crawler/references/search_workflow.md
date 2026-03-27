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

### 步骤 3：工具选择（三级回退）

按以下优先级确定可用的浏览器工具：

```
1. 尝试调用 browser_navigate 或 browser_snapshot
   ├─ ✅ 成功 → 使用 browser_mcp（后续流程使用 browser_navigate + browser_snapshot）
   └─ ❌ 失败 / 工具不存在
       2. 使用 browser_subagent（Antigravity 内置，无需检测）
          ├─ ✅ 成功 → 使用 browser_subagent（后续流程使用任务描述方式）
          └─ ❌ 失败
              3. 回退到 read_url_content（纯 HTTP 抓取）
```

各工具的操作方式对照：

| 操作 | browser_mcp | browser_subagent | read_url_content |
|------|-------------|------------------|------------------|
| 访问页面 | `browser_navigate(url)` | 在任务描述中指定 URL | `read_url_content(url)` |
| 获取内容 | `browser_snapshot()` | 子代理自动提取并返回 | 工具直接返回 Markdown |
| 滚动加载 | `browser_scroll()` | 在任务中要求"滚动获取更多" | ❌ 不支持 |
| 点击交互 | `browser_click(element)` | 在任务中要求"点击某元素" | ❌ 不支持 |

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

#### 步骤 2：访问目标 URL 并获取内容

根据确定的平台列表，构造对应平台的搜索 URL（参见 `references/platforms.md`），然后使用已确定的工具获取页面内容：

**browser_mcp（优先）：**
1. 使用 `browser_navigate` 导航到目标 URL
2. 使用 `browser_snapshot` 获取页面快照
3. 如需更多内容，使用 `browser_scroll` 滚动后再次 `browser_snapshot`

**browser_subagent（备选）：**
向 `browser_subagent` 下发任务，例如：
> 导航到 `{目标URL}`，提取页面中所有信息条目，包括标题、**原文链接（URL）**、作者、互动数据（点赞数等）。对于 X.com 搜索结果，每条推文的链接格式为 `https://x.com/{用户名}/status/{推文ID}`，务必提取完整链接。如果内容不足，请向下滚动加载更多。返回至少 10 条结果。

**read_url_content（兜底）：**
直接使用 `read_url_content` 获取 URL 返回的 Markdown 内容，从中提取信息。

> **提示**：访问即刻（web.okjike.com）前需确保已在浏览器中登录即刻账号（仅 `browser_mcp` 模式支持）。

#### 步骤 3：数据提取

- 每个主题**至少提取 10 条**信息
- 必须包含：标题、链接、互动数据（点赞数/浏览量等）
- **核心标准**：
  - **全中文摘要**：即便源内容为英文，摘要也必须使用准确、专业的中文呈现。
  - **深度概括**：严禁仅简单翻译标题或提取首句。摘要需覆盖帖子的核心结论、核心技术点或主要争议点。
  - **长度控制**：每条摘要应保持在 50-100 字左右，确保用户无需点击原文即可掌握核心价值。
  - **必须带来源链接**：每条内容**必须附上原始 URL**。无链接 = 不收录。X.com 帖子链接格式为 `https://x.com/{用户名}/status/{推文ID}`。

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
| 1 | [视频标题](视频链接) | 频道名 | 播放量 | 发布时间 | 视频核心内容的 1-2 句中文摘要 |
```

**Reddit 帖子表格模板：**

```markdown
| # | 帖子 | 子版块 | 👍 | 💬 | 摘要 |
|---|------|--------|-----|-----|------|
| 1 | [帖子标题](帖子链接) | r/子版块名 | upvotes | 评论数 | 帖子核心观点的 1-2 句中文摘要 |
```

> **Reddit 检索策略**：优先浏览用户配置中指定的子版块（subreddit）的本周热门帖子，再用关键词搜索作为补充。子版块 URL 格式为 `https://www.reddit.com/r/{子版块名}/top/?t=week`。

---

## 三、关注账号追踪流程（条件执行）

> ⏭️ 如果 `user_config.md` 中 `关注的 X 账号` 表为空（仅有表头、无数据行），**跳过此步骤**。
> ⏭️ 如果文件中已有 `<!-- section:accounts_done -->`，**跳过此步骤**。

在完成所有主题检索后，额外执行：

### 步骤 1：读取账号列表

从 `user_config.md` 的 `关注的 X 账号` 表中加载所有账号。

### 步骤 2：逐一访问并提取

**browser_mcp（优先）：**
1. 使用 `browser_navigate` 访问账号主页（如 `https://x.com/karpathy`）
2. 使用 `browser_snapshot` 获取页面内容

**browser_subagent（备选）：**
向 `browser_subagent` 下发任务，例如：
> 导航到 `https://x.com/karpathy`，提取该用户最新的 3 条帖子，包括发布时间、内容摘要、点赞数、转发数、浏览量和帖子链接。

**read_url_content（兜底）：**
使用 `read_url_content` 获取账号主页内容。注意：X.com 动态内容可能无法通过此方式获取。

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

- 在检索开始前，先通过检测流程确定当前可用的工具层级，整个任务期间保持同一层级
- **每个板块完成后必须立即写入文件**，不要在内存中积累多个板块后一次性写入
- 如果某个主题中文关键词信息不足，自动尝试英文关键词（即刻除外，即刻仅使用中文）
- 关注账号列表可随时在 `~/.hot-info-crawler/user_config.md` 中增删修改
- 即刻搜索默认直接通过 URL 传参进行综合搜索
- 使用 `browser_subagent` 或 `read_url_content` 时，需登录平台的信息获取可能受限，这属于预期行为
- **断点续跑**：通过 `<!-- section:xxx_done -->` 标记判断已完成板块，跳过后从下一个继续
- **所有用户特定配置**（主题、账号、Feed 源、平台开关）均从 `~/.hot-info-crawler/user_config.md` 读取，skill 文件中不包含任何用户特定内容
- **Obsidian 同步**：每次抓取完成后通过 `obsidian://` URI 唤起 Obsidian，配合 Remotely Save 自动同步；如 Obsidian 未运行则跳过并提示用户
