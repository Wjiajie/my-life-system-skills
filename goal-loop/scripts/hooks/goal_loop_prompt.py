#!/usr/bin/env python3
import json
import os
import re
import sys
import traceback
from pathlib import Path

def safe_excepthook(exc_type, exc, tb):
    log_path = Path.home() / ".codex" / "goal-loop-hook-errors.log"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as log:
        log.write("\n[goal_loop_prompt.py]\n")
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

prompt = payload.get("prompt") or ""
cwd = Path(payload.get("cwd") or os.getcwd())
state_dir = cwd / ".goal-loop"
state_path = state_dir / "state.json"
is_restore = "继续 goal-loop" in prompt or "恢复 goal-loop" in prompt

triggered = (
    "goal-loop:on" in prompt
    or is_restore
    or "$goal-loop" in prompt
    or "[$goal-loop]" in prompt
    or "$my-goal" in prompt
    or "[$my-goal]" in prompt
    or re.search(r"(?<![\w-])my-goal(?![\w-])", prompt) is not None
    or re.search(r"(?<![\w-])goal-loop(?![\w-])", prompt) is not None
)

if not triggered:
    sys.exit(0)

goal = prompt
if "goal-loop:on" in goal:
    goal = goal.split("goal-loop:on", 1)[1].strip()

state_dir.mkdir(parents=True, exist_ok=True)

existing = {}
if state_path.exists():
    try:
        existing = json.loads(state_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        existing = {}

state = {
    "enabled": True,
    "iteration": int(existing.get("iteration", 0)) if is_restore and existing else 0,
    "max_iterations": int(existing.get("max_iterations", 5)) if existing else 5,
    "goal": existing.get("goal", goal.strip()) if is_restore else goal.strip(),
    "phase": "restore" if is_restore else "goal",
    "handoff_after_status": "unstable",
    "qa_fail_count": int(existing.get("qa_fail_count", 0)) if is_restore and existing else 0,
    "no_progress_count": int(existing.get("no_progress_count", 0)) if is_restore and existing else 0,
}

state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")

handoff_path = state_dir / "handoffs" / "latest.md"
handoff_context = ""
if is_restore and handoff_path.exists():
    handoff_context = f"""

检测到 goal-loop 交接文件：
{handoff_path}

如果这是新窗口恢复，请先使用 $context-restore 的恢复姿态读取该交接文件，再继续执行。
"""

context = f"""
Goal Loop 已启动。

固定流程：
1. 先按 $goal-loop 的 Goal Shape / Goal Fitness Check 规则，把用户目标整理为“本次会话完成时，应当已经 ...”这种最终状态；如宿主暴露原生 Goal 设置能力，按 Native Goal Bridge 对齐，否则用内部 durable objective 继续。
2. 再使用 $plan-eng-review，形成可拆解执行方案和 TODO 清单，并判断是否适合启动 subagent。
3. 执行 TODO。
4. 使用 $qa 查找潜在 bug 并修复。
5. 如本轮产生代码、配置或项目产物改动且准备 done/stop，先输出 GOAL_CHANGE_REFLECTION；每轮结束时必须把 GOAL_LOOP_STATUS 作为最后文本块。

必须输出：
GOAL_LOOP_STATUS:
phase: goal|plan|execute|qa|done|blocked|handoff_ready
goal_satisfied: true|false|unknown
qa_status: pass|fail|not_run|unknown
remaining_todos: <number|unknown>
next_action: stop|continue|ask_user|new_window
handoff_status: stable|unstable

当 `handoff_status: unstable` 时，hook 会先要求使用 $context-save 的上下文保存结构，将交接内容保存到 `.goal-loop/handoffs/`，然后提示用户新开窗口继续。
{handoff_context}
"""

print(json.dumps({
    "hookSpecificOutput": {
        "hookEventName": "UserPromptSubmit",
        "additionalContext": context.strip()
    }
}))
