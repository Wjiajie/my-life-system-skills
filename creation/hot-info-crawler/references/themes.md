# 平台分配规则

本文档定义了主题 `类型` 字段与检索平台之间的映射关系。这些是**通用规则**，不包含具体的主题列表——主题由用户在 `~/.hot-info-crawler/user_config.md` 中自行配置。

## 类型与平台映射

| 类型 | 默认优先平台 | 适用场景 |
|------|------------|---------|
| 技术类 | AI HOT API（AI 工具 / agent）/ HuggingFace Papers（LLM 理论）/ X.com（具身智能） | 学术/工具/agent/具身智能主题。AI 工具与 agent 走 API，LLM 理论走论文，具身智能走 X.com 实时讨论 |
| 软技能类 | YouTube, Reddit, X.com；即刻作为中文补充源 | 高质量内容以视频、深度讨论、社交观点和中文社区讨论为主的主题（如教育、商业、个人成长、投资等）。优先使用当前宿主的浏览器能力打开原始页面；YouTube 深度总结必须基于真实 captions / transcript |

> 用户可在 `user_config.md` 的主题表格中通过 `优先平台` 字段覆盖默认映射。

## 平台选取逻辑

Agent 在执行每个主题的检索时，按以下逻辑确定使用哪些平台：

1. 读取该主题的 `优先平台` 列表
2. 与 `user_config.md` 中「信息源开关」表的启用状态做**交集**
3. 仅对交集中的平台执行检索

## 抓取方式约束

主题的具体抓取方式以 `user_config.md` 主题表格中的 `优先平台` 字段为准，不依赖"类型"硬编码：

- `AI HOT API` → 按 AI HOT API 流程获取，参考 `references/aihot_skill.md`
- `HuggingFace Papers` → 用宿主网页或浏览器能力打开 `https://huggingface.co/papers` 日期页 / 搜索页抓取
- `X.com` → 优先用能复用登录态的宿主浏览器打开搜索页 / 相关账号主页
- `YouTube` / `Reddit` / `即刻` 等多平台组合 → 用宿主浏览器打开对应平台原始页面
- 具身智能（`X.com`）：不使用 AI HOT API，不打开 HuggingFace Papers / AI HOT 前端
- 软技能类（思维模型 / 家庭教育 / 投资管理）：使用宿主浏览器抓 YouTube / Reddit / X.com / 即刻；YouTube 深度总结必须基于页面 captions、官方 transcript 或宿主提供的转录能力
- JSON / HTTP 读取只作为兜底或补充校验；一旦使用，必须在报告备注中说明原因

## 软技能类推荐信息源

| 主题 | 推荐网站 / 平台 | 说明 |
|------|----------------|------|
| 思维模型 | YouTube、Reddit、X.com、即刻 | YouTube 用于系统教程和长内容；Reddit 用于真实经验讨论；X.com 用于 George Mack、Adam Grant 等账号和高传播观点；即刻用于中文语境下的思维方式、效率和成长讨论 |
| 家庭教育 | YouTube、Reddit、X.com、即刻 | YouTube 用于育儿专家、课程和访谈；Reddit 用于家长场景和证据型育儿讨论；X.com 用于 Emily Oster 等专家账号；即刻用于中文家庭教育经验和本土语境讨论 |
| 投资管理 | YouTube、Reddit、X.com、即刻 | YouTube 用于投资讲解和访谈；Reddit 用于投资者社区分歧和案例；X.com 用于市场数据、Charlie Bilello 等账号和实时观点；即刻用于中文投资者讨论和本土市场语境 |
| 通用补充 | Google / Bing 搜索、Newsletter / 博客、播客平台 | 仅在配置平台结果不足或需要交叉验证时使用；仍应优先保留原始来源链接 |

**示例**：
- 主题配置：`优先平台 = HuggingFace Papers, X.com`  
- 用户禁用了 `X.com`  
- → 实际只检索 `HuggingFace Papers`

## 即刻 (Jike) 作为补充源

如果用户在信息源开关中启用了即刻，Agent 应将即刻作为**补充检索源**追加到所有主题中（与主题本身的优先平台并列）。

- 即刻仅使用**中文关键词**搜索（不适用英文回退）
- 即刻需要浏览器登录；优先使用当前宿主中能复用用户登录态的浏览器能力
- 如果即刻未启用，忽略所有即刻相关检索

## 关键词回退

如果某个主题使用中文关键词在某平台检索信息不足（结果少于 3 条），自动切换为对应的**英文关键词**重试。

- 即刻平台例外：仅使用中文关键词
- 英文关键词由 `user_config.md` 主题表格中的 `英文关键词` 字段提供
