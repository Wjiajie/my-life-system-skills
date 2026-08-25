---
name: goal-loop
description: 创建或更新当前会话目标，并驱动 Codex 在同一项目空间内执行目标整理、工程计划、实现、验证、续跑与不稳定上下文交接。组合 engineering 模块的 codebase-design、tdd、diagnosing-bugs 与 code-review 纪律。Use when the user wants a goal-driven Codex automation loop, session goal tracking, automatic plan/execute/verification cycles, or unstable context handoff.
---

# Goal Loop

Use this skill to set or revise the current session goal and run the complete goal-loop workflow for Codex.

## Engineering Composition

Compose the model-invoked engineering skills when the current work calls for them:

- `$codebase-design` for module boundaries, seams, and testable interfaces.
- `$tdd` for red-green-refactor implementation at agreed seams.
- `$diagnosing-bugs` when a test, runtime check, or regression fails for a non-obvious reason.
- `$code-review` for a final standards/spec review from a fixed point captured before implementation.

The explicit-only engineering entry points `$to-spec`, `$to-tickets`, `$implement`, and `$handoff` remain available when the user invokes them directly. Goal Loop mirrors the relevant plan, execution, and handoff contracts itself instead of trying to chain user-invoked commands. It must not publish issues, commit, push, or create a handoff outside `.goal-loop/` unless the user separately authorizes that action.

## Hook Resources

The bundled hook scripts live in `scripts/hooks/`:

- `goal_loop_prompt.py`
- `goal_loop_context.py`
- `goal_loop_stop.py`

See `references/install-hooks.md` when you need to install or refresh hooks in a project `.codex/config.toml`.

## Goal Loop Workflow

When the user invokes `$goal-loop` or asks to define a goal-driven automation loop, treat it as starting or revising the current session goal.

Run this fixed workflow:

1. Convert the user request into an acceptance-oriented final state, then run the Goal Fitness Check and Native Goal Bridge rules below.
2. Inspect the current project, capture the pre-work fixed point, and produce an executable plan and TODO list. Apply `$codebase-design` when module seams or interfaces need deliberate design, and include the Subagent Fit Check only when delegation is available and authorized.
3. Execute the TODO work. For code changes, use `$tdd` where a meaningful behavioral seam exists.
4. Run the relevant repository tests, static checks, and runtime or UI evidence. Use `$diagnosing-bugs` for non-obvious failures and `$code-review` for final review against the captured fixed point.
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

The `GOAL_LOOP_STATUS` block must be the last text block in the round. Do not append prose after it.

## Native Goal Bridge

Codex may expose a native Goal mode through the app, IDE extension, CLI, or future host tooling. `$goal-loop` should align with it when the runtime makes that possible, but it must not depend on it.

When starting or revising a goal:

1. Prepare `Native Goal Text` from the user request. Keep it concise and acceptance-oriented. Prefer under 4,000 characters; if the necessary context is longer, write the detail into a project file and let the goal reference that file.
2. If the current thread was already started through native `/goal`, treat that as the durable outer objective. Align the `$goal-loop` final-state text with it; do not create a second competing goal.
3. If the host explicitly exposes a callable goal-setting capability such as `set_goal`, `goal_update`, `thread/goal/set`, or an equivalent tool/API, call it with `Native Goal Text`, then continue the normal goal-loop.
4. If no callable goal-setting capability is exposed, do not claim native Goal mode was set and do not ask the user to wrap the same request in another slash command. Continue with `Native Goal Text` as this skill's internal durable objective. If useful, mention briefly: `native_goal_bridge: unavailable`.

Native Goal mode describes the final condition for the session. It does not replace the engineering plan, verification evidence, handoff rules, or the final `GOAL_LOOP_STATUS` contract.

## Subagent Fit Check

During planning, check whether part of the work should be delegated to subagents. The user invoking `$goal-loop` is authorization to consider internal parallelization, not a requirement to spawn agents.

Use subagents only when the benefit beats the coordination cost:

```text
Subagent Fit Check:
goal_loop_authorized: 当前是否处于 $goal-loop
parallelizable: 是否存在互不依赖、可并行完成的子问题
read_heavy: 子任务是否主要是探索、验证、日志分析、文档核对或 review
write_scope: 如需写代码，是否能分配不重叠的文件/模块 ownership
critical_path: 主线程下一步是否被该子任务阻塞
coordination_cost: 并行收益是否大于上下文、token、冲突、等待成本
result_shape: 是否能要求 subagent 返回精炼结论、证据、风险、改动列表或验证结果
```

Good fits:

- Read-heavy exploration across independent docs, code paths, logs, commits, or source material.
- Architecture or risk review split by data flow, compatibility, performance, tests, or security boundaries.
- Implementation where ownership can be cleanly divided by non-overlapping files or modules.
- QA where different test layers, repro paths, logs, or browser checks can run independently.

Poor fits:

- Small single-file edits, direct answers, short commands, translation, or formatting.
- Tasks whose subtasks depend tightly on each other.
- Write-heavy work touching the same files or shared state.
- Destructive operations, permissions, authentication, or product decisions that require user approval.
- A currently unstable context; save a handoff before expanding parallel work.

When launching a subagent, give it a complete goal contract:

```text
Subagent Goal Contract:
Objective: 本 subagent 完成时，应当已经 ...
Scope: 只处理 ...
Non-goals: 不处理 ...
Ownership: 如果允许写代码，只能改 ...
Evidence: 返回这些证据 ...
Stop if: 遇到权限、认证、破坏性操作、范围冲突、无法验证、重复失败时停止并报告
Return format: 简短结论 + 文件/命令/链接证据 + 改动列表或风险列表 + 是否阻塞主线程
```

Prefer read-only `explorer` style agents for research and verification, and `worker` style agents only for clearly owned implementation slices. The main thread remains responsible for reviewing results, integrating changes, verifying behavior, and closing subagent work.

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

When unstable, stop implementation. Use a compact, reference-first handoff structure and write it to the Goal Loop-owned paths below:

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
请读取 `.goal-loop/handoffs/latest.md` 恢复 goal-loop 上下文。
不要继承文件之外的旧目标、旧 TODO 或旧验证结论。
恢复后继续目标：
<当前目标>

继续执行：
更新计划与 TODO -> 执行剩余 TODO -> 运行测试与运行时检查 -> 必要时使用 $diagnosing-bugs -> 使用 $code-review 收口 -> 判断是否继续。
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

## Stage Closeout

When a meaningful phase of work is complete, decide whether the result should be fixed in place before expanding scope, moving to a different feature, saving a handoff, or declaring `phase: done`.

Stage closeout applies when:

- At least one independently valuable TODO is complete.
- The relevant files or artifacts are written and verified at the level appropriate for the change.
- The next step would broaden scope, switch to a different feature, spend a long time debugging, save a handoff, or finish the loop.
- The working tree contains local changes worth preserving, or the decision / algorithm / validation path is worth recording.

If the user explicitly asked for a commit, walkthrough, or both, follow that request directly while respecting normal safety rules: inspect `git status --short`, stage only relevant files, do not include unrelated changes, and do not commit unverified or unclear work.

If the user did not ask for a closeout action, ask only when the choice materially affects the rest of the goal-loop. Offer these options:

```text
阶段性完成收口：当前功能已经形成可验收切片。要现在固化吗？
1. 提交 commit 并生成 walkthrough.html
2. 仅提交 commit
3. 仅生成 walkthrough.html
4. 跳过
```

Recommend commit + walkthrough when the phase is verified, scoped, and useful to preserve. Recommend skipping when the work is still exploratory, verification failed, or unrelated dirty files make a safe commit unclear.

Commit rules:

- Run `git status --short` first.
- Commit only the files related to this stage.
- Preserve unrelated user changes.
- Run known light validation before committing.
- Use the repository's commit style when obvious; otherwise use a clear conventional-style message.

Walkthrough rules:

- Default path: `.goal-loop/walkthrough.html`.
- Make it an engineering walkthrough, not a landing page.
- Include goal, completed state, key files, behavior change, important data flow or state logic, validation commands/results, and remaining risks.
- Do not invent verification results and do not include secrets.

If code, configuration, or project artifacts changed in this goal-loop and the next status is `phase: done` / `next_action: stop`, include this reflection immediately before the final status block:

```text
GOAL_CHANGE_REFLECTION:
goal_implemented: yes|no|uncertain - <一句话说明>
scope_contained: yes|no|uncertain - <是否只收敛在本次目标范围>
unrelated_module_behavior: unaffected|risk|unknown - <是否影响其他不相关功能模块>
same_module_unrelated_behavior: unaffected|risk|unknown - <是否影响被改模块内其他无关行为>
verification: <已运行的验证；未运行则说明原因>
decision: done|continue|ask_user
```

If any reflection item is `no`, `risk`, or `uncertain` and it can be resolved safely, keep working instead of marking the goal done. If it requires user judgment, permissions, authentication, or unsafe assumptions, output `phase: blocked` and `next_action: ask_user`.

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

## Goal Fitness Check

Before setting or revising the goal, quickly check whether it can guide a multi-round loop:

- `one_objective`: one main objective, not several unrelated wishes.
- `scope`: clear enough to decide what is in scope, out of scope, and not inherited from earlier work.
- `evidence`: observable completion evidence such as files, commands, tests, screenshots, reports, docs, or user-visible behavior.
- `brakes`: known stop conditions such as permissions, authentication, destructive operations, product judgment, repeated failure, or unstable context.
- `handoff`: enough information to save current goal, completed work, remaining TODOs, validation, and first restore step if the context becomes unstable.

If a missing element materially changes what "done" means, ask only for that missing information. If it does not change the final state, make a reasonable assumption and continue.

You may internally organize the goal as:

```text
Objective: 本次会话完成时，应当已经 ...
Scope: 本次 goal-loop 包含 ...
Non-goals: 本次不处理 ...
Evidence: 完成需要看到 ...
Stop if: 遇到 ... 时停止并询问用户
Handoff notes: unstable 时必须保存 ...
```

Do not output the full contract every time unless it helps the user or the next agent.

## Clarity Check

If the goal is clear, set or restate it in final-state form and continue the goal-loop.

If the goal is unclear, ask only for missing information that changes the final state. Do not ask for execution details unless they redefine completion.
