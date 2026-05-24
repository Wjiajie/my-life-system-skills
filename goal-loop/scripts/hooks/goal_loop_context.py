#!/usr/bin/env python3
import json
import os
import sys
import traceback
from pathlib import Path

def safe_excepthook(exc_type, exc, tb):
    log_path = Path.home() / ".codex" / "goal-loop-hook-errors.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as log:
        log.write("\n[goal_loop_context.py]\n")
        traceback.print_exception(exc_type, exc, tb, file=log)
    os._exit(0)

sys.excepthook = safe_excepthook

def read_payload():
    raw_bytes = sys.stdin.buffer.read()
    try:
        raw = raw_bytes.decode("utf-8-sig").lstrip("\ufeff")
    except UnicodeDecodeError:
        raw = raw_bytes.decode(errors="replace").lstrip("\ufeff")
    if not raw.strip():
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None

payload = read_payload()
if not payload:
    sys.exit(0)

cwd = Path(payload.get("cwd") or os.getcwd())
state_path = cwd / ".goal-loop" / "state.json"

if not state_path.exists():
    sys.exit(0)

state = json.loads(state_path.read_text(encoding="utf-8"))
if not state.get("enabled"):
    sys.exit(0)

handoff_path = cwd / ".goal-loop" / "handoffs" / "latest.md"
handoff_context = ""
if handoff_path.exists():
    handoff_context = f"""

检测到 goal-loop 交接文件：
{handoff_path}

如果用户要求继续 goal-loop，先使用 $context-restore 的恢复姿态读取该交接文件，再继续：
$plan-eng-review -> 执行 TODO -> $qa -> GOAL_LOOP_STATUS。
"""

context = f"""
当前会话存在 Goal Loop。

目标：
{state.get("goal", "")}

当前轮次：{state.get("iteration", 0)} / {state.get("max_iterations", 5)}

每轮必须遵循：
$goal-loop 目标整理 / Goal Fitness Check / Native Goal Bridge -> $plan-eng-review / Subagent Fit Check -> 执行 TODO -> $qa -> 必要时 GOAL_CHANGE_REFLECTION -> GOAL_LOOP_STATUS。
{handoff_context}
"""

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "SessionStart",
        "additionalContext": context.strip()
    }
}))
