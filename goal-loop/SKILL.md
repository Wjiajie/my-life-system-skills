---
name: goal-loop
description: 创建或更新当前会话目标，并驱动 Codex 在同一项目空间内自动执行 goal-loop：整理最终状态、运行 plan-eng-review 制定 TODO、执行实现、运行 qa 验证修复、判断是否继续；当状态稳定时在当前窗口续跑，当 handoff_status 标记为 unstable 时按 context-save 结构保存 goal-loop 专用交接上下文，并提示新开窗口用 context-restore 恢复。Use when the user wants a goal-driven Codex automation loop, session goal tracking, automatic plan/execute/QA cycles, or unstable context handoff.
---

# Goal Loop

Use this skill to set or revise the current session goal and run the complete goal-loop workflow for Codex.

## Dependencies

This skill expects these sibling skills to be available in the same skill library or installed globally:

- `$plan-eng-review` — design the decomposed engineering plan and TODO list.
- `$qa` — test, find bugs, fix eligible issues, and verify.
- `$context-save` — use its context capture structure for unstable handoff.
- `$context-restore` — restore handoff context in a new Codex window.

In this packaged skill library, `qa`, `context-save`, and `context-restore` are copied dependency skills. `plan-eng-review` already exists in `/Volumes/bytedance/code/LLM/my-life-system-skills`.

## Hook Resources

The bundled hook scripts live in `scripts/hooks/`:

- `goal_loop_prompt.py`
- `goal_loop_context.py`
- `goal_loop_stop.py`

See `references/install-hooks.md` when you need to install or refresh hooks in a project `.codex/config.toml`.

## Goal Loop Workflow

When the user invokes `$goal-loop` or asks to define a goal-driven automation loop, treat it as starting or revising the current session goal.

Run this fixed workflow:

1. Convert the user request into an acceptance-oriented final state.
2. Use `$plan-eng-review` to produce an executable plan and TODO list.
3. Execute the TODO implementation work.
4. Use `$qa` to find bugs, fix eligible issues, and verify.
5. Decide whether the goal is complete, blocked, stable enough to continue, or unstable and ready for handoff.

Every round must end with this status block:

```text
GOAL_LOOP_STATUS:
phase: goal|plan|execute|qa|done|blocked|handoff_ready
goal_satisfied: true|false|unknown
qa_status: pass|fail|not_run|unknown
remaining_todos: <number|unknown>
next_action: stop|continue|ask_user|new_window
handoff_status: stable|unstable
```

If user confirmation, permissions, authentication, product judgment, or missing final-state information is required, output `phase: blocked` and `next_action: ask_user`.

## Unstable Handoff

Do not use a fixed iteration count to force a new window. Mark the loop as unstable only when continuing in the current window is likely to reduce accuracy or increase repair risk.

Output `handoff_status: unstable` when any of these apply:

- Multiple plan / execute / qa cycles fail to converge on the same issue.
- Multiple context compactions make earlier constraints, paths, or decisions unreliable.
- QA evidence conflicts with the implementation diagnosis.
- A cleaner context is needed to keep accuracy high.
- `remaining_todos` does not decrease for 2 consecutive goal-loop rounds.
- QA fails 2 consecutive times for the same or highly similar reason.
- The same file or module has been modified more than 3 times without passing verification.
- You cannot confidently state the current goal, completed work, remaining TODOs, or validation result.
- The user says the model forgot constraints, went in the wrong direction, or seems context-confused.

When unstable, stop implementation. Use the `$context-save` capture structure, but override its output path for goal-loop handoff. Write:

```text
.goal-loop/handoffs/<YYYYMMDD-HHMMSS>-goal-loop-handoff.md
.goal-loop/handoffs/latest.md
```

The handoff file must include:

- Current goal.
- Repo, branch, and working tree state.
- Completed work.
- Key decisions.
- Remaining TODOs.
- Latest QA / verification result.
- Key files, functions, commands, risks, and blockers.
- First step for the new window.

After saving the handoff, tell the user to open a new Codex window in the same project and paste:

```text
请使用 $context-restore 恢复 goal-loop 上下文。
如果默认 gstack checkpoint 中没有对应记录，请读取 `.goal-loop/handoffs/latest.md` 作为 goal-loop 专用交接上下文。
恢复后继续目标：
<当前目标>

继续执行：
$plan-eng-review -> 执行剩余 TODO -> $qa -> 判断是否继续。
每轮结束继续输出 GOAL_LOOP_STATUS。
```

Then end with:

```text
GOAL_LOOP_STATUS:
phase: handoff_ready
goal_satisfied: false
qa_status: <pass|fail|not_run|unknown>
remaining_todos: <number|unknown>
next_action: new_window
handoff_status: stable
```

## Goal Lifecycle

When the goal is complete, end with:

```text
GOAL_LOOP_STATUS:
phase: done
goal_satisfied: true
qa_status: pass
remaining_todos: 0
next_action: stop
handoff_status: stable
```

The hook will disable the active state. Future `SessionStart` hooks should not inject the old goal.

When the user invokes `$goal-loop` with a new target, treat it as a fresh loop. The new target is the only current goal. Do not inherit old goals, old TODOs, old QA results, or old handoff content unless the user explicitly asks to continue or restore goal-loop.

Old files may remain as history:

```text
.goal-loop/state.json
.goal-loop/handoffs/latest.md
```

Use them only for explicit continuation or restoration.

## Goal Shape

Write the goal as a desired final state, not an execution plan.

Prefer:

```text
本次会话完成时，应当已经 ...
```

Include constraints, scope, or validation requirements only when they materially change what "done" means.

Do not encode ordinary implementation steps, tool preferences, or progress updates into the goal.

## Clarity Check

If the goal is clear, set or restate it in final-state form and continue the goal-loop.

If the goal is unclear, ask only for missing information that changes the final state. Do not ask for execution details unless they redefine completion.
