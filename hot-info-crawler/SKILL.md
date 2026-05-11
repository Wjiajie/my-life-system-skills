---
name: hot-info-crawler
description: 专门用于抓取用户自定义主题的最新、最热门信息并写入本地 Markdown 信息库的技能。当用户明确要求"抓取当前热点信息"、"获取最新趋势"、"更新信息库"、"AI 热点"、"AI 资讯"、"AI 日报"、"最近 AI 圈"或类似请求时启动该技能。AI 工具和 LLM 理论主题优先使用 aihot.virxact.com 的 AI HOT API（见 references/aihot_skill.md）获取；具身智能、思维模型、家庭教育、投资管理以及其他非 AI / 软技能主题必须优先使用 Codex Chrome 插件 `[@chrome](plugin://chrome@openai-bundled)` 打开目标站点页面抓取可见内容，再按用户配置从 YouTube、Reddit、X.com、即刻等平台检索。只有 Chrome / 浏览器工具不可用、页面反爬或加载失败时，才允许回退到 JSON/HTTP 抓取，并必须在报告备注中说明。支持的主题和信息源均可在用户配置文件中自定义。
---

# Hot Info Crawler 技能指南

此技能使用结构化 API、订阅 Feed 与浏览器自动化工具执行热点检索任务，支持按主题选择最合适的信息源。AI 工具与 LLM 理论优先走 AI HOT API；具身智能和非 AI / 软技能主题必须优先走浏览器页面抓取。Codex 环境中，思维模型、家庭教育、投资管理这类 Reddit / YouTube / X / 即刻主题首选 `[@chrome](plugin://chrome@openai-bundled)`，因为它能复用用户 Chrome 的登录态和真实页面。检索结果**增量写入**本地 Markdown 文件，防止中断丢失。

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
   - AI 工具、LLM 理论：读取 `references/aihot_skill.md`，使用 AI HOT API 获取并按质量规则筛选
   - 具身智能、非 AI / 软技能主题：按 `references/search_workflow.md` 的平台与浏览器工具回退策略执行；Codex 环境中先使用 `[@chrome](plugin://chrome@openai-bundled)` 打开目标站点页面
3. **完成**：写入完成标记，告知用户文件路径

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
| `references/aihot_skill.md` | AI HOT API 使用说明；AI 相关资讯必须优先使用此文档流程 |
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

AI 工具和 LLM 理论先按 `references/aihot_skill.md` 调用 AI HOT API。具身智能和非 AI / 软技能主题（例如思维模型、家庭教育、投资管理）必须按以下优先级选择浏览器工具（详见 `references/search_workflow.md`）：

| 优先级 | 工具 | 适用条件 | 特点 |
|--------|------|----------|------|
| 🥇 Codex 软技能默认 | `[@chrome](plugin://chrome@openai-bundled)` | 在 Codex 环境中抓取 Reddit、YouTube、X.com、即刻等远程站点时 | 使用用户 Chrome，优先复用登录态、真实标签页和扩展环境 |
| 🥈 Codex 备选 | `browser-use:browser` | Chrome 插件不可用，或任务更适合 Codex 内置浏览器时 | 使用 Codex 内置浏览器，适合页面检查、截图和本地目标 |
| 🥉 备选 | `browser_mcp` | 非 Codex 环境，或明确需要已登录 Chrome 扩展会话且 MCP 已连接 | 复用已登录会话，逐步精细操作 |
| 备选 | `browser_subagent` | Chrome、browser-use 与 browser_mcp 均不可用时 | 内置零配置，任务驱动，独立会话 |
| 兜底 | `read_url_content` | 以上浏览器工具均不可用、页面反爬或页面加载失败时 | 最轻量，纯 HTTP 抓取，无 JS 渲染；使用后必须在报告备注中说明 |

### 检索策略

平台分配由用户配置中主题的 `类型` 字段决定（详见 `references/themes.md`）：

- **AI 工具 / LLM 理论**主题 → AI HOT API，质量筛选后每个板块输出 10-15 条
- **具身智能**主题 → 浏览器打开目标站点页面抓取（如 AI HOT 前端、HuggingFace Papers、X.com 等）
- **非 AI 技术类**主题 → 默认 X.com + Reddit / 其他配置平台
- **软技能类**主题 → 默认 YouTube + Reddit + X.com，即刻作为中文补充源；在 Codex 中必须先用 `[@chrome](plugin://chrome@openai-bundled)` 打开配置平台页面抓取，不能直接把 Reddit JSON / 搜索 API 当作首选路径
- 用户可在配置中自由覆盖每个主题的优先平台

### 执行要点（增量写入）

每个步骤完成后**立即追加写入**日期文件，并附加板块完成标记：

0. **【初始化】** 读取配置 → 创建/打开日期文件 → 写入文件头 `<!-- section:header_done -->`
1. **【Feed】** 拉取配置的 Feed 数据源 → 生成中文总结 → 写入文件 `<!-- section:feed_done -->`
2. **【主题检索】** 按配置逐个主题检索；AI 工具 / LLM 理论使用 AI HOT API，具身智能和非 AI / 软技能主题使用浏览器页面抓取 → 每个主题完成后写入文件 `<!-- section:theme_{ID}_done -->`
3. **【账号追踪】** 追踪配置的关注账号 → 写入文件 `<!-- section:accounts_done -->`
4. **【完成】** 写入完成标记 `<!-- section:all_done -->`
5. **【同步】** 调用 Obsidian CLI 触发 Remotely Save 同步 → 将文件推送到云端

### 注意事项

- AI 工具和 LLM 理论使用 `references/aihot_skill.md` 中的 AI HOT API；具身智能不要使用 API，改用浏览器页面抓取
- 在 Codex 环境中处理具身智能和非 AI / 软技能主题时必须先使用 `[@chrome](plugin://chrome@openai-bundled)`；不可用时再回退到 `browser-use:browser`、`browser_mcp`、`browser_subagent`、`read_url_content`
- 对思维模型、家庭教育、投资管理等软技能主题，`Reddit top.json`、搜索 API、纯 HTTP 抓取只能作为兜底或补充，不可作为首选抓取方式
- 使用 `browser_subagent` 或 `read_url_content` 时，需登录的平台（如即刻）可能无法获取完整内容
- 中文关键词信息不足时，自动切换英文关键词重试
- **断点续跑**：如果当天文件已存在且包含部分标记，跳过已完成板块从断点继续（详见 `references/output_config.md`）
- **所有用户特定配置**均从 `~/.hot-info-crawler/user_config.md` 读取
- **Obsidian 同步**：抓取完成后通过 `obsidian://` 原生 URI 协议唤起 Obsidian，配合 Remotely Save 自动同步完成云端推送
