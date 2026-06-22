#!/usr/bin/env bash
# scripts/cleanup-ego-spaces.sh
#
# 关闭所有 ego-browser task space 中 ownership==='agent' && createdBy==='agent' 的实例。
# 这是 hot-info-crawler 的硬约束清理脚本（见 SKILL.md「清理 ego-browser task space」段）。
#
# 失败处理：
#   - 找不到 ego-browser 二进制 → 退出码 2 + 提示用户检查安装
#   - ego-browser nodejs 调用本身失败 → 退出码 1 + 输出原始错误
#   - 关闭后仍有 agent-owned 残留 → 退出码 3（主代理必须排查）
#
# 用法：
#   bash scripts/cleanup-ego-spaces.sh           # 列出并关闭所有 agent-owned space
#   bash scripts/cleanup-ego-spaces.sh --dry-run # 只列出，不关
#   bash scripts/cleanup-ego-spaces.sh --quiet   # 静默模式（只输出错误）
#
# 环境变量：
#   EGO_BROWSER_BIN  覆盖 ego-browser 二进制路径（默认自动探测）
#   SKIP_CLEANUP     设为 1 时跳过清理（仅打印当前 space 列表）

set -uo pipefail

DRY_RUN=0
QUIET=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --quiet)   QUIET=1 ;;
    -h|--help)
      cat <<'USAGE'
Usage: bash scripts/cleanup-ego-spaces.sh [OPTIONS]

关闭所有 ego-browser task space 中 ownership==='agent' && createdBy==='agent' 的实例。
hot-info-crawler 的硬约束清理脚本（见 SKILL.md「清理 ego-browser task space」段）。

OPTIONS:
  --dry-run    只列出 agent-owned space，不关闭
  --quiet      静默模式（只输出错误和最终 JSON）
  -h, --help   显示本帮助

ENVIRONMENT:
  EGO_BROWSER_BIN  覆盖 ego-browser 二进制路径（默认自动探测 PATH / ~/.local/bin / 框架内置）
  SKIP_CLEANUP     设为 1 时跳过清理（仅打印当前 space 列表）

EXIT CODES:
  0  清理完成，agent-owned space 清零
  1  ego-browser 调用本身失败
  2  找不到 ego-browser 二进制
  3  关闭后仍有 agent-owned 残留（主代理必须排查）

USAGE
      exit 0
      ;;
    *) echo "ERROR: unknown arg: $arg" >&2; exit 1 ;;
  esac
done

log() {
  [[ $QUIET -eq 1 ]] && return 0
  echo "$@"
}

# 1. 找 ego-browser 二进制
find_ego_browser() {
  if [[ -n "${EGO_BROWSER_BIN:-}" ]]; then
    if [[ -x "$EGO_BROWSER_BIN" ]]; then
      echo "$EGO_BROWSER_BIN"
      return 0
    fi
    echo "ERROR: EGO_BROWSER_BIN=$EGO_BROWSER_BIN not executable or not found" >&2
    return 2
  fi

  # 优先级：PATH → 已知 symlink → 框架内置二进制
  local candidates=(
    "ego-browser"
    "$HOME/.local/bin/ego-browser"
    "/Applications/ego lite.app/Contents/Frameworks/ego Framework.framework/Versions/0.4.2.15/Helpers/ego-browser"
  )
  for c in "${candidates[@]}"; do
    if command -v "$c" >/dev/null 2>&1; then
      command -v "$c"
      return 0
    fi
    if [[ -x "$c" ]]; then
      echo "$c"
      return 0
    fi
  done

  echo "ERROR: ego-browser not found. Set EGO_BROWSER_BIN or install ego lite." >&2
  return 2
}

EGO_BIN=$(find_ego_browser) || exit $?
log "using ego-browser: $EGO_BIN"

# 2. 跑 heredoc：列 + 关 + 验证
SKIP_CLEANUP="${SKIP_CLEANUP:-0}"

"$EGO_BIN" nodejs <<EOF
const spaces = await listTaskSpaces()
const scratch = spaces.filter(s => s.ownership === 'agent' && s.createdBy === 'agent')
const userOwned = spaces.filter(s => s.ownership === 'user')

if (scratch.length === 0) {
  cliLog(JSON.stringify({
    status: 'CLEAN',
    agent_owned_before: 0,
    user_owned_remaining: userOwned.length,
    message: 'no agent-owned task space to close',
  }, null, 2))
  process.exit(0)
}

cliLog('agent-owned spaces to close: ' + scratch.length)
cliLog(JSON.stringify(scratch.map(s => ({ id: s.id, name: s.name, recent: s.recentTabTitles?.[0] || null })), null, 2))

const SKIP_CLEANUP = '$SKIP_CLEANUP' === '1'
const DRY_RUN = '$DRY_RUN' === '1'

if (SKIP_CLEANUP || DRY_RUN) {
  cliLog('skipping cleanup (SKIP_CLEANUP or DRY_RUN set)')
  process.exit(0)
}

const closed = []
const skipped = []
for (const s of scratch) {
  try {
    const r = await completeTaskSpace(s.name, { keep: false })
    if (r.done) closed.push(s.name)
    else skipped.push({ name: s.name, reason: r.skipped || 'unknown' })
  } catch (e) {
    skipped.push({ name: s.name, reason: 'exception: ' + e.message })
  }
}

const remaining = await listTaskSpaces()
const agentLeftover = remaining.filter(s => s.ownership === 'agent' && s.createdBy === 'agent')
const userOwnedAfter = remaining.filter(s => s.ownership === 'user')

cliLog(JSON.stringify({
  status: agentLeftover.length === 0 ? 'CLEAN' : 'LEAKED',
  total_before: spaces.length,
  closed: closed.length,
  closed_names: closed,
  skipped: skipped,
  agent_leftover: agentLeftover.length,
  agent_leftover_names: agentLeftover.map(s => s.name),
  user_owned_remaining: userOwnedAfter.length,
}, null, 2))

if (agentLeftover.length > 0) {
  process.exit(3)  // 主代理必须排查
}
EOF
exit_code=$?

case $exit_code in
  0) log "[OK] ego-browser task space cleanup done" ;;
  3) echo "ERROR: agent-owned space leaked after cleanup. Check agent_leftover_names above." >&2 ;;
  *) echo "ERROR: ego-browser nodejs exited with code $exit_code" >&2 ;;
esac

exit $exit_code
