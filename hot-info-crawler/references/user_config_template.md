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

> Feed 数据源通过 `read_url_content` 直接拉取 JSON，无需浏览器工具。主题检索不套用此规则；非 AI / 软技能主题在 Codex 环境中必须优先使用 `[@chrome](plugin://chrome@openai-bundled)` 打开目标平台页面。

---

## 主题列表

每行一个主题。可自由增删行来控制要抓取的主题。

| 主题 | 英文关键词 | 类型 | 优先平台 | 板块标记ID |
|------|-----------|------|---------|-----------|
| AI 工具 | AI Tools | 技术类 | HuggingFace Papers, X.com | ai_tools |
| LLM 理论 | LLM Theory | 技术类 | HuggingFace Papers, X.com | llm_theory |
| 具身智能 | Embodied Intelligence | 技术类 | HuggingFace Papers, X.com | embodied_intelligence |
| 思维模型 | Mental Models | 软技能类 | YouTube, Reddit (r/productivity, r/selfimprovement, r/stoicism, r/getdisciplined), X.com, 即刻 | mental_models |
| 家庭教育 | Family Education | 软技能类 | YouTube, Reddit (r/Parenting, r/ScienceBasedParenting, r/Montessori), X.com, 即刻 | family_education |
| 投资管理 | Investment Management | 软技能类 | YouTube, Reddit (r/investing, r/financialindependence, r/Bogleheads), X.com, 即刻 | investment_management |

### 字段说明

- **主题**：显示在输出文件中的中文标题
- **英文关键词**：中文关键词信息不足时的回退搜索词
- **类型**：决定默认平台分配
  - `技术类` → 优先 HuggingFace Papers + X.com
  - `软技能类` → 优先 YouTube + Reddit + X.com + 即刻；在 Codex 环境中先用 `[@chrome](plugin://chrome@openai-bundled)` 打开目标页面抓取，JSON / HTTP 只作兜底
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

> 留空此表格（仅保留表头）= 跳过账号追踪步骤。
