# Execution Patterns Reference

## Hierarchical Execution — Full Pseudocode

```python
async def run_plan_execution(state, llm, tools, max_iter):
    """Outer plan-step loop → inner bounded react loop → reflection."""
    iteration = 0

    while state.current_plan_step() is not None:
        current_step = state.current_plan_step()
        step_text = ""

        # ── Inner react loop for this plan step ──
        for react_iter in range(config.max_react_per_step):  # default: 10
            iteration += 1
            if iteration > max_iter:
                return "Max iterations reached"

            # Inject step goal hint
            step_hint = f"[Current Step] Step {current_step.step_id}: {current_step.action}"
            messages = state.messages + [{"role": "system", "content": step_hint}]

            # Call LLM
            response = llm.chat(messages=messages, tools=tools)
            content = response.content or ""
            tool_calls = response.tool_calls or []

            # Retry on truncated tool-call-like output
            if response.finish_reason == "length" and not tool_calls:
                response = llm.chat(messages=messages, tools=tools)  # retry once

            # No tool calls → step done
            if not tool_calls:
                step_text = content
                break

            # Execute each tool call
            for tc in tool_calls:
                result = execute_tool(tc.name, tc.arguments)
                state.step_accumulated_results.append(result)

                # Track failures
                if is_failure(result):
                    state.execute_failures += 1
                else:
                    state.execute_failures = 0

                # Block irrelevant skills
                if "[NOT_RELEVANT]" in result:
                    state.blocked_skills.add(tc.skill_name)

            # Append messages to context
            state.messages = compress_and_append(state.messages, new_messages)

            # Bail out on too many failures
            if state.should_stop_for_failures():  # >= 3
                return f"Execution stopped: too many failures. Last: {state.last_error}"

        # ── Reflection at step boundary ──
        combined_result = step_text + "\n" + "\n---\n".join(state.step_accumulated_results)
        remaining = state.remaining_plan_steps()

        reflection = reflect(
            plan=state.task_plan,
            current_step=current_step,
            step_result=combined_result,
            remaining_steps=remaining,
        )

        if reflection.decision == "finalize":
            return finalize(state)

        if reflection.decision == "replan":
            if state.can_replan():  # < 3 replans
                new_plan = generate_plan(
                    goal=state.task_plan.goal,
                    context=build_replan_context(state, reflection.reason),
                )
                state.reset_for_replan(new_plan)
                continue  # restart outer loop
            else:
                reflection.decision = "continue"  # force continue

        if reflection.decision == "continue":
            inject_step_results(state, current_step, reflection)
            state.advance_plan_step()

    return finalize(state)
```

## Reflection Decision Logic

```python
def reflect(plan, current_step, step_result, remaining_steps, llm):
    """Post-step reflection. Returns: continue / replan / finalize."""

    prompt = REFLECTION_PROMPT.format(
        plan=format_plan(plan),
        current_step=format_step(current_step),
        step_result=step_result[:8000],    # truncate for token budget
        remaining_steps=format_remaining(remaining_steps),
    )

    response = llm.chat(
        messages=[{"role": "user", "content": prompt}],
        temperature=0,          # deterministic reflection
        max_tokens=512,         # short structured output
    )

    result = parse_json(response.content)

    # Fallback on parse failure
    if parse_failed:
        if remaining_steps:
            if looks_like_error(step_result):
                return ReflectionResult(decision="replan")
            else:
                return ReflectionResult(decision="continue")
        else:
            return ReflectionResult(decision="finalize")

    return ReflectionResult(**result)

def looks_like_error(text):
    """Heuristic: output starts with 'error' or 'traceback'."""
    stripped = text.strip().lower()
    return not stripped or stripped.startswith("error") or stripped.startswith("traceback")
```

## Replan Context Construction

When replanning, the context includes what was already tried:

```python
def build_replan_context(state, reason):
    lines = []
    for i in range(state.current_plan_step_idx + 1):
        step = state.task_plan.steps[i]
        tag = "[FAILED]" if i == state.current_plan_step_idx else "[DONE]"
        lines.append(f"- Step {step.step_id}: {step.action} {tag}")

    return (
        f"Previously attempted steps:\n{'\\n'.join(lines)}\n\n"
        f"Reason for replan: {reason or 'replanning needed'}"
    )
```

## Message Compression Strategy

Two levels of compression prevent context overflow:

### Level 1: Single Message Compression
When a single message exceeds `max_msg_tokens` (default: 4000):

```python
def compress_message(msg, max_msg_tokens=4000):
    if count_tokens(msg.content) <= max_msg_tokens:
        return msg  # no compression needed

    summary = llm.chat(
        system="Compress the following message preserving all key facts and intent.",
        messages=[{"role": "user", "content": msg.content}],
        max_tokens=800,
    )
    return {"role": msg.role, "content": f"[compressed]\n{summary}"}
```

### Level 2: Full Context Compaction
When total tokens exceed budget:

```python
def compact_messages(messages, summary_tokens=2000):
    system_msg = messages[0]  # preserve system prompt
    rest = messages[1:]

    context = "\n".join(f"[{msg.role}]: {msg.content}" for msg in rest)

    summary = llm.chat(
        system="Precise summarizer. Preserve [TOOL_RESULT] content completely.",
        messages=[{"role": "user", "content": context}],
        max_tokens=summary_tokens,
    )

    return [system_msg, {"role": "system", "content": f"[history summary]\n{summary}"}]
```

## Memory Persistence

### MEMORY.md — Long-term Knowledge

```python
class ContextMemory:
    def write_to_memory(self, content, dedup=True):
        """Append stable knowledge with semantic dedup."""
        if dedup and self._is_semantic_duplicate(content):
            return False  # skip duplicate
        with open("MEMORY.md", "a") as f:
            f.write(f"\n{content}\n")
        return True

    def compact_memory(self):
        """When MEMORY.md exceeds size threshold, LLM-summarize it."""
        if self.memory_path.stat().st_size > MAX_MEMORY_BYTES:
            existing = read("MEMORY.md")
            compacted = llm.chat("Merge and deduplicate these memory entries...", existing)
            write("MEMORY.md", compacted)

    def _is_semantic_duplicate(self, content):
        """Fast path: substring check. Slow path: LLM judgment."""
        existing = read("MEMORY.md")
        if content.strip() in existing:
            return True  # exact substring
        return llm.chat("Is this redundant?", existing + content) == "YES"
```

### Daily Notes — Session Summaries

```python
def flush_session(session_id, summary):
    """Write execution summary to today's daily note."""
    path = f"context/{date.today()}/daily_note.md"
    with open(path, "a") as f:
        f.write(f"\n### Session {session_id} ({time})\n{summary}\n")
```

## Error Classification

Standard error types for structured error handling:

| Error Type | Trigger |
|-----------|---------|
| `input_required` | Missing required parameter |
| `input_invalid` | Invalid parameter value |
| `resource_missing` | File/command not found |
| `permission_denied` | Access denied |
| `timeout` | Operation timed out |
| `dependency_error` | Missing Python package |
| `execution_error` | General execution failure |
| `policy_blocked` | Security policy blocked the action |
| `unavailable` | Service/host unreachable |
