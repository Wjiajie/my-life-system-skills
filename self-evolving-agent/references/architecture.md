# Architecture Reference

## Read → Execute → Reflect → Write Loop

The self-evolving agent is built around a continuous improvement cycle:

```
┌─────────────────────────────────────────────────────────┐
│                    User Task                             │
│                       │                                  │
│            ┌──────────▼──────────┐                       │
│            │  Intent Recognition │                       │
│            │  (direct/agentic/   │                       │
│            │   interrupt)        │                       │
│            └──────────┬──────────┘                       │
│                       │ agentic                          │
│            ┌──────────▼──────────┐                       │
│            │  Plan Generation    │◄──── Replan ─────┐    │
│            │  (1-5 steps)        │                  │    │
│            └──────────┬──────────┘                  │    │
│                       │                             │    │
│  ┌────────────────────▼────────────────────────┐    │    │
│  │  Hierarchical Execution                     │    │    │
│  │  ┌─── outer: for each plan step ──────────┐ │    │    │
│  │  │  ┌── inner: bounded react loop ──────┐ │ │    │    │
│  │  │  │  LLM → tool call → result → next  │ │ │    │    │
│  │  │  │  (max N iterations per step)       │ │ │    │    │
│  │  │  └───────────────────────────────────┘ │ │    │    │
│  │  │                                        │ │    │    │
│  │  │  ┌── Reflection ────────────────────┐  │ │    │    │
│  │  │  │  continue → next step            │──┘ │    │    │
│  │  │  │  replan  → new plan ─────────────│────│────┘    │
│  │  │  │  finalize → final answer         │   │         │
│  │  │  └────────────────────────────────┘  │   │         │
│  │  └──────────────────────────────────────┘   │         │
│  └─────────────────────────────────────────────┘         │
│                       │                                  │
│            ┌──────────▼──────────┐                       │
│            │  Memory Write       │                       │
│            │  (MEMORY.md, notes) │                       │
│            └─────────────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

## State Management: AgentRunState

The execution engine tracks state across the entire run:

```python
class AgentRunState:
    # Plan tracking
    task_plan: TaskPlan           # Current plan with steps
    current_plan_step_idx: int    # Index of active step
    step_accumulated_results: list[str]  # Results collected during current step

    # Error tracking
    execute_failures: int         # Consecutive execution failures
    last_execute_error: str       # Most recent error message
    blocked_skills: set[str]      # Skills that returned irrelevant results

    # Replan tracking
    replan_count: int             # How many times we've replanned
    max_replans: int = 3          # Maximum allowed replans

    # Messages
    messages: list[dict]          # Full conversation context

    def should_stop_for_failures(self) -> bool:
        return self.execute_failures >= 3

    def can_replan(self) -> bool:
        return self.replan_count < self.max_replans

    def advance_plan_step(self):
        self.step_accumulated_results.clear()
        self.current_plan_step_idx += 1

    def reset_for_replan(self, new_plan):
        self.task_plan = new_plan
        self.current_plan_step_idx = 0
        self.step_accumulated_results.clear()
        self.replan_count += 1
```

## Skill Routing Strategy

Multi-layer retrieval ensures the right skill is found:

```
User Query
    │
    ├─→ Local Skills (always in context, score=1.0)
    │     └─ Exact name match → execute directly
    │
    ├─→ BM25 Text Search (keyword matching)
    │     └─ Fast, handles exact terms well
    │
    ├─→ Embedding Recall (semantic matching)
    │     └─ Handles paraphrase and intent variation
    │
    ├─→ Reranker (optional, cross-encoder)
    │     └─ Re-scores candidates for precision
    │
    └─→ Cloud Catalog (remote discovery)
          └─ HTTP API search for skills not installed locally
```

**Resolve strategy options:**
- `local_only` — only use installed skills
- `local_first` — try local, fall back to cloud (default)
- `always_search` — always query cloud catalog

## Skill Definition Model

Each skill is defined by:

```python
class Skill:
    name: str              # Unique identifier, e.g. "web-search"
    description: str       # What it does (used for routing/matching)
    content: str           # SKILL.md body (instructions)
    dependencies: list     # Python packages needed
    files: dict            # Bundled files (scripts, assets)
    references: dict       # Reference documents (loaded on demand)
    execution_mode: str    # "knowledge" (text only) or "playbook" (has scripts)
    parameters: dict       # OpenAI Function Schema for structured input
    allowed_tools: list    # Which builtin tools this skill can use
```

**Execution modes:**
- **knowledge** — SKILL.md only, LLM generates text response
- **playbook** — has scripts/files, LLM can call tools to run them

## Session Context

Tracks per-session state across the conversation:

```python
class SessionContext:
    session_id: str
    current_goal: str          # Latest user request
    plan_steps: list[str]      # Current plan display
    completed_steps: set[int]  # Which steps are done
    action_history: list       # All tool calls and results
    environment: dict          # CWD, project type, platform info
```

Session context is injected into the system prompt and used by intent recognition
to detect topic shifts (intent_shifted).
