---
name: browser-use
description: |
  Drive a real Chrome browser through the Browser MCP server (`@browsermcp/mcp`)
  — the user's own Chrome profile with all logged-in sessions, cookies, and
  extensions. Use this skill whenever the user wants the agent to open, click,
  type, fill, screenshot, scrape, login to, or visually test a live webpage in a
  real browser. Triggers on phrases like "打开这个网站", "访问 xxx", "登录 xxx 抓一下",
  "看一下移动端样式", "截图给我", "填一下表单", "点这个按钮", "open this URL",
  "browse to", "log into X and get Y", "screenshot this page", "scrape this site",
  "click the X button", "fill in the form", "read the console errors". Do NOT
  use for purely textual fetches where the page is already a static doc — prefer
  `webfetch` / `matrix_web_search` first (cheaper). Do NOT use for headless CI /
  E2E test rigs with no human in the loop — prefer the `playwright` MCP server
  (clean isolated profile). If Browser MCP is not set up, fall back to the
  built-in `mavis-browser` (drives the user's real Chrome via the local broker)
  or `playwright` MCP (headless), but say so explicitly so the user knows.
---

# browser-use

Browser MCP is the **default** browser automation path in this Mavis setup. It
adapts Playwright MCP to control the user's existing Chrome (not a fresh
headless instance), so logged-in sessions, cookies, saved passwords, and the
real browser fingerprint all carry over — that's the whole reason it exists.

## Inputs to collect

- **Target URL** (or the page the user already has open in Chrome).
- **Action intent**: open / click / type / fill form / screenshot / read text / read console / scrape data.
- **Element ref** for click / type / fill — get it from `browser_snapshot` first, not from a guessed CSS selector.
- Whether to keep the tab connected after the task — most tasks don't need it, but tell the user when you do.

If the user says "看一下这个网站" without a URL, ask for the URL. If they say
"我刚打开了一个网页", assume the active tab is the target and tell them to make
sure the Browser MCP extension is connected on that tab (see "Single-tab
gotcha" below).

## Setup (one-time)

Only run this if `mavis mcp list` does **not** show `browsermcp` as `enabled`.

1. **Install the Chrome extension** "Browser MCP — Automate your browser" from
   the Chrome Web Store (https://chromewebstore.google.com/detail/browser-mcp-automate-your/bjfgambnhccakkhmkepdoekmckoijdlc).
   Pin the icon. Open the target tab, click the icon, click **Connect**.

2. **Register the MCP server** with Mavis:

   ```bash
   mavis mcp add browsermcp '{"command":"npx","args":["-y","@browsermcp/mcp@latest"]}'
   ```

   Then sync so the tools become first-class:

   ```bash
   mavis mcp sync
   ```

3. **Verify**: `mavis mcp list` should show `browsermcp` with `authStatus: not_required`
   and a populated `tools` list. `mavis mcp tools browsermcp` should list the
   browser_* tools.

## Procedure

1. **Pick the right tool tier** before issuing a single call:

   | Situation | Use |
   |---|---|
   | User's logged-in profile is required (Gmail / GitHub / SaaS dashboards / anything with anti-bot) | **Browser MCP** (this skill, default) |
   | Headless CI / E2E test / fresh isolated profile is required | `playwright` MCP |
   | User explicitly wants the Mavis broker to drive their real Chrome (e.g. native-host debug) | built-in `mavis-browser` skill |
   | Pure text fetch of a static / JS-light page | `webfetch` or `matrix_web_search` (cheaper, no browser spin-up) |
   | Last-resort desktop takeover | `cu` (Computer Use) MCP |

2. **Navigate first**: `browser_navigate { url }`. Wait for page-ready (snapshot /
   screenshot returning non-empty) before interacting.

3. **Snapshot before every interaction**: call `browser_snapshot` to get
   accessibility-tree nodes with stable `ref` ids. **Use those refs, not CSS
   selectors, in `browser_click` / `browser_type` / `browser_select`.** CSS
   selectors break on rerender; refs do not.

4. **Interact**: `browser_click`, `browser_type`, `browser_hover`,
   `browser_select`, `browser_press_key`, `browser_scroll`. After each
   interaction, re-snapshot if the DOM may have changed.

5. **Read state** as needed: `browser_screenshot` (PNG of the current viewport),
   `browser_snapshot` (full a11y tree with refs), `browser_get_console_logs`
   (page console). For scrolling, use `browser_press_key { key: "PageDown" }`
   or `End` — there is no native scroll tool.

6. **End the session**: Browser MCP has no `close` tool. Just stop calling —
   the connection follows the tab. Tell the user to close the tab themselves
   when they're done, or to click the extension icon to disconnect.

7. **Return the deliverable** as a media tag for screenshots, plain text for
   scraped data, and a one-line status for clicks/types.

## Tool reference

All tools are exposed by the `browsermcp` MCP server (12 total, listed below).
Call them via `mavis mcp call browsermcp <tool> '<json>'` or as first-class
native tools after `mavis mcp sync`.

| Tool | Args | Purpose |
|---|---|---|
| `browser_navigate` | `{url}` | Go to URL; waits for page-ready |
| `browser_go_back` | `{}` | Back in history |
| `browser_go_forward` | `{}` | Forward in history |
| `browser_snapshot` | `{}` | Accessibility tree with `ref=` ids — call this before any click / type |
| `browser_click` | `{element, ref}` | Click element by snapshot ref |
| `browser_hover` | `{element, ref}` | Hover (reveals menus, triggers listeners) |
| `browser_type` | `{element, ref, text, submit}` | Type into input/textarea; `submit: true` presses Enter after |
| `browser_select_option` | `{element, ref, values[]}` | Pick `<select>` option(s) |
| `browser_press_key` | `{key}` | Single keypress (`Enter`, `Escape`, `PageDown`, `ArrowDown`, etc.) |
| `browser_wait` | `{time}` | Wait N seconds |
| `browser_screenshot` | `{}` | PNG of the current viewport — viewable by the model |
| `browser_get_console_logs` | `{}` | Page console messages (errors, warnings, logs) |

The server is the source of truth — if `mavis mcp tools browsermcp` shows
different names or extra tools, trust that listing over this table.

**No `browser_close` / `browser_evaluate` / `browser_scroll` / `browser_read_links`**:
this server intentionally omits them. If you need to close the tab, ask the
user to close it. If you need to scroll, use `browser_press_key { key: "End" }`
or `PageDown`. If you need to run JS, fall back to `playwright` MCP for that
single step.

## Single-tab gotcha (important)

Browser MCP is **bound to one tab per session**. The user must click the
extension icon in the toolbar on the specific tab they want automated and hit
**Connect**. After that:

- All `browser_*` tools operate on that tab and only that tab.
- If the action opens a new tab (e.g. `target="_blank"`), the new tab has **no
  MCP connection** — the extension doesn't auto-track it. Ask the user to
  click Connect on the new tab too, or restructure the flow to stay in-tab.
- If the user navigates the connected tab manually to a different URL, that's
  fine — the connection follows the tab.
- If the user closes the tab, the connection dies. Re-Connect is needed.

If the user reports "I clicked but nothing happened" or "the page didn't open",
**first** check whether the connection is still live (extension popup should
show "Connected"). Then check `browser_snapshot` to see what page the tool
sees — the LLM's "view" and the user's view are the same when connected.

## Output contract

- **Screenshot requested**: return a `<media src="..." />` tag with the saved
  PNG path; do not just describe what you saw.
- **Scrape requested**: return the extracted data as markdown table or JSON,
  depending on what the user asked for. If a CSV is implied, write to a file
  and return its path.
- **Action only** (click, type, login, …): return a one-line confirmation
  (`navigated to X`, `clicked Y`, `logged in as Z`) and optionally a
  screenshot of the post-action state.
- Always include the **final URL** in the response — the page may have
  redirected, and the user wants to know where they ended up.

## Failure handling

| Symptom | Likely cause | Fix |
|---|---|---|
| `tool not found: browser_navigate` | `browsermcp` not registered or not synced | `mavis mcp add browsermcp '...'` then `mavis mcp sync` |
| `Browser MCP extension is not connected` | Extension popup not showing green | User must click the extension icon → Connect on the target tab |
| Click / type hits the wrong element | Stale ref from a previous snapshot | Call `browser_snapshot` again, use the new ref |
| `ref` not found | Page DOM changed since snapshot | Re-snapshot, retry |
| Bot detection / 403 / login wall on a page that "should" work | Almost never happens with Browser MCP (uses real fingerprint) | If it does, the site has strong detection; consider asking the user to do the login step manually then continue |
| New tab opened, tools "stop working" | New tab has no MCP connection | Have user click Connect on the new tab |
| Need to test mobile viewport | Browser MCP does not expose device emulation | Resize the Chrome window to 375×812 with `cu` (Computer Use) MCP, then screenshot |
| Need to scroll a long page | No native scroll tool | `browser_press_key { key: "PageDown" }` repeatedly, or `End` to jump to bottom |
| Need to run arbitrary JS in the page | No `browser_evaluate` | Fall back to `playwright` MCP for that one step, or extract from the snapshot / screenshot |

## Examples

**Input**: "打开 https://www.jiajiewu.top 看一下首页布局"

**Flow**: `browser_navigate` → wait for ready → `browser_screenshot` →
return image. If user wants "移动端样式": resize the Chrome window with
`cu desktop_window_resize` to 375×812, then re-screenshot.

**Input**: "登录 github.com 看一下我的 issue 列表"

**Flow**: confirm extension is connected on a github.com tab →
`browser_navigate https://github.com` → `browser_snapshot` → find "Sign in"
button ref → `browser_click` → snapshot the login form → `browser_type` on
username / password refs → `browser_click` on submit → wait → snapshot the
issue list → return as markdown.
