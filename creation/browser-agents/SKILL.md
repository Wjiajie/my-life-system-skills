---
name: browser-agents
description: 用真实浏览器替用户完成任务：自动化、抓取、反复填表、测试 Web 应用、驱动需要登录态的站点。默认底座是 browser-harness（CDP 直连本机 Chrome，一步一个原子快照）；当任务形状是「普通 HTML/ARIA 页面上的目标导向 DOM 循环」（搜索、筛选、多字段表单、点击导航、滚动查找，尤其是步数多的重复劳动）且已配置 TYPESAFE_API_KEY 时，改走本仓库固定版本的 tools/jev-ultrafast（TypeSafe Jev 做「操作 + 目标」的 typed 决策，一个决策周期一次网络请求，默认不把截图喂给模型；动作集封闭为八个，视觉判断、上传下载、多标签、Shadow DOM/iframe 都在它之外）。Use when the user wants a real browser driven for them, a site scraped, a form filled repeatedly, a web app tested, or asks for the fastest browser agent.
---

# 浏览器任务

两层，别混用：`browser-harness` 是底座，网页任务默认走它；`jev-ultrafast` 是可选加速器，只在下面四条同时成立时才启用。

| 层 | 位置 | 前提 |
| --- | --- | --- |
| browser-harness | `uv tool install` 装到用户级，不进本仓库 | 本机 Chrome |
| jev-ultrafast | 本仓库 `tools/jev-ultrafast`（git submodule，锁定上游 commit） | Chrome + `TYPESAFE_API_KEY`（+ 文本模型 key） |

## 宿主自带浏览器能力时，优先用宿主的

动手前先看宿主给了什么。Codex 打包了一等公民的浏览器插件（`plugins."browser@openai-bundled"` 与 `plugins."chrome@openai-bundled"`，`BROWSER_USE_AVAILABLE_BACKENDS="chrome,iab"`），能点击、输入、带登录态；DeepSeek Harness 与 WorkBuddy 目前只有只读的 web 抓取能力，没有浏览器插件，也没有浏览器类 MCP 连接器。宿主自己能驱动浏览器时就用宿主的（`hot-info-crawler` 的写法就是这个思路），只有宿主没有浏览器能力时，才按下面两步起 browser-harness。
## 先解析仓库根

本 skill 通过符号链接安装到各宿主，skill 目录自身看不到 `tools/`。`git -C` 会把符号链接解析到真实路径，所以这条命令在 Codex / WorkBuddy / DeepSeek Harness 下都成立：

```powershell
$REPO = git -C "<this skill directory>" rev-parse --show-toplevel
$JEVA = Join-Path $REPO "tools/jev-ultrafast"
```

后面提到的 `examples/`、`tools/jev-ultrafast` 都相对 `$REPO`。子模块没拉下来时先 `git -C $REPO submodule update --init --recursive`。

## 第一步：接通浏览器（必做）

```powershell
uv tool install --python 3.12 --upgrade --force browser-harness
browser-harness --doctor
"print(page_info())" | browser-harness
```

第三行打印出当前页面信息就算接通。报 `permission-blocked` 或连不上时，在 Chrome 打开 `chrome://inspect/#remote-debugging`，勾选 Allow remote debugging for this browser instance，再重跑。

`browser-harness skill` 会把上游的工作流说明打到 stdout。需要细节时读它的输出，不要再把它安装成第二个 skill：本仓库的同步脚本只管理链接进来的 skill，多出来的目录会在 `-CleanPersonal` 时被当成个人 skill 备份走。

### 权限：Chrome 每次连接都会问一次，这是设计而非故障

Chrome 136 起在默认 profile 上关掉了远程调试，M144 起**每个 CDP 连接**都要弹一次 Allow，没有「永久允许」开关。官方 chrome-devtools-mcp 的 `--autoConnect` 文档明确写着同一个对话框每次都会弹。所以不要试着消除它，要减少连接次数：

- 本机已配常驻客户端 `tools/browser-harness/keep-alive.ps1`，Startup 里的 `browser-harness-keepalive.cmd` 会在登录时把它拉起来。它一直持有 daemon 和那条 CDP 连接，所以每个 Chrome 会话最多点一次 Allow，之后所有调用都复用这条连接。
- 它是否在跑：`(Get-CimInstance Win32_Process -Filter "Name='browser-harness.exe'" | Measure-Object).Count` 应 ≥ 1；心跳在 `~/.config/browser-harness/keep-alive.heartbeat`，日志在同目录的 `keep-alive.log`。
- 脚本只读当前标签页，不导航、不点击、不关标签；连接断了它会每 15 秒重连（重连会让 Chrome 再问一次）。
- 想要**完全不弹窗**的替代路径：用专用 Chrome，`chrome --user-data-dir=<专用目录> --remote-debugging-port=9333`，再设 `BU_CDP_URL=http://127.0.0.1:9333`。非默认 profile 既不触发 M136 锁定也不触发 M144 弹窗；代价是这个窗口是一套独立登录态。

## 第二步：判断要不要上 jev

四条同时成立才用 `jev-ultrafast`，否则用 browser-harness 直接做：

1. 任务是多步表单填写或多步导航这类循环，而不是读一篇文章。
2. 环境里有 `TYPESAFE_API_KEY`（`https://console.typesafe.ai/keys`）。策略模型端点写死在代码里，没有 key 就没有降级路径。
3. 有文本模型 key 供 `TYPE_TEXT` 用。不配的话默认走 DeepSeek（`TEXT_MODEL_BASE_URL=https://api.deepseek.com/v1`、`TEXT_MODEL=deepseek-chat`），可以直接复用已有的 DeepSeek key；也可以按 `.env.example` 换成 OpenRouter 的 `inception/mercury-2.5` 并设 `TEXT_MODEL_REASONING=none`。
4. 任务不需要代理、验证码、多浏览器并行，那些属于 Browser Use Cloud 的范围。

### 安装（一次性）

```powershell
$env:UV_PROJECT_ENVIRONMENT = "$env:USERPROFILE\.jev-ultrafast-venv"   # 虚拟环境放仓库外，别让仓库再胖一次
Set-Location $JEVA
uv sync --frozen
Copy-Item .env.example .env    # 填 TYPESAFE_API_KEY 与 TEXT_MODEL_API_KEY
```

uv 自带 Python，本机 `python` 命令不可用不影响；上游 `requires-python` 是 `>=3.12`。`.env` 与 `.venv` 都在上游 `.gitignore` 里。

### 跑起来（从观察到手放开）

```powershell
# 1) 观察器：元素表、操作与目标概率、每步耗时，先手动 Choose next 看它怎么想
uv run --env-file .env jev            # http://127.0.0.1:8766

# 2) 单次任务：--goal 可重复，按顺序执行
uv run --env-file .env python examples/run.py --url <URL> --goal "<一个明确的目标>"
```

```python
# 3) 库里调用
from jev_ultrafast import Agent

with Agent("https://example.com/form", "填完这个表单并提交，停在确认页") as agent:
    for state in agent.run():
        print(state["elapsed_ms"], state["status"], len(state["history"]))
```

`status` 取值 `ready` / `predicted` / `done` / `blocked`，循环在 `done` 或 `blocked` 处结束。

## 什么时候交给 jev，什么时候自己做

jev 不是「更快的浏览器驱动」，它是把 observe→decide 这一步的 LLM 换成 typed 决策的策略。动作集是封闭的八个：`CLICK`、`TYPE_TEXT`、`SELECT`、`SCROLL_UP`、`SCROLL_DOWN`、`WAIT`、`DONE`、`BLOCKED`（见 `jev_ultrafast/snapshot.js` 与 `model.py`，边界由代码决定，不是配置）。

| 交给 jev | 自己做（browser-harness helpers + `js()`） |
| --- | --- |
| 普通 HTML/ARIA 页面上的搜索、筛选、多字段表单、点击导航、滚动查找 | 需要「看」的判断：布局、图表、canvas、验证码、视觉核对（默认不把截图喂给模型） |
| 步数多的重复循环：每个决策一次请求、70 到 500 ms | 上传下载、文件对话框、标签页与窗口管理、键盘快捷键 |
| 页面较大但只需可见文本的任务 | Shadow DOM / Web Components、iframe、嵌套滚动、弹出新标签（上游 README 明说在 MVP 之外） |
| | 收尾与验证：`done` 只是策略判断，最终结果必须独立核对 |

成本有硬上限，不会失控：每次决策的输入是可见文本（≤6000 字符）+ 元素表（≤250 个）+ 规则/目标/最近 10 步历史，约 4 到 8k tokens，输出计费为 0。按 $0.042/MTok 算每步约 $0.0003，跑满内置的 120 次决策预算约 $0.04；`TEXT_MODEL` 只在填字段时调用，默认 DeepSeek。钱不是瓶颈，路由只看覆盖面和可靠性。
## 完成判据

- browser-harness 路径：`page_info()`（或自行编写的 helper）显示的页面状态符合目标，且目标动作已经在页面上生效。
- jev 路径：`run.py` 打印出每步的 `ms / actions / status` 与最终 URL。`done` 只说明策略认为完成，不是任务成功的证据，必须独立核对真实结果；上游 `examples/flights.py --keep-open` 就是范例，它自己检查航线、日期与可见结果，trace 写到 `artifacts/flights/latest`。

## 硬规则

- 不给站点写专用脚本、不硬编码字段值，目标只用自然语言表达。
- 不让模型产出选择器、坐标、Shell 命令或可执行 JavaScript；每个目标都必须来自本步观察到的元素。
- 浏览器写操作失败不重试；先记录执行，再观察结果。
- 只操作自己开的标签页：先 `new_tab(<url>)`，用 `current_tab()` 或 `page_info()` 确认附着的是它，再 `goto_url()` / `close_tab()`。`goto_url()` 导航的是**当前附着**的标签，无参数的 `close_tab()` 关掉的也是当前附着的标签；不先确认就会覆盖或关掉用户自己的页面（开发这个 skill 时就误关过一个用户的标签）。
- 需要用户登录态的站点，动手前确认可以用他本人已登录的浏览器；支付、下单、删除、发帖这类不可逆动作要先拿到明确许可。
- 凭据只放 `.env`，不进对话、不进提交。

## 排查

| 现象 | 处理 |
| --- | --- |
| `permission-blocked`，连不上 Chrome | 在 `chrome://inspect/#remote-debugging` 勾选后重试；`browser-harness --doctor` |
| `TYPE_TEXT needs TEXT_MODEL_API_KEY` | 缺文本模型 key，默认端点就是 DeepSeek，填 DeepSeek key 即可 |
| `Model provider returned HTTP nnn` 或 `Invalid TypeSafe response` | TypeSafe key、`TYPESAFE_MODEL` 或文本模型配置有误；此时不会执行任何动作 |
| 一直 `blocked` | 页面状态与目标不匹配：先看观察器的元素表与概率，再改 goal 措辞，不要往代码里加站点逻辑 |
| 只是想读一个网页 | 不用起浏览器，用宿主自带的 web / HTTP 工具 |
