# 安装与配置指南

本技能在 Hermes 环境中**统一通过 `/ego-browser` skill 完成所有浏览器抓取**（`ego-browser nodejs <<'EOF' ... EOF` heredoc 驱动）；只有 ego-browser 不可用、页面反爬或加载失败时，才回退到 `read_url_content` 纯 HTTP 抓取。首次使用时还需初始化用户配置文件。

---

## 一、前置要求

- 已安装 **ego-browser**（macOS 应用 "ego lite"），并完成 `/ego-browser` skill 接入
- 已安装 **Node.js**（v18+）和 **npm**（ego-browser 内部使用）

---

## 二、🥇 浏览器方案：`/ego-browser` skill

Hermes 环境中所有需要浏览器的页面抓取统一通过 `/ego-browser` skill 执行。

### 特点

- **Hermes 内部 skill**，调用 `ego-browser nodejs <<'EOF' ... EOF` heredoc 脚本即可驱动
- 可复用用户 ego-browser 的登录态，独立 task space 不打扰用户正常浏览
- 提供 `openOrReuseTab` / `snapshotText` / `js` / `captureScreenshot` / `scrollToBottomUntil` / `click` / `fillInput` / `completeTaskSpace` 等 helper
- 完整用法详见 `/ego-browser` SKILL 文档

### 快速验证

在 Bash 中执行：

```bash
ego-browser nodejs <<'EOF'
const task = await useOrCreateTaskSpace('hot-info-crawler verify')
await openOrReuseTab('https://huggingface.co/papers', { wait: true, timeout: 20 })
cliLog(await snapshotText())
await completeTaskSpace(task.id, { keep: false })
EOF
```

如果返回了 HuggingFace Papers 页面的语义快照，即说明 ego-browser 可用。

### 登录态

对 X.com、YouTube、即刻等需登录的站点，请先在 ego-browser 中完成登录；后续抓取可继承登录态。

---

## 三、兜底方案：`read_url_content`

当 `/ego-browser` 不可用、页面反爬、加载失败或登录态不足时，回退到 `read_url_content` 纯 HTTP 抓取。

### 特点

- 最轻量，无需浏览器
- 将 HTML 转换为 Markdown 返回

### 限制

- **无 JavaScript 渲染**：动态加载内容（如 X.com 时间线）可能无法获取
- **无法登录**：所有需登录平台均只能获取公开内容
- **适用平台有限**：最适合 HuggingFace Papers 等静态页面
- 使用后必须在报告"抓取备注"中说明回退原因

---

## 四、验证安装

### `/ego-browser` 验证

在 Bash 中执行上面的快速验证脚本，确认可正常打开页面并返回 `snapshotText` 输出。

### `read_url_content` 验证

使用 `read_url_content` 工具访问 `https://huggingface.co/papers`，确认返回了 Markdown 内容。

---

## 五、常见问题

### Q: 如何判断当前可用哪种工具？
A: Hermes 环境默认使用 `/ego-browser` skill；ego-browser 不可用、页面反爬或加载失败时回退到 `read_url_content`。详见 `search_workflow.md`。

### Q: 抓取时页面内容为空？
A: 确认 ego-browser 已启动且对应 task space 仍可用；heredoc 中可在 `openOrReuseTab` 后加 `await waitForLoad()` 或 `await waitForElement(selector)` 等待页面就绪。

### Q: X.com 需要登录怎么办？
A: 先在 ego-browser 中登录 `https://x.com`，后续抓取会继承登录态。未登录时可能只能获取有限公开内容。

### Q: HuggingFace 加载很慢？
A: 可能需要科学上网。确保代理设置正确，ego-browser 能正常访问 `https://huggingface.co/papers`。

### Q: 即刻搜索无结果或提示登录？
A: 即刻网页版需登录。先在 ego-browser 中登录 `https://web.okjike.com`，后续抓取可继承登录态；无登录态时可在 `user_config.md` 中将即刻设为 `❌` 禁用。

---

## 六、用户配置初始化

首次运行时，除了输出路径配置（`config.json`），还需初始化用户内容配置。

### Onboarding 流程

当 `~/.hot-info-crawler/user_config.md` 不存在时：

1. **复制模板**：将 skill 目录下的 `references/user_config_template.md` 复制到 `~/.hot-info-crawler/user_config.md`
2. **展示默认配置**：告知用户当前默认包含的主题、信息源和关注账号
3. **引导自定义**：询问用户是否需要修改：
   - 「是否需要增删检索主题？」
   - 「是否需要调整信息源开关？（如禁用即刻）」
   - 「是否需要修改关注的 X 账号列表？」
   - 「是否需要启用/禁用 Follow Builders Feed？」
4. **保存配置**：根据用户反馈修改 `user_config.md` 并保存
5. **确认**：展示最终配置摘要，确认后开始抓取

### 后续修改

用户随时可以直接编辑 `~/.hot-info-crawler/user_config.md` 文件来调整配置，无需重新运行 onboarding。配置格式详见 `references/user_config_template.md` 中的字段说明。
