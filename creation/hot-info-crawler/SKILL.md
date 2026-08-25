---
name: hot-info-crawler
description: 抓取用户自定义主题的最新、热门信息，按来源质量筛选并增量写入本地 Markdown 信息库。Use when the user asks for current trends, hot-topic research, AI news, a daily digest, or an Obsidian/blog information update. Routes AI tool news through the configured AI HOT API and uses host-provided browser, web, HTTP, and transcript capabilities for other sources.
---

# Hot Info Crawler

把最新信息整理成可复用的信息产品，而不是把抓取日志倒给用户。

## Required sibling skill

Use `humanizer` once on the final Chinese draft before writing the publishable Obsidian or blog copy. Translation and factual repair must happen before that pass; `humanizer` is for wording, not source recovery.

## Source routing

Read the user's `~/.hot-info-crawler/user_config.md`, then intersect each topic's preferred platforms with the enabled sources.

- AI 工具 / agent：使用 `references/aihot_skill.md` 中的 AI HOT API。
- LLM 理论：优先 HuggingFace Papers，AI HOT API 只作补充。
- 具身智能：只从 X.com 的实时讨论和配置账号获取，不混入 AI HOT API。
- 软技能类：默认组合 YouTube、Reddit、X.com；即刻作为中文补充源。
- Follow Builders 等结构化 Feed：直接读取其 JSON URL。

See `references/themes.md` for routing rules and `references/platforms.md` for fields and URL patterns.

## Host capability selection

Do not depend on a hard-coded browser skill name.

1. For pages that need the user's existing login state, use a host-provided logged-in browser capability. In Codex this can be `chrome:control-chrome` when installed.
2. For isolated interactive browsing, use the host's in-app browser capability. In Codex this can be `browser:control-in-app-browser` when installed.
3. For public pages and primary-source discovery, use the host's web search/open tools.
4. For stable JSON, RSS, or public APIs, use direct HTTP access.
5. If the preferred source cannot be accessed because of login, anti-bot protection, or missing host capability, use an allowed fallback and record the concrete limitation in the report's source note.

Do not claim that a browser, login state, transcript, or API was available unless it was verified in the current run. Do not close user-owned tabs or browser sessions.

## YouTube transcript policy

For each YouTube item selected for a deep summary, try to obtain captions or a transcript through the page, an official transcript endpoint, or a host-provided transcript/content extraction capability.

- If a transcript is available, produce a Chinese structured summary with chapters and source-linked evidence.
- If it is unavailable, do not infer a transcript from the title or description. Keep only verified metadata and description-based context, mark `字幕不可用`, and do not present it as a deep transcript summary.
- Respect source and copyright limits. Paraphrase; do not reproduce a full transcript or long source passage.

## Workflow

### 1. Initialize

1. Read `~/.hot-info-crawler/config.json` for `outputDir`.
2. Read `~/.hot-info-crawler/user_config.md` for topics, source switches, Feed URLs, and tracked accounts.
3. If either file is missing, follow `references/install.md`.
4. Create or resume `{outputDir}/hot-info-{YYYY-MM-DD}.md`.
5. Scan `<!-- section:*_done -->` markers and skip completed sections.

### 2. Gather and verify

For each section:

1. Follow the source routing above and the detailed process in `references/search_workflow.md`.
2. Prefer primary/original URLs over search-result URLs and secondary reposts.
3. Capture publication time, engagement metrics when visible, canonical URL, and enough source text to justify the summary.
4. Cross-check high-impact claims when a second primary or authoritative source is reasonably available.
5. Translate English natural-language content into Chinese while preserving names, product terms, model names, technical abbreviations, code, and URLs.
6. Append the completed section immediately, followed by its completion marker.

### 3. Produce the final document

The publishable document must satisfy all of these rules:

- 摘要、入选理由、核心观点、章节描述、分类、时间和引用释义使用中文。
- 标题可保留原文，但中文摘要必须独立覆盖核心信息。
- 摘要要完整表达被选中的核心信息，不使用 `…`、`[truncated]` 或“后略”掩盖未完成内容；同时不要用“摘要完整”为理由复制整篇文章或完整字幕。
- 保留原始 URL 和简短来源标注。
- 保留会影响可信度的失败说明，例如“登录态不足”或“字幕不可用”。
- 删除调用次数、重试次数、代理分工、内部状态、错误堆栈和提示词等执行痕迹。
- 中间过程日志与分块文件放在系统临时目录，不写入 Obsidian 或博客。

After all sections are present:

1. Remove every `<!-- section:* -->` marker from the publishable copy.
2. Run the final Chinese draft through `humanizer` without changing facts or URLs.
3. Write the polished report to the configured output location.
4. Only launch Obsidian, copy to another repository, commit, or push when the current user request explicitly authorizes that external action. Follow `references/output_config.md`.
5. Report output paths, source limitations, item counts, and any explicitly authorized publication result.

## Parallel work

Parallel topic gathering is optional. Use it only when delegation is available and authorized, the topics are independent, and each worker has a non-overlapping temporary output file. The main agent owns source-quality review, deterministic merge order, final fact checks, humanization, and publication authorization.

Each worker output must:

- start with a `##` section heading;
- use Chinese summaries and preserve original URLs;
- include the matching completion marker for resume support;
- distinguish transcript-backed summaries from description-only YouTube items;
- contain no execution-log narration.

## Configuration reset

If the user asks to reset configuration, explain that this deletes `~/.hot-info-crawler/config.json` and `~/.hot-info-crawler/user_config.md`, obtain confirmation, remove only those exact files, and rerun onboarding.

## References

- `references/install.md`: portable onboarding and capability checks.
- `references/user_config_template.md`: user configuration schema and defaults.
- `references/output_config.md`: incremental output, Obsidian launch, and optional blog publication.
- `references/follow_builders_feed.md`: Follow Builders Feed extraction and output.
- `references/aihot_skill.md`: AI HOT API contract.
- `references/platforms.md`: platform URLs, roles, and extraction fields.
- `references/themes.md`: topic-to-platform routing.
- `references/search_workflow.md`: end-to-end retrieval, translation, ranking, and merge procedure.
