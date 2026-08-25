# 安装与首次配置

本 skill 不绑定特定浏览器产品。它使用当前宿主已经提供的浏览器、网页搜索、HTTP/API 与文件工具；缺失某种能力时，必须明确降级并记录来源限制。

## 前置能力

- 能读取公开网页或执行网页搜索。
- 若要访问需要登录的 X.com、Reddit、YouTube 或即刻页面，宿主需提供可复用用户登录态的浏览器能力。
- 能读取 JSON / RSS / HTTP API。
- 能读写本地 Markdown。
- 已安装同仓库的 `humanizer` skill，用于最终中文稿润色。

在 Codex 中，可按当前安装状态选择：

- `chrome:control-chrome`：需要复用现有 Chrome 登录态时优先。
- `browser:control-in-app-browser`：适合独立、交互式页面浏览。
- 内置 web 工具：适合公开网页、搜索、原始链接核验和无需登录的页面。

这些名称只是 Codex 中的可选实现。其他宿主使用其等价能力，不应因为没有同名 skill 而停止整个流程。

## 能力检查

首次执行时验证：

1. 能否读取 `https://huggingface.co/papers` 的公开内容。
2. 能否访问用户启用的平台；需要登录的平台只声明实际可见范围。
3. 能否请求用户配置的 Feed JSON 和 AI HOT API。
4. 能否在系统临时目录与目标 `outputDir` 写入文件。
5. 对 YouTube 候选项，能否从页面、官方字幕或宿主转录能力获得真实 transcript。

能力不足时不要伪造成功。跳过受影响来源或使用允许的公开网页 / HTTP 兜底，并在报告中写清“登录态不足”“页面不可访问”或“字幕不可用”。

## 配置文件

首次运行需要两个文件：

- `~/.hot-info-crawler/config.json`：输出目录与可选发布配置，格式见 `output_config.md`。
- `~/.hot-info-crawler/user_config.md`：主题、平台开关、Feed 与账号列表，从 `user_config_template.md` 复制后由用户确认。

创建前先让用户确认输出目录。博客发布属于外部 Git 写操作：即使配置存在，也只有当前请求明确授权时才能 commit 或 push。

## 验收

Onboarding 完成后应能证明：

- 两个配置文件存在且可读取；
- `outputDir` 是用户确认过的绝对路径；
- 至少一个已启用来源可访问；
- 临时文件和最终报告可写；
- 不可用来源已被标记，而不是静默替换为未经说明的来源。
