# 信息源平台配置

本技能从以下平台抓取热点信息。AI 工具 / agent 主题统一使用 aihot.virxact.com 的 **AI HOT API**（`references/aihot_skill.md`）；LLM 理论主要从 HuggingFace Papers 抓取；具身智能只从 X.com 抓取；软技能类（思维模型 / 家庭教育 / 投资管理）从 YouTube + Reddit + X.com + 即刻抓取，YouTube 视频再用 `/media/youtube-content` skill 拉字幕做深度总结。Hermes 环境中所有需要浏览器的页面统一通过 `/ego-browser` skill 打开。JSON/API/纯 HTTP 只能作为兜底或补充校验。

## 软技能类推荐信息源

| 主题 | 首选来源 | 补充来源 | 推荐入口 |
|------|----------|----------|----------|
| 思维模型 | YouTube、Reddit、X.com | 即刻、博客 / Newsletter、播客 | YouTube 搜索 `Mental Models`；Reddit: r/productivity, r/selfimprovement, r/stoicism, r/getdisciplined；X.com 搜索 `mental models` 并追踪 George Mack、Adam Grant |
| 家庭教育 | YouTube、Reddit、X.com | 即刻、专家博客、播客 | YouTube 搜索 `Family Education` / `Parenting`；Reddit: r/Parenting, r/ScienceBasedParenting, r/Montessori；X.com 追踪 Emily Oster 等专家账号 |
| 投资管理 | YouTube、Reddit、X.com | 即刻、财经博客 / Newsletter、播客 | YouTube 搜索 `Investment Management`；Reddit: r/investing, r/financialindependence, r/Bogleheads；X.com 追踪 Charlie Bilello 等市场数据账号 |

> Reddit 不是唯一来源。它适合抓社区案例和讨论热度；YouTube 更适合深度讲解；X.com 更适合实时观点和专家账号；即刻适合中文社区和本土语境。正式报告应尽量混合 2-4 个来源，除非某平台不可用。

## AI HOT

- **用途**：AI 工具、LLM 理论、大模型、AI 产品、AI 论文等资讯
- **入口文档**：`references/aihot_skill.md`
- **说明**：直接调用 `https://aihot.virxact.com/api/public/*`，无需浏览器；API 请求必须带浏览器 `User-Agent`
- **强制规则**：AI 工具 / agent 走 AI HOT API；LLM 理论走 HuggingFace Papers；具身智能只从 X.com 走浏览器抓取

## X (Twitter)

- **用途**：实时热点讨论、行业大 V 观点、趋势话题
- **搜索 URL 模板**：`https://x.com/search?q={关键词}&src=typed_query&f=top`
- **说明**：`f=top` 参数确保按热度排序，优先获取高互动内容
- **提取字段**：帖子内容摘要（**完整输出不截断**，可长可短，禁止用 `…` / `...` 收尾）、发布时间、点赞数、转发数、浏览量、**帖子链接（必填）**
- **链接格式**：`https://x.com/{用户名}/status/{推文ID}`，必须从搜索结果页面中提取每条帖子的完整链接

## HuggingFace Papers

- **用途**：AI / ML 领域最新学术论文，每日排行榜
- **入口 URL**：`https://huggingface.co/papers`
- **说明**：直接检索 Daily 排行榜，无需额外搜索关键词
- **提取字段**：论文标题、链接、点赞数/浏览量

## YouTube

- **用途**：深度内容（教程、访谈、讲座），适合软技能类主题
- **搜索 URL 模板**：`https://www.youtube.com/results?search_query={关键词}&sp=CAI%253D`
- **说明**：`sp=CAI%253D` 参数按上传日期排序，获取最新视频
- **提取字段**：视频标题、链接、播放量、频道名称、**视频简介摘要**（从视频描述中提炼核心内容，**完整输出不截断**，可长可短，禁止用 `…` / `...` 收尾）

## Reddit

- **用途**：深度讨论和社区经验分享，适合软技能类与生活类主题。帖子质量高、讨论深度大
- **搜索 URL 模板**：`https://www.reddit.com/search/?q={关键词}&sort=new&t=week`
- **子版块 URL 模板**：`https://www.reddit.com/r/{子版块名}/top/?t=week`
- **说明**：优先用浏览器打开子版块（subreddit）本周热门页面，滚动并从页面快照 / DOM 提取帖子；搜索 URL 只作为补充。`t=week` 参数限制为最近一周的内容，`sort=new` 或 `sort=top` 控制排序
- **提取字段**：帖子标题、链接、点赞数(upvotes)、评论数、子版块名、发布时间、**中文帖子摘要**（从正文或热门评论中提炼核心观点，**完整输出不截断**，可以多句、可以长，但禁止用 `…` / `...` 收尾）
- **推荐子版块**（按主题配置，用户可在 `user_config.md` 中自定义）：
  - 思维模型：r/productivity, r/selfimprovement, r/stoicism, r/getdisciplined
  - 家庭教育：r/Parenting, r/ScienceBasedParenting, r/Montessori
  - 投资管理：r/investing, r/financialindependence, r/Bogleheads

## 即刻 (Jike)

- **用途**：中文社区热点讨论，年轻人的兴趣社区，覆盖科技、AI、生活方式等话题
- **搜索 URL 模板**：`https://web.okjike.com/search?q={关键词}`
- **说明**：即刻是中文圈优质的兴趣社区，AI 和科技话题活跃度高。需要在浏览器中提前登录即刻账号才能获取完整内容
- **提取字段**：动态内容摘要（**完整输出不截断**，可长可短，禁止用 `…` / `...` 收尾）、发布时间、点赞数、评论数、帖子链接
