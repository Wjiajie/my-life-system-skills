# 安装与配置指南

本技能支持按运行环境选择浏览器工具并逐级回退。Codex 环境默认优先使用内置的 `browser-use:browser` 插件；首次使用时还需初始化用户配置文件。

---

## 一、前置要求

- 已安装 **Google Chrome** 浏览器
- 已安装 **Node.js**（v18+）和 **npm**

---

## 二、🥇 Codex 默认方案：browser-use:browser

在 Codex 环境中，默认优先使用内置的 `browser-use:browser` 插件执行页面导航、截图、DOM/页面检查和交互操作。

### 特点

- **Codex 内置**，无需额外安装 Chrome 扩展或 MCP Server
- 适合本地 Codex 工作流中的网页打开、滚动、点击、截图和内容检查
- 当需要登录态时，请先在 Codex 内置浏览器或对应浏览器环境中完成登录

### 验证

在 Codex 中尝试打开 `https://huggingface.co/papers`，确认页面可访问并可提取页面内容。

---

## 三、🥈 备选方案：Browser MCP

`browser_mcp` 是基于 Chrome DevTools Protocol 的 MCP 服务，可复用浏览器的已登录会话，适合需要登录的平台（X.com、即刻等）。

### 1. 安装 Chrome 扩展

1. 打开 Chrome 网上应用店，搜索 **"Browser MCP"** 或直接访问扩展页面
2. 点击 **"添加到 Chrome"** 安装扩展
3. 安装完成后，在 Chrome 工具栏中找到 Browser MCP 图标

### 2. 启动连接

1. 点击 Chrome 工具栏中的 **Browser MCP** 扩展图标
2. 点击 **"Connect"** 按钮建立连接
3. 确认状态显示为 **已连接（Connected）**

> ⚠️ **重要**：每次重启 Chrome 后，都需要重新点击 "Connect" 建立连接。

### 3. 配置 MCP Server

在 AI 客户端中注册 `browser_mcp`：

**Claude Desktop：**
```json
{
  "mcpServers": {
    "browser_mcp": {
      "command": "npx",
      "args": ["-y", "@anthropic/browser-mcp"]
    }
  }
}
```

**Cursor：**
```json
{
  "mcpServers": {
    "browser_mcp": {
      "command": "npx",
      "args": ["-y", "@anthropic/browser-mcp"]
    }
  }
}
```

> 📝 具体的 MCP 包名和参数可能随版本变化，请参考 `browser_mcp` 官方文档获取最新信息。

### 4. 可用工具

| 工具                | 用途                           |
| ------------------- | ------------------------------ |
| `browser_navigate`  | 导航到指定 URL                 |
| `browser_snapshot`  | 获取当前页面的结构化快照       |
| `browser_click`     | 点击页面元素                   |
| `browser_type`      | 在输入框中输入文本             |
| `browser_scroll`    | 滚动页面获取更多内容           |

---

## 四、🥉 备选方案：browser_subagent

当 `browser-use:browser` 和 `browser_mcp` 均不可用时，自动回退到 `browser_subagent`。

### 特点

- **Antigravity 内置**，无需额外安装或配置
- **任务驱动**：描述"要做什么"，子代理自动完成导航、提取等操作
- **独立会话**：每次启动一个新的浏览器实例，**不保留登录状态**

### 使用方式

通过 `browser_subagent` 工具下发任务描述，例如：

> 导航到 `https://huggingface.co/papers`，提取页面中的论文列表，包括标题、链接和点赞数。返回前 10 条结果。

### 限制

- 无法复用已登录会话，**即刻**等需登录平台可能无法获取完整内容
- X.com 未登录时可能只能获取有限内容

---

## 五、兜底方案：read_url_content

当以上浏览器方案均不可用时，回退到 `read_url_content` 进行纯 HTTP 内容抓取。

### 特点

- 最轻量，无需浏览器
- 将 HTML 转换为 Markdown 返回

### 限制

- **无 JavaScript 渲染**：动态加载内容（如 X.com 时间线）可能无法获取
- **无法登录**：所有需登录平台均只能获取公开内容
- **适用平台有限**：最适合 HuggingFace Papers 等静态页面

---

## 六、验证安装

### browser-use:browser 验证

在 Codex 中打开 `https://huggingface.co/papers`，确认可以访问页面并提取页面内容。

### browser_mcp 验证

1. 确认 Chrome 扩展显示 "Connected" 状态
2. 尝试调用 `browser_navigate` 访问 `https://x.com`
3. 使用 `browser_snapshot` 获取页面快照，确认返回内容

### browser_subagent 验证

使用 `browser_subagent` 工具，下发任务：访问 `https://huggingface.co/papers` 并返回页面标题。

### read_url_content 验证

使用 `read_url_content` 工具访问 `https://huggingface.co/papers`，确认返回了 Markdown 内容。

---

## 七、常见问题

### Q: 如何判断当前可用哪种工具？
A: 执行流程会自动检测：Codex 环境先使用 `browser-use:browser`，不可用时再尝试 `browser_mcp`，失败则回退到 `browser_subagent`，再失败则回退到 `read_url_content`。详见 `search_workflow.md`。

### Q: 抓取时页面内容为空？
A: Codex 环境下先确认 `browser-use:browser` 打开的页面已加载完成；如果使用 `browser_mcp`，确认扩展已点击 "Connect"，且 Chrome 窗口未被最小化。

### Q: X.com 需要登录怎么办？
A: Codex 环境优先使用 `browser-use:browser`，请先在对应浏览器环境中登录 X.com。非 Codex 环境使用 `browser_mcp` 时，先在 Chrome 中手动登录 X.com。未登录时可能只能获取有限公开内容。

### Q: HuggingFace 加载很慢？
A: 可能需要科学上网。确保代理设置正确，Chrome 能正常访问 `https://huggingface.co/papers`。

### Q: 即刻搜索无结果或提示登录？
A: 即刻网页版需登录。Codex 环境优先使用 `browser-use:browser`，请先在对应浏览器环境中登录 `https://web.okjike.com`；非 Codex 环境使用 `browser_mcp` 时先在 Chrome 中登录。无登录态时可在 `user_config.md` 中将即刻设为 `❌` 禁用。

---

## 八、用户配置初始化

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
