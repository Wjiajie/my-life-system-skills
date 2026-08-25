# Follow-Builders AI 行业 Feed

本技能集成了 [Follow Builders](https://github.com/zarazhangrui/follow-builders) 项目的中央 Feed，作为 AI 行业动态的**预处理数据源**。该 Feed 由 GitHub Actions 每日自动通过官方 API 抓取，内容结构化，可使用当前宿主的 HTTP / URL 读取能力直接获取。

## Feed URL

| 文件 | Raw URL | 内容 |
|------|---------|------|
| `feed-x.json` | `https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json` | 25 位 AI Builder 最近 24h 的推文 |
| `feed-podcasts.json` | `https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json` | 5 个顶级 AI Podcast 最近 72h 的新集（含完整转录文本） |

## JSON 数据结构

### feed-x.json

```json
{
  "generatedAt": "ISO 时间戳",
  "x": [
    {
      "name": "Andrej Karpathy",
      "handle": "karpathy",
      "bio": "用户简介（用于确定身份/职位）",
      "tweets": [
        {
          "id": "推文 ID",
          "text": "推文全文",
          "createdAt": "发布时间",
          "url": "https://x.com/karpathy/status/xxx",
          "likes": 1835,
          "retweets": 76,
          "replies": 113
        }
      ]
    }
  ]
}
```

### feed-podcasts.json

```json
{
  "generatedAt": "ISO 时间戳",
  "podcasts": [
    {
      "name": "Podcast 名称",
      "title": "本集标题",
      "url": "https://youtube.com/watch?v=xxx",
      "publishedAt": "发布时间",
      "transcript": "完整转录文本（数万字）"
    }
  ]
}
```

## 中文 Markdown 输出格式

拉取到 JSON 后，按以下格式生成中文总结：

---

### 整体结构

```markdown
---

# 🔥 AI Builders 动态速递

> 数据来源：[Follow Builders](https://github.com/zarazhangrui/follow-builders) 中央 Feed | 更新时间：{generatedAt}

---

## 🐦 Builder 推文精选

{逐个 Builder 的推文总结，按推文热度降序排列}

---

## 🎙️ Podcast 深度摘要

{逐个 Podcast 的深度总结}

---
```

### 每个 Builder 推文的格式

```markdown
### {姓名} — {职位/公司}
> *{bio 简述}*

{2-4 句话总结此人所有推文的核心观点，全中文。要求：}
{- 提炼原创观点、行业洞察、产品发布、技术讨论}
{- 跳过：日常闲聊、无实质内容的转发、纯营销推广}
{- 如有大胆预测或反直觉观点，优先突出}
{- 如分享了工具或资源，提及名称}

- 🔗 [推文](url) · ❤️ {likes} · 🔄 {retweets}
- 🔗 [推文](url) · ❤️ {likes} · 🔄 {retweets}
```

### 每个 Podcast 的格式

```markdown
### {Podcast 名称} —「{本集标题}」

**核心观点**：{一句话概括最重要的 takeaway}

**关键洞察**：
- {洞察 1：优先选择反直觉、具体、有经验支撑的观点}
- {洞察 2}
- {洞察 3}
- {洞察 4}

> *"{从转录文本中挑选的最佳原文引用}"*

🔗 [观看完整节目]({url})
```

## 输出规则

1. **全中文（硬约束）**：即便源内容为英文（推文、Podcast 转录、嘉宾背景介绍），总结必须使用准确、专业的中文。具体覆盖：
   - **Builder 推文总结**：英文推文 → 中文总结（保留推文链接 + 互动数据；保留专有名词/技术术语不翻译；自然语言论述意译为中文）
   - **Podcast 嘉宾背景**：英文 bio → 中文身份介绍（如 "Anthropic 研究员"、"a16z 普通合伙人"）
   - **Podcast 摘要**：从完整英文转录文本中提炼 200-400 字**中文**深度摘要，覆盖核心观点、关键洞察（3-4 条中文短句）和一条**原文 + 中文释义**的关键引用
   - **章节标题 / 关键引用**：英文原句如果作为引用块出现可以保留，但前面必须配中文释义
   - 翻译策略走 `references/search_workflow.md` 的"英文原贴正文翻译策略"——混合策略（保留专有名词 + 意译自然语言）
2. **强 Markdown 格式**：使用标题层级、引用块、emoji 图标、链接、粗体等增强可读性
3. **必须带链接**：每条推文和 Podcast 必须附上原始 URL。无链接 = 不收录
4. **身份准确**：使用 `bio` 字段确定每个人的职位，不要猜测。如 bio 说 "ceo @replit" → "Replit CEO Amjad Masad"
5. **过滤低质量内容**：跳过日常闲聊、节日问候、纯转发等无实质内容的推文。如果某个 Builder 没有实质性内容，直接跳过不展示
6. **Podcast 摘要深度**：200-400 字，从完整转录文本中提炼，不是简单翻译标题
7. **不编造内容**：只总结 JSON 中实际存在的内容，禁止虚构引用或观点
8. **热度排序**：Builder 推文按互动量（likes + retweets）降序排列，让最有价值的内容排在前面
