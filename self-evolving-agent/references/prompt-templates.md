# Prompt Templates Reference

All prompts are agent-agnostic. Replace `{variables}` with actual values at runtime.

## Intent Recognition Prompt

```
You are analyzing a user's message in a multi-turn AI assistant session.

## User Message
{user_message}

## Conversation History (recent turns)
{history_summary}

## Session Context
{session_context}

## Instructions
Classify the user's intent and normalize the request into a clear English task description.
Output a JSON object with exactly these fields:

- **mode**: one of:
  - "direct" — greeting, chitchat, thanks, or a knowledge question answerable without tools
  - "agentic" — requires executing tools/skills (file operations, search, code generation, etc.)
  - "interrupt" — an off-topic message sent while a multi-step task is running
- **task**: a clear, complete English task description derived from the user's message.
  - Convert any language to English.
  - Expand abbreviations and resolve references from conversation history.
  - For "direct": describe what the user is saying/asking.
  - For "agentic": describe the actionable task to be executed.
  - For "interrupt": describe the off-topic request.
- **intent_shifted**: true if the message is about a different topic from recent conversation.

## Decision Rules for mode
1. If a multi-step task IS running and the new message is clearly unrelated, choose "interrupt".
2. If the user is continuing the current task (e.g. "继续", "continue", "next"), choose "agentic".
3. If the message requires calling tools or skills to fulfill, choose "agentic".
4. Otherwise choose "direct".

## Examples
- "你好" → {"mode":"direct","task":"Greeting from user","intent_shifted":false}
- "帮我搜索 React 的资料" → {"mode":"agentic","task":"Search for information about React","intent_shifted":false}
- "继续" (task running) → {"mode":"agentic","task":"Continue with the next step","intent_shifted":false}
- "对了查下天气" (coding task running) → {"mode":"interrupt","task":"Check the weather","intent_shifted":true}

Return ONLY valid JSON — no text outside the JSON object.
```

## Plan Generation Prompt

```
Based on the user's request, create a step-by-step execution plan.
Break the task into human-readable action steps — describe WHAT to do, not which tool to use.

**Today: {current_datetime} (year={current_year})**

User's goal: {goal}
Context: {context}

Return a JSON object with exactly these fields:
- goal: the user's final objective (one sentence)
- steps: array of step objects, each with:
  - step_id: integer starting from 1
  - action: what to do (human-action perspective)
  - expected_output: what this step should produce

Keep steps concise and actionable. Typically 1-5 steps.

IMPORTANT: If the context mentions data already collected from previous steps,
your plan should USE that data directly — do NOT re-fetch it.

Return ONLY valid JSON, no extra text.
```

## Reflection Prompt

```
You are reflecting on the progress of a multi-step task.

Original plan:
{plan}

Current step being executed:
{current_step}

Execution result of this step:
{step_result}

Remaining steps:
{remaining_steps}

Based on the execution result, decide the next action:
- "continue": the step produced output relevant to the goal and moves the task forward
- "replan": the step failed OR the output is irrelevant / directionally wrong
- "finalize": all steps are done or the task is already fully completed

Decision guidelines:
- Evaluate BOTH whether output exists AND whether it aligns with the goal.
- Output that is abundant but irrelevant should trigger "replan".
- Partial or imperfect data that is on-topic is fine — "continue".
- Do NOT replan just because data is not real-time or not perfectly detailed.
- Only "finalize" when there is concrete evidence that ALL expected outputs exist.

Return a JSON object with exactly these fields:
- decision: "continue", "replan", or "finalize"
- reason: why you made this decision
- next_step_hint: (optional, for "continue") advice for the next step
- completed_step_id: the step_id that was just completed (or attempted)

Return ONLY valid JSON, no extra text.
```

## Conversation Summarization Prompt

```
You are a compression engine for an AI Agent's memory.
Summarize the conversation to reduce token usage while strictly preserving execution context.

# Requirements
1. **Preserve Tool Outputs**: Keep specific key data (file paths, IDs, results).
2. **Preserve User Intent**: Keep the original specific request.
3. **Current State**: State what step the agent is on.
4. **Target Length**: {max_tokens} tokens.

# Input Context
{context}

# Output
Return ONLY the summary text.
```

## Memory Dedup Prompt

```
You are a deduplication checker. Given existing memory content and a new entry,
determine if the new entry is semantically redundant (already covered by existing content).
Respond with ONLY 'YES' if redundant, or 'NO' if it contains new information.
```

## Memory Compaction Prompt

```
You are a memory compactor. Given a collection of long-term memory entries,
merge and deduplicate them into a concise, well-organized summary.
Preserve all unique facts, preferences, and decisions.
Remove redundancy. Use bullet points grouped by topic.
Keep the result in the same language as the input.
```

## Runtime Messages

### Step Goal Hint (injected before each step)
```
[Current Step] Step {step_id}: {action}
Expected output: {expected_output}
```

### Step Completed (injected after step completes)
```
[Step {step_id} completed]
Results:
{results}
```

### Finalize Instruction (injected when all steps are done)
```
[All steps completed] Provide the final answer to the user now.
Rules:
1) Respond in the SAME LANGUAGE as the user's original message.
2) Summarize what was accomplished — include concrete results:
   - File paths of any created/modified files
   - Key data or content highlights
   - Tools/skills that were used
3) Do NOT say 'let me do X' or announce future actions — the run is ending.
4) If a step failed or produced no output, state that honestly.
```
