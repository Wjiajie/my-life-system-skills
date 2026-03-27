---
name: self-evolving-agent
description: >
  A self-evolving agent workflow based on the Memento-Skills architecture. Transforms any LLM Agent
  into a reflective, plan-driven executor that learns from failures. Acts as the Product Manager / Architect in a micro-agent full-stack workflow, generating high-level specs and test plans. Use this skill when facing
  complex multi-step tasks that require planning, iterative execution, automatic error recovery,
  and self-reflection. Triggers include: multi-step research, file batch processing, complex
  code generation with validation, data pipeline construction, or any task where naive single-shot
  execution is likely to fail. Also use when the user explicitly asks for a "plan and execute",
  "reflect and improve", or "self-evolving" workflow.
---

# Self-Evolving Agent Workflow

This skill implements the **Read → Plan → Execute → Reflect → Write** loop from the Memento-Skills
framework. It turns a flat tool-calling agent into a structured, self-correcting executor.

## When NOT to Use

- Simple Q&A or single-tool tasks — just answer directly
- Tasks with fewer than 2 steps — no planning overhead needed

## Core Workflow: 5-Phase Loop

```
Intent Recognition → Plan Generation → Hierarchical Execution → Reflection → Memory Write
```

### Phase 1: Intent Recognition

Classify the user's message before acting:

- **direct** — greeting, knowledge question, no tools needed → reply immediately
- **agentic** — requires tools/skills, multi-step execution → proceed to Phase 2
- **interrupt** — off-topic message during a running task → handle separately

See [prompt-templates.md](references/prompt-templates.md) for the full intent recognition prompt.

### Phase 2: Plan Generation

Break the task into 1-5 actionable steps. Each step has:

```json
{
  "step_id": 1,
  "action": "Search for recent papers on transformer architectures",
  "expected_output": "List of 5-10 relevant papers with titles and abstracts"
}
```

**Rules:**
- Describe WHAT to do, not which tool to use
- Keep steps concise and human-readable
- If context from previous steps exists, USE it — do not re-fetch

### Phase 3: Hierarchical Execution

Two nested loops execute the plan:

```
for each plan_step:
    for react_iter in range(max_react_per_step):    # inner bounded loop
        1. Inject step goal hint into messages
        2. Call LLM with available tools
        3. Execute tool calls, collect results
        4. If no tool calls → step done, break
        5. If consecutive failures exceed threshold → abort
    → Proceed to Phase 4 (Reflection)
```

**Key rules:**
- ONE action per tool call — never mix tasks
- Track consecutive failures — stop after 3
- Each step has a bounded number of react iterations (default: 10)

See [execution-patterns.md](references/execution-patterns.md) for full pseudocode and state management.

### Phase 4: Reflection (at step boundaries)

After each step, reflect on the result and decide:

| Decision | When | Action |
|----------|------|--------|
| **continue** | Output is relevant and moves toward goal | Advance to next step |
| **replan** | Output is wrong, irrelevant, or step failed | Generate new plan (max 3 replans) |
| **finalize** | All steps done or task fully completed | Produce final answer |

**Critical judgment rules:**
- Evaluate BOTH whether output exists AND whether it aligns with the goal
- Abundant but irrelevant output → **replan**
- Partial but on-topic data → **continue**
- Do NOT replan just because data is imperfect — use what's available
- Only finalize when ALL expected outputs exist

See [prompt-templates.md](references/prompt-templates.md) for the full reflection prompt.

### Phase 5: Memory Write (Optional)

After task completion, persist learnings:

1. **Scratchpad archive** — write full execution trace to a local file for later reference
2. **MEMORY.md** — append stable cross-session knowledge (with semantic dedup)
3. **Daily notes** — write session summary to `{date}/daily_note.md`

Memory file structure:
```
{workspace}/context/
├── MEMORY.md                    ← cross-session stable knowledge
└── {YYYY-MM-DD}/
    └── daily_note.md            ← today's execution summaries
```

**Semantic dedup**: Before writing to MEMORY.md, check if the new entry is already covered.
**Compaction**: When MEMORY.md grows too large, summarize and merge entries.

See [execution-patterns.md](references/execution-patterns.md) for memory management details.

## Replan Strategy

When reflection decides "replan":

1. Summarize completed steps (mark as [DONE] or [FAILED])
2. Include failure reason in new plan context
3. Generate a fresh plan that avoids the failed approach
4. Reset step counter but **preserve accumulated messages** (context carries over)
5. Maximum 3 replans before falling back to best-effort finalize

## Error Handling

| Error Type | Strategy |
|-----------|----------|
| Tool execution failure | Track in state, retry with different params |
| Consecutive failures (3+) | Stop execution, report to user |
| Irrelevant skill output | Block that skill, try alternatives |
| LLM output truncated | Retry once with same messages |
| Timeout | Report partial results |

## Architecture Reference

For detailed architecture patterns, state management, and skill routing strategies,
see [architecture.md](references/architecture.md).

## Running the Execution Scripts

This skill includes executable Python scripts for core operations:

- `scripts/reflect.py` — Standalone reflection engine: takes plan + step result, returns decision
- `scripts/memory_manager.py` — Memory persistence: MEMORY.md read/write with semantic dedup and compaction

Run via: `python scripts/reflect.py` or `python scripts/memory_manager.py`

## 🌟 Full-Stack Development Workflow (Harness Design)

When acting as the **Architect/Planner** for a full-stack development request, this skill orchestrates a specialized multi-agent Harness Design workflow to ensure high-quality, bug-free delivery. **THIS IS THE CRITICAL ENTRY POINT FOR ALL FULL-STACK DEVELOPMENT.**

**The Harness Design loop:**

1. **Context Retrieval (`code-explorer`)**: Before planning, dispatch the `code-explorer` skill to read the existing codebase, map the subsystem architecture, and find similar features.
2. **Contract Generation (Phase 2 - Planner)**: Based on the user request and codebase context, write a concrete **Sprint Contract / Test Plan**. Define exactly what "done" looks like without over-specifying implementation details.
3. **Implementation (`code-dev` or `frontend-design`)**: Pass the contract to the developer skills. They will write the actual code and implement the features based strictly on the plan.
4. **Static Quality Check (`code-review`)**: Have the `code-review` skill audit the generated code for correctness, security, and the KISS principle. Address any structural issues.
5. **Dynamic QA (`webapp-testing`)**: CRITICAL STEP. Run the `webapp-testing` skill to launch Playwright and physically interact with the UI/API. Wait for natural `networkidle`, screenshot the results, and verify that the Sprint Contract is fulfilled.
6. **Reflection & Replan (Phase 4)**: If the QA step fails, reflect on the bug reports, update the plan, and send it back to implementation.

This separation of concerns (Planner → Generator → Evaluator) prevents LLM context anxiety and self-evaluation blindness, drastically lifting the ceiling of autonomous coding capabilities.
