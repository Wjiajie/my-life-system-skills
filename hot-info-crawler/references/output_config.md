# 输出配置与增量写入

本技能支持将检索结果**增量写入**本地 Markdown 文件，每完成一个板块立即保存，防止因网络中断或上下文溢出导致信息丢失。

## 配置文件

- **路径**：`~/.hot-info-crawler/config.json`
- **格式**：

```json
{
  "outputDir": "/absolute/path/to/output/directory"
}
```

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

### 4. 创建配置

用户确认后：

```bash
# 创建配置目录和输出目录
mkdir -p ~/.hot-info-crawler
mkdir -p <outputDir>
```

将 `outputDir` 写入 `~/.hot-info-crawler/config.json`。

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
