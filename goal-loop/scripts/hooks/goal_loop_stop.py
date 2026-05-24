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
        log.write("\n[goal_loop_stop.py]\n")
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

last = payload.get("last_assistant_message") or ""
iteration = int(state.get("iteration", 0))
max_iterations = int(state.get("max_iterations", 5))

def field(name):
    match = re.search(rf"^{name}:\s*(.+)$", last, re.MULTILINE)
    return match.group(1).strip() if match else None

def to_int(value):
    if value is None:
        return None
    value = value.strip().lower()
    if value in ("unknown", "none", "-"):
        return None
    try:
        return int(value)
    except ValueError:
        return None

phase = field("phase")
goal_satisfied = field("goal_satisfied")
qa_status = field("qa_status")
remaining = field("remaining_todos")
next_action = field("next_action")
handoff_status = field("handoff_status")

if not any([phase, goal_satisfied, qa_status, remaining, next_action, handoff_status]):
    print(json.dumps({
        "systemMessage": "Goal Loop enabled, but no GOAL_LOOP_STATUS block was found. Not auto-continuing for safety."
    }))
    sys.exit(0)

if phase == "handoff_ready" or next_action == "new_window":
    state["enabled"] = False
    state["phase"] = "handoff_ready"
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    sys.exit(0)

if phase == "blocked" or next_action == "ask_user":
    sys.exit(0)

if handoff_status == "unstable":
    handoff_dir = cwd / ".goal-loop" / "handoffs"
    latest_path = handoff_dir / "latest.md"
    handoff_dir.mkdir(parents=True, exist_ok=True)
    state["phase"] = "handoff_requested"
    state["enabled"] = True
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    reason = f"""
Goal Loop 判断当前状态为 unstable，需要交接到新窗口。

不要继续实现代码。请先按 $context-save 的信息结构保存上下文。此处是 goal-loop handoff 场景：只复用 $context-save 的采集与摘要结构，写入路径由 goal-loop 覆盖，必须写入 goal-loop 专用位置，而不是 gstack 默认 checkpoints。

请执行：
1. 使用 $context-save 的保存思路整理上下文，包含：
   - 当前目标
   - repo / branch / 当前工作树状态
   - 已完成事项
   - 关键决策
   - 剩余 TODO
   - 最近 QA / 验证结果
   - 关键文件、函数、命令、风险和阻塞点
   - 新窗口恢复后的第一步
2. 写入 Markdown 文件：
   `{handoff_dir}/<YYYYMMDD-HHMMSS>-goal-loop-handoff.md`
3. 同步写入或更新：
   `{latest_path}`
4. 最后在回复中提示用户新开同一项目空间的 Codex 窗口，并给出这段提示词：

```text
请使用 $context-restore 恢复 goal-loop 上下文。
如果默认 gstack checkpoint 中没有对应记录，请读取 `.goal-loop/handoffs/latest.md` 作为 goal-loop 专用交接上下文。
恢复后继续目标：
{state.get("goal", "")}

继续执行：
$plan-eng-review -> 执行剩余 TODO -> $qa -> 判断是否继续。
每轮结束继续输出 GOAL_LOOP_STATUS。
```

回复末尾必须输出：
GOAL_LOOP_STATUS:
phase: handoff_ready
goal_satisfied: false
qa_status: {qa_status or "unknown"}
remaining_todos: {remaining or "unknown"}
next_action: new_window
handoff_status: stable
"""
    print(json.dumps({
        "decision": "block",
        "reason": reason.strip()
    }))
    sys.exit(0)

if goal_satisfied == "true" and qa_status == "pass" and remaining in ("0", "none"):
    state["enabled"] = False
    state["phase"] = "done"
    state["qa_fail_count"] = 0
    state["no_progress_count"] = 0
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    sys.exit(0)

if iteration >= max_iterations:
    state["enabled"] = False
    state["phase"] = "max_iterations"
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({
        "systemMessage": f"Goal Loop reached max_iterations={max_iterations}. Stopping automatic continuation."
    }))
    sys.exit(0)

remaining_int = to_int(remaining)
last_remaining = to_int(str(state.get("last_remaining_todos"))) if state.get("last_remaining_todos") is not None else None
if remaining_int is not None and last_remaining is not None and remaining_int >= last_remaining:
    state["no_progress_count"] = int(state.get("no_progress_count", 0)) + 1
elif remaining_int is not None:
    state["no_progress_count"] = 0

if remaining_int is not None:
    state["last_remaining_todos"] = remaining_int

if qa_status == "fail":
    state["qa_fail_count"] = int(state.get("qa_fail_count", 0)) + 1
elif qa_status in ("pass", "not_run"):
    state["qa_fail_count"] = 0

state["iteration"] = iteration + 1
state["phase"] = "continue"
state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False), encoding="utf-8")

stability_hint = ""
if int(state.get("no_progress_count", 0)) >= 2 or int(state.get("qa_fail_count", 0)) >= 2:
    stability_hint = f"""

稳定性自检已触发：
- no_progress_count={state.get("no_progress_count", 0)}
- qa_fail_count={state.get("qa_fail_count", 0)}

请先判断是否满足 unstable 条件。若连续两轮 TODO 没有减少、连续两次 QA 失败且原因相同或高度相似，或同一文件/模块反复修改仍未通过验证，应输出 `handoff_status: unstable`，让 hook 进入新窗口交接流程。
"""

reason = f"""
Goal Loop 第 {iteration + 1} 轮继续。

目标：
{state.get("goal", "")}

上一轮状态：
phase={phase}
goal_satisfied={goal_satisfied}
qa_status={qa_status}
remaining_todos={remaining}
next_action={next_action}
handoff_status={handoff_status}

请继续固定流程：
1. 如目标仍不清晰，先按 $goal-loop 的 Goal Shape / Goal Fitness Check 规则修正最终状态，并按 Native Goal Bridge 对齐可用的原生 Goal 能力。
2. 使用 $plan-eng-review 更新执行方案和 TODO，并判断是否适合启动 subagent。
3. 执行剩余 TODO。
4. 使用 $qa 验证并修复。
5. 如本轮产生代码、配置或项目产物改动且准备 done/stop，先输出 GOAL_CHANGE_REFLECTION。
6. 最后输出 GOAL_LOOP_STATUS，且不要在状态块后追加解释。

如果需要用户确认、权限、认证或产品判断，输出 phase: blocked 和 next_action: ask_user。
如果你判断当前窗口上下文已经不稳定，或连续修复/验证无法收敛，请输出 handoff_status: unstable。
{stability_hint}
"""

print(json.dumps({
    "decision": "block",
    "reason": reason.strip()
}))
