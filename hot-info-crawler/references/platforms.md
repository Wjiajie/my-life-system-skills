# 信息源平台配置

本技能从以下四个平台抓取热点信息。

## X (Twitter)

- **用途**：实时热点讨论、行业大 V 观点、趋势话题
- **搜索 URL 模板**：`https://x.com/search?q={关键词}&src=typed_query&f=top`
- **说明**：`f=top` 参数确保按热度排序，优先获取高互动内容
- **提取字段**：帖子内容摘要、发布时间、点赞数、转发数、浏览量、**帖子链接（必填）**
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
- **提取字段**：视频标题、链接、播放量、频道名称、**视频简介摘要**（从视频描述中提取 1-2 句核心内容）

## Reddit

- **用途**：深度讨论和社区经验分享，适合软技能类与生活类主题。帖子质量高、讨论深度大
- **搜索 URL 模板**：`https://www.reddit.com/search/?q={关键词}&sort=new&t=week`
- **子版块 URL 模板**：`https://www.reddit.com/r/{子版块名}/top/?t=week`
- **说明**：优先使用子版块（subreddit）浏览热门帖子，搜索 URL 作为补充。`t=week` 参数限制为最近一周的内容，`sort=new` 或 `sort=top` 控制排序
- **提取字段**：帖子标题、链接、点赞数(upvotes)、评论数、子版块名、发布时间、**帖子摘要**（从正文或热门评论中提炼 1-2 句核心观点）
- **推荐子版块**（按主题配置，用户可在 `user_config.md` 中自定义）：
  - 思维模型：r/productivity, r/selfimprovement, r/stoicism, r/getdisciplined
  - 家庭教育：r/Parenting, r/ScienceBasedParenting, r/Montessori
  - 投资管理：r/investing, r/financialindependence, r/Bogleheads

## 即刻 (Jike)

- **用途**：中文社区热点讨论，年轻人的兴趣社区，覆盖科技、AI、生活方式等话题
- **搜索 URL 模板**：`https://web.okjike.com/search?q={关键词}`
- **说明**：即刻是中文圈优质的兴趣社区，AI 和科技话题活跃度高。需要在浏览器中提前登录即刻账号才能获取完整内容
- **提取字段**：动态内容摘要、发布时间、点赞数、评论数、帖子链接
