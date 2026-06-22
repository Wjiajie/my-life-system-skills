# AI HOT API 使用说明

AI 工具和 LLM 理论相关资讯必须优先使用 AI HOT API 获取，不要先用浏览器搜索抓取 X.com、HuggingFace、YouTube 或 Reddit。具身智能主题不使用本 API 流程，改用 `/ego-browser` skill 打开目标页面抓取。

来源页面：https://aihot.virxact.com/aihot-skill/

## 基本规则

- Base URL：`https://aihot.virxact.com`
- 鉴权：无，公开匿名访问
- API 端点：`/api/public/*`
- API 请求必须带浏览器 `User-Agent`，默认 `curl` UA 可能返回 403
- 串行请求；不要并发翻页或高频轮询
- 用户输出只展示中文资讯简报，不暴露端点路径、raw 参数、HTTP 状态、限流、cursor 等实现细节

PowerShell 示例 User-Agent：

```powershell
$UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
```

curl 示例 User-Agent：

```bash
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
```

## 路由优先级

默认使用精选条目加语义时间窗。只有用户明确点名某种形态时才切换：

| 用户意图 | 使用方式 |
|---|---|
| 今天 AI 圈、最近 AI、有啥新 AI 动态、过去 24 小时 AI 大新闻 | `items` 精选 + `since` 时间窗 |
| AI 日报、今天的日报、看日报 | 最新 `daily` 日报 |
| 昨天日报、指定日期日报 | `daily/{YYYY-MM-DD}` |
| 最近几天日报有哪些、日报存档 | `dailies?take=N` |
| 全部、完整、所有、全量 AI 动态 | `items` 全部 |
| AI 论文、模型发布、产品发布、行业动态、技巧观点 | `items` 精选 + 对应分类 |
| OpenAI / Anthropic / Sora / RAG 等关键词 | `items` + 服务端关键词搜索 `q` |

不要把"今天 AI 圈"这类宽问题路由到日报。日报是固定日期切片；宽问题更适合精选条目加滚动时间窗。

## 质量筛选规则

AI 工具和 LLM 理论板块的目标是选出高质量资讯，不是固定凑满 10 条。每个 API 板块输出 **10-15 条**；如果候选不足 10 条，扩大关键词、分类或时间窗到最近 7 天后再筛选。

候选池构建：

1. 先拉 `items?mode=all&since=<时间窗>&take=100`，如有 `nextCursor` 则串行翻页，直到无下一页或达到任务需要的候选规模。
2. 同时拉 `items?mode=selected&since=<时间窗>&take=100` 作为精选加权来源。
3. 按主题补充关键词查询，例如 AI 工具补 `AI Tools`、`Claude Code`、`agent`，LLM 理论补 `LLM`、`reasoning`、`model`。
4. 用 URL 或 `id` 去重；没有来源 URL 的条目丢弃。

质量评分（满分 100）：

| 维度 | 分值 | 说明 |
|---|---:|---|
| 来源权威性 | 0-25 | 官方博客、论文、知名实验室、核心开发者、主流技术媒体优先 |
| 信息新鲜度 | 0-20 | 时间窗内越新越高；超过用户指定时间窗则丢弃 |
| 实质信息量 | 0-20 | 有明确发布、能力变化、技术结论、实验结果或可行动经验；纯情绪/转发/空泛观点降权 |
| 主题相关性 | 0-20 | 与当前板块强相关；泛 AI 新闻但不贴合主题降权 |
| 影响范围 | 0-15 | 影响开发者、产品、研究、产业格局或用户工作流的范围越大越高 |

筛选步骤：

1. 先丢弃重复、无 URL、摘要过空、明显广告、纯招聘、纯表情/转发类条目。
2. 计算质量分，按分数降序排列。
3. 保证来源多样性：同一来源默认不超过 5 条，除非该来源本周确实连续发布重大信息。
4. 保证主题覆盖：优先覆盖模型、产品、行业、论文、技巧观点中与当前板块最相关的类别。
5. 选出 10-15 条；如果 15 条之后仍有重要内容，只保留更高分或更具差异性的条目。

输出时可以新增 `重要性` 或 `入选理由` 列，用一句中文说明为什么值得看。不要把质量分裸露给用户，除非用户要求审计筛选过程。

## 常用接口

### 精选条目

用于宽问题和默认路径。

```powershell
$since = (Get-Date).ToUniversalTime().AddHours(-24).ToString("yyyy-MM-ddTHH:mm:ssZ")
$url = "https://aihot.virxact.com/api/public/items?mode=selected&since=$since&take=50"
Invoke-RestMethod -Uri $url -Headers @{ "User-Agent" = $UA }
```

### 最新日报

仅当用户明确说"日报"时使用。

```powershell
Invoke-RestMethod -Uri "https://aihot.virxact.com/api/public/daily" -Headers @{ "User-Agent" = $UA }
```

### 指定日期日报

日期格式必须是 `YYYY-MM-DD`。

```powershell
Invoke-RestMethod -Uri "https://aihot.virxact.com/api/public/daily/2026-05-07" -Headers @{ "User-Agent" = $UA }
```

### 日报归档

```powershell
Invoke-RestMethod -Uri "https://aihot.virxact.com/api/public/dailies?take=14" -Headers @{ "User-Agent" = $UA }
```

### 分类条目

分类映射：

| 分类参数 | 中文版块 |
|---|---|
| `ai-models` | 模型发布/更新 |
| `ai-products` | 产品发布/更新 |
| `industry` | 行业动态 |
| `paper` | 论文研究 |
| `tip` | 技巧与观点 |

```powershell
$since = (Get-Date).ToUniversalTime().AddDays(-7).ToString("yyyy-MM-ddTHH:mm:ssZ")
$url = "https://aihot.virxact.com/api/public/items?mode=selected&category=paper&since=$since&take=50"
Invoke-RestMethod -Uri $url -Headers @{ "User-Agent" = $UA }
```

### 关键词搜索

公司、产品、技术词使用服务端 `q` 搜索，不要先拉一批再本地 grep。

```powershell
$keyword = [uri]::EscapeDataString("Anthropic")
$url = "https://aihot.virxact.com/api/public/items?mode=selected&q=$keyword&take=30"
Invoke-RestMethod -Uri $url -Headers @{ "User-Agent" = $UA }
```

## 输出要求

- 输出中文 Markdown 简报。
- 标题可以保留原文链接文本，但摘要、入选理由、主题解释必须使用中文。
- **摘要必须完整输出，禁止任何形式截断**（禁止 `…` / `...` / `[truncated]` / `（后略）`）。AI HOT API 返回的 `summary` 字段多长就输出多长，可以长但不能短；如果是多段、嵌套列表、引用，全部保留。**没有"摘要过长需要省略"这种场景**。
- 默认按五个 AI HOT 版块分组：模型发布/更新、产品发布/更新、行业动态、论文研究、技巧与观点。
- 全文使用连续编号，不要每个版块重新从 1 开始。
- 每条必须保留原始来源 URL。
- 展示 `publishedAt` 时转换成北京时间或自然语言时间，不直接展示 ISO 字符串。
- `summary` 是 AI HOT 生成的摘要，不当作原文引用；需要核对时回到条目的 `url`。

列表式模板：

```markdown
**AI HOT — 最近 24 小时精选**

## 模型发布/更新
1. **标题** — 来源
   今天上午 09:48
   中文摘要。
   原文链接

## 产品发布/更新
2. **标题** — 来源
   中文摘要。
   原文链接
```

## 写入 Hot Info 文件

当此流程作为 `hot-info-crawler` 的 AI 工具或 LLM 理论主题检索板块使用时：

1. 将 AI HOT 返回内容整理为该主题的 Markdown 小节。
2. 追加写入 `hot-info-{YYYY-MM-DD}.md`。
3. 保持该主题的断点标记：`<!-- section:theme_{板块标记ID}_done -->`。
4. 如果同一次任务还有具身智能或非 AI 主题，继续按 `search_workflow.md` 的浏览器流程处理。

## 错误处理

- 最新日报 404：通常是当天日报还没生成；改取昨天日报或改用精选条目。
- API 403：检查是否带了浏览器 `User-Agent`。
- `items` 无结果：扩大时间窗到 7 天，或去掉过窄的关键词/分类。
- 需要 7 天以前的内容：`items` 只覆盖最近内容，改查指定日期日报或日报归档。
