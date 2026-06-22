# Hot Info Crawler 用户配置

> 此文件控制抓取哪些内容。可随时编辑以调整主题、信息源和关注账号。
> 配置文件位置：`~/.hot-info-crawler/user_config.md`

---

## 信息源开关

控制哪些信息平台被启用。设为 `✅` 启用，`❌` 禁用。

| 平台 | 状态 | 说明 |
|------|------|------|
| HuggingFace Papers | ✅ | AI/ML 领域学术论文日榜 |
| X.com | ✅ | 实时热点讨论、行业大 V 观点 |
| YouTube | ✅ | 深度内容（教程、访谈、讲座） |
| Reddit | ✅ | 深度讨论、社区经验分享、质量贴文 |
| 即刻 (Jike) | ✅ | 中文社区热点讨论（需登录） |

> 禁用某平台后，所有主题中涉及该平台的检索都将跳过。

---

## Feed 数据源

可选的结构化 Feed 数据源。删除表格行或将状态设为 `❌` 即可跳过。

| 名称 | 状态 | 推文 JSON URL | Podcast JSON URL |
|------|------|-------------|-----------------|
| Follow Builders | ✅ | `https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json` | `https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-podcasts.json` |

> Feed 数据源通过 `read_url_content` 直接拉取 JSON，无需浏览器工具。主题检索不套用此规则；非 AI / 软技能主题在 Hermes 环境中必须优先使用 `/ego-browser` skill 打开目标平台页面。

---

## 主题列表

每行一个主题。可自由增删行来控制要抓取的主题。

| 主题 | 英文关键词 | 类型 | 优先平台 | 板块标记ID |
|------|-----------|------|---------|-----------|
| AI 工具 / agent | AI Tools / Agent | 技术类 | AI HOT API | ai_tools |
| LLM 理论 | LLM Theory | 技术类 | HuggingFace Papers | llm_theory |
| 具身智能 | Embodied Intelligence | 技术类 | X.com | embodied_intelligence |
| 思维模型 | Mental Models | 软技能类 | YouTube, Reddit (r/productivity, r/selfimprovement, r/stoicism, r/getdisciplined), X.com, 即刻 | mental_models |
| 家庭教育 | Family Education | 软技能类 | YouTube, Reddit (r/Parenting, r/ScienceBasedParenting, r/Montessori), X.com, 即刻 | family_education |
| 投资管理 | Investment Management | 软技能类 | YouTube, Reddit (r/investing, r/financialindependence, r/Bogleheads), X.com, 即刻 | investment_management |
| FDE 行业发展 | Forward Deployed Engineer / AI Deployment | 软技能类 | X.com, YouTube, Reddit (r/MachineLearning, r/ExperiencedDevs, r/salesengineering) | fde_industry |

### 字段说明

- **主题**：显示在输出文件中的中文标题
- **英文关键词**：中文关键词信息不足时的回退搜索词
- **类型**：决定默认平台分配
  - `技术类` → 优先 `AI HOT API`（AI 工具 / agent）或 `HuggingFace Papers`（LLM 理论）或 `X.com`（具身智能）
  - `软技能类` → 优先 YouTube + Reddit + X.com + 即刻；在 Hermes 环境中先用 `/ego-browser` skill 打开目标页面抓取，JSON / HTTP 只作兜底。YouTube 视频必须再用 `/media/youtube-content` skill 拉字幕做深度总结
- **优先平台**：此主题检索的平台（仅从"信息源开关"中启用的平台中选取）
- **板块标记ID**：用于生成 `<!-- section:theme_{ID}_done -->` 断点标记，建议使用英文小写+下划线

### 如何添加新主题

在表格末尾新增一行即可，例如：

```markdown
| 量子计算 | Quantum Computing | 技术类 | HuggingFace Papers, X.com | quantum_computing |
```

### 如何删除主题

直接删除对应行，或在行首加 `<!--` 行尾加 `-->` 注释掉。

---

## 主题特殊配置

部分主题需要补充关键词、关注账号或抓取约束，集中放在本节。

### FDE 行业发展

面向公众号"AI进现场"的内容弹药库。重点抓 FDE（Forward Deployed Engineer，前向部署工程师）行业讨论、企业侧与 FDE 工程师侧经验分享、相关访谈，以及能直接喂给"现场课 / 部署手记 / 案例解剖室 / 找个懂行的 / 情报雷达"五个栏目的素材。

**核心关键词**：

- 中文：`FDE`、`前向部署工程师`、`前向部署`、`AI 落地`、`业务 Agent 化`、`Agent 实施`、`企业 AI 实施`、`部署工程师`、`AI 工程师`、`驻场工程师`
- 英文：`Forward Deployed Engineer`、`FDE`、`forward deployment`、`AI deployment`、`enterprise AI implementation`、`AI agent deployment`、`AI solutions engineer`、`field engineer AI`、`AI implementation partner`、`AI integrator`

**强相关间接关键词**（FDE 标签量少，必须用这些扩展召回）：

- `Palantir FDSE`、`Palantir FDE`
- `OpenAI deployment`、`OpenAI deployment company`
- `Anthropic Accenture`、`Anthropic enterprise`
- `Salesforce FDE`、`Salesforce forward deployed`
- `Cohere forward`、`Cohere deployment`
- `Accenture AI`、`Bain AI deployment`
- `Agent implementation`、`agentic workflow enterprise`

**必须追踪的 X.com 账号 / 列表**（在 `关注的 X 账号` 表中至少加 3 个）：

- @palantir 或 Palantir Tech 官方账号
- OpenAI 官方 + Anthropic 官方 + Salesforce 官方（用于抓"deployment / FDE / 合作伙伴"相关公告）
- @gdb、`@saranormous` 等公开讨论 FDE 文化的 KOL
- `Dify`、`n8n` 官方账号（用于抓工具侧的部署实践）

**必抓的固定信源**（这些是 OpenAI/Anthropic/Salesforce/Palantir/Dify 的官方公告或博客，是"情报雷达"栏目的一手素材，建议在主题检索时也加入作为"补充链接"而非主源）：

- OpenAI Deployment Company: https://openai.com/index/openai-launches-the-deployment-company/
- OpenAI Frontier Alliances: https://openai.com/index/frontier-alliance-partners/
- Anthropic x Accenture: https://www.anthropic.com/news/anthropic-accenture-partnership
- Salesforce FDE 文章: https://www.salesforce.com/ap/blog/forward-deployed-engineer/
- Palantir FDSE 文章: https://blog.palantir.com/a-day-in-the-life-of-a-palantir-forward-deployed-software-engineer-45ef2de257b1
- Dify for Education: https://dify.ai/blog/meet-dify-for-education
- n8n AI workflows: https://n8n.io/ai/

**Reddit 子版块**：

- r/MachineLearning：抓关于 enterprise AI deployment 的论文级讨论
- r/ExperiencedDevs：抓资深工程师对 FDE 角色的看法、面试经验、职业路径
- r/salesengineering：FDE 与 Sales Engineer 角色对比、可借鉴的工作流

**抓取强度建议**：FDE 主题**重 X.com、轻 Reddit**。X.com 重点是搜以下查询：

- `from:OpenAI deployment` / `from:Anthropic Accenture` 等账号 + 关键词组合
- `"forward deployed engineer"` 带引号精确匹配
- `FDE` 标签 + 排除噪音（`FDE` 也是 FDA / Federal Department of Education 等缩写，必须结合上下文过滤）
- 中文标签 `#FDE`、`#前向部署工程师`、`#AI落地`

**去重 / 过滤建议**：

- 排除 pure software engineering 招聘贴（没有"业务 / 客户 / 部署"关键词）
- 排除纯 AI 研究论文（不带 deployment / implementation 关键词）
- 优先保留带"我 / 我们的项目 / 客户案例 / 上线 / 验收"等经验分享类推文
- 企业公告（OpenAI / Anthropic / Salesforce / Palantir）每条单独成项，不与个人讨论合并

**YouTube 处理**：强制走 `/media/youtube-content` skill 拉字幕做深度总结。FDE 主题的 YouTube 视频通常是访谈、播客、conference talk 形态，章节版 + 关键引用 输出最合适。

---

## 关注的 X 账号

每次抓取时额外追踪以下账号的最新动态。可自由增删行。

| 账号 | 链接 | 领域 |
|------|------|------|
| AK (@_akhaliq) | https://x.com/_akhaliq | AI 论文速递 / ML 前沿 |
| Andrej Karpathy (@karpathy) | https://x.com/karpathy | AI / 深度学习 |
| Ethan Mollick (@emollick) | https://x.com/emollick | AI 应用 / 教育创新 |
| McKay Wrigley (@mckaywrigley) | https://x.com/mckaywrigley | AI 工具 / 开发者 |
| Jim Fan (@DrJimFan) | https://x.com/DrJimFan | 具身智能 / AI 研究 |
| Brett Adcock (@adcock_brett) | https://x.com/adcock_brett | 机器人 / 具身智能 |
| Charlie Bilello (@charliebilello) | https://x.com/charliebilello | 投资 / 市场数据 |
| George Mack (@george__mack) | https://x.com/george__mack | 思维模型 / 心智框架 |
| Emily Oster (@ProfEmilyOster) | https://x.com/ProfEmilyOster | 家庭教育 / 数据育儿 |
| Adam Grant (@AdamMGrant) | https://x.com/AdamMGrant | 组织心理学 / 思维模型 |
| Palantir (@PalantirTech) | https://x.com/PalantirTech | FDE 文化源头 / 前向部署 |
| OpenAI (@OpenAI) | https://x.com/OpenAI | AI 部署 / enterprise 公告 |
| Anthropic (@AnthropicAI) | https://x.com/AnthropicAI | AI 部署 / 企业合作公告 |
| Dify (@dify_ai) | https://x.com/dify_ai | Agent 工具 / 部署实践 |
| n8n (@n8n_io) | https://x.com/n8n_io | AI workflow / 自动化部署 |

> 留空此表格（仅保留表头）= 跳过账号追踪步骤。
