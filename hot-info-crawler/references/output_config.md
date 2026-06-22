# 输出配置与增量写入

本技能支持将检索结果**增量写入**本地 Markdown 文件，每完成一个板块立即保存，防止因网络中断或上下文溢出导致信息丢失。完成后可自动同步到 Obsidian 和发布到博客仓库。

## 配置文件

- **路径**：`~/.hot-info-crawler/config.json`
- **完整格式**：

```json
{
  "outputDir": "/absolute/path/to/output/directory",
  "blogPublish": {
    "enabled": true,
    "blogRepo": "/absolute/path/to/blog_repo",
    "feedsDir": "src/content/feeds",
    "branch": "fde-journey",
    "filenamePattern": "{date}-hot-info-daily.md",
    "commitMessage": "hot-info-crawler: {date} 热点信息日报",
    "remote": "origin",
    "autoPush": true
  }
}
```

字段说明：

| 字段 | 必填 | 说明 |
|------|------|------|
| `outputDir` | ✅ | 报告写入目录（Obsidian vault 子目录） |
| `blogPublish.enabled` | ❌ | 是否启用博客发布，默认 `false` |
| `blogPublish.blogRepo` | ✅ (启用时) | 博客仓库的绝对路径 |
| `blogPublish.feedsDir` | ✅ (启用时) | feeds 目录相对路径，默认 `src/content/feeds` |
| `blogPublish.branch` | ✅ (启用时) | 提交分支，默认 `fde-journey` |
| `blogPublish.filenamePattern` | ❌ | 文件名模式，`{date}` 替换为 `YYYY-MM-DD`；默认 `{date}-hot-info-daily.md` |
| `blogPublish.commitMessage` | ❌ | commit 信息，`{date}` 替换为 `YYYY-MM-DD` |
| `blogPublish.remote` | ❌ | git 远端名，默认 `origin` |
| `blogPublish.autoPush` | ❌ | 是否自动 push，默认 `true` |

## 首次运行 — Onboarding

如果 `~/.hot-info-crawler/config.json` 不存在或缺少 `outputDir` 字段，执行以下流程：

### 1. 检测操作系统

通过终端命令判断当前 OS：

```bash
# Windows (PowerShell)
echo $env:OS

# macOS / Linux
uname -s
```

### 2. 推荐默认路径

| 操作系统 | 推荐路径 | 说明 |
|----------|---------|------|
| Windows | `C:\Users\{用户名}\Documents\hot-info-crawler\` | 文档目录，易于访问 |
| macOS | `~/Documents/hot-info-crawler/` | 文档目录 |
| Linux | `~/hot-info-crawler/` | 家目录下 |

### 3. 提示用户确认

告知用户推荐路径并询问是否接受，例如：

> 「检测到您使用的是 Windows 系统。建议将热点信息总结保存到：
> `C:\Users\jiaji\Documents\hot-info-crawler\`
>
> 是否使用此路径？或者请告诉我您希望保存到哪个目录。」

### 4. 询问是否启用博客发布

在创建配置前，询问用户：

> 「是否启用博客自动发布？博客发布会把报告额外拷贝到博客仓库的 feeds 目录，并 commit + push 到指定分支。
>
> - 启用：需要提供博客仓库的绝对路径和分支名
> - 跳过：仅写入 Obsidian 目录，不自动发布到博客
>
> 当前是否启用？(y/n)」

用户选择启用时，询问博客仓库路径和分支名（默认 `fde-journey`）。

### 5. 创建配置

用户确认后：

```bash
# 创建配置目录和输出目录
mkdir -p ~/.hot-info-crawler
mkdir -p <outputDir>
```

将 `outputDir` 和（如果启用）`blogPublish` 写入 `~/.hot-info-crawler/config.json`。

## 输出文件

### 命名规则

每次运行创建以日期命名的文件：

```
{outputDir}/hot-info-{YYYY-MM-DD}.md
```

例如：`C:\Users\jiaji\Documents\hot-info-crawler\hot-info-2026-03-21.md`

### 增量写入流程

每完成一个检索板块，**立即将该板块内容追加写入文件**，不要等所有板块完成。

写入顺序和板块标记如下：

**固定标记**（始终存在）：

| 板块 | 完成标记 |
|------|---------|
| 文件头（标题、日期） | `<!-- section:header_done -->` |
| Feed 数据源 | `<!-- section:feed_done -->`（仅在配置了 Feed 源时生成） |
| 关注账号动态 | `<!-- section:accounts_done -->`（仅在配置了关注账号时生成） |
| 完成标记 | `<!-- section:all_done -->` |

**动态标记**（根据 `user_config.md` 主题列表生成）：

```
<!-- section:theme_{板块标记ID}_done -->
```

例如，用户配置了主题 `板块标记ID = ai_tools`，则标记为 `<!-- section:theme_ai_tools_done -->`。

主题板块按 `user_config.md` 中的主题表格行顺序排列，位于 Feed 和账号板块之间。

### 写入方式

使用 `write_to_file`（首次创建）或 `replace_file_content` / `multi_replace_file_content`（追加内容）工具将内容写入文件。

**每个板块写入时**，在板块内容**末尾**添加对应的 HTML 注释标记，表示该板块已完成。

### 文件头模板

首次创建文件时，写入以下头部：

```markdown
# 🔥 热点信息速递 — {YYYY-MM-DD}

> 生成工具：Hot Info Crawler | 开始时间：{HH:MM}

---

<!-- section:header_done -->
```

### 完成尾部模板

所有板块完成后，在文件末尾追加：

```markdown
---

✅ 抓取完成 | {已完成板块数} 个板块 | {当前时间}

<!-- section:all_done -->
```

## 断点续跑

如果当天的文件已存在（说明之前中断过），Agent 应：

1. **读取文件内容**，扫描已有的 `<!-- section:xxx_done -->` 标记
2. **跳过已完成的板块**，从第一个未完成的板块继续
3. 将新内容**追加到文件末尾**
4. 告知用户：「检测到今天的文件已存在（已完成 N 个板块），将从断点继续。」

### 判断逻辑

```
如果文件包含 <!-- section:all_done -->
  → 告知用户"今天的信息已抓取完毕"，询问是否重新抓取

如果文件包含部分标记
  → 跳过已有标记对应的板块，从下一个未完成的板块继续

如果文件不存在
  → 从头开始，创建新文件
```

## Obsidian 同步

抓取完成后（写入 `<!-- section:all_done -->` 后），自动触发 Obsidian 同步：

```bash
# macOS
open "obsidian://open?vault=claudesidian"
```

如果 Obsidian 已配置 Remotely Save 插件并开启自动同步，文件会在下一个同步周期推送到云端。

**失败处理**：

- 如果 Obsidian 未安装 → 跳过同步步骤，提示用户
- 如果 `obsidian://` URI 唤起失败 → 提示用户手动打开 Obsidian

## 博客发布

如果 `config.json` 配置了 `blogPublish.enabled = true`，完成 Obsidian 同步后**自动**执行博客发布流程。

### 前置检查

```bash
# 检查 blogRepo 是否存在
test -d "$blogRepo" || { echo "ERROR: blogRepo 不存在"; exit 1; }

# 检查 git 仓库状态
cd "$blogRepo"
git status --porcelain
test -z "$(git status --porcelain | grep -v '^??' | grep -v feeds/)" || { 
  echo "WARN: blogRepo 有未提交的修改（非 feeds/ 目录），请先处理"
  # 默认仍继续，但提示用户
}

# 检查目标分支
git rev-parse --verify "$branch" >/dev/null 2>&1 || git checkout -b "$branch" origin/main
git checkout "$branch"
git pull --rebase --autostash "$remote" "$branch" 2>/dev/null || true
```

### 步骤 1：拷贝报告到 feeds 目录

```bash
# 文件名按 filenamePattern 生成
TODAY=$(date +%Y-%m-%d)
FILENAME=$(echo "$filenamePattern" | sed "s/{date}/$TODAY/g")
TARGET="$blogRepo/$feedsDir/$FILENAME"

# 复制主文件
cp "{outputDir}/hot-info-$TODAY.md" "$TARGET"
```

### 步骤 2：在文件顶部插入 Astro frontmatter

`src/content/feeds` 目录的 Astro collection 需要 frontmatter。Agent 用 `replace_file_content` 在文件最顶部插入：

```yaml
---
title: "今日热点信息速递 · {YYYY-MM-DD}"
description: "AI 工具 / LLM 理论 / 具身智能 + 软技能类（思维模型/家庭教育/投资管理）+ FDE 行业发展 主题聚合。来源:AI HOT API + Follow Builders Feed + X.com + Reddit + YouTube。"
pubDate: {YYYY-MM-DD}
tags: ["热点", "AI", "日报", "信息源"]
draft: false
---
```

`description` 字段根据实际抓取的主题动态生成：列出本日覆盖的板块（AI 工具 / LLM 理论 / 具身智能 / 思维模型 / 家庭教育 / 投资管理 / FDE 行业发展 / 关注账号追踪等）。

### 步骤 3：git commit

```bash
cd "$blogRepo"
git add "$feedsDir/$FILENAME"
COMMIT_MSG=$(echo "$commitMessage" | sed "s/{date}/$TODAY/g")
git commit -m "$COMMIT_MSG"
```

### 步骤 4：git push（如 autoPush = true）

```bash
git push "$remote" "$branch"
```

**失败处理**：

- 拷贝失败 → 检查 `blogRepo` 路径权限
- commit 失败（无变化）→ 跳过 commit 和 push
- push 失败（远端冲突 / SSH 失败）→ 保留本地 commit，提示用户手动处理
- 分支不存在 → 自动从 `main` 创建并 push

### 完整发布命令模板

```bash
set -e
TODAY=$(date +%Y-%m-%d)
FILENAME=$(echo "blogPublish.filenamePattern" | sed "s/{date}/$TODAY/g")
SRC="{outputDir}/hot-info-$TODAY.md"
DST="$blogRepo/$feedsDir/$FILENAME"
BRANCH="fde-journey"

# 1. 拷贝
cp "$SRC" "$DST"

# 2. git 操作
cd "$blogRepo"
git checkout "$BRANCH" 2>/dev/null || (git checkout -b "$BRANCH" origin/main && git push -u origin "$BRANCH")
git add "$feedsDir/$FILENAME"
git commit -m "hot-info-crawler: $TODAY 热点信息日报" || echo "nothing to commit"
git push origin "$BRANCH" || echo "push failed, please resolve manually"
```

### 报告用户

博客发布完成后，向用户报告：

- 报告文件路径（Obsidian）
- 博客拷贝路径（feeds 目录）
- commit hash
- push 状态（成功 / 失败原因）
- 博客预览地址（如果有的话）

