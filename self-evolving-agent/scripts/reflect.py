#!/usr/bin/env python3
"""Standalone reflection engine for the self-evolving agent.

Usage:
    python reflect.py --plan plan.json --step-result result.txt [--remaining remaining.json]

Or as a library:
    from reflect import reflect, ReflectionDecision
    result = reflect(plan_text, current_step_text, step_result_text, remaining_text)
"""

import argparse
import json
import re
import sys
from enum import Enum
from pathlib import Path


class ReflectionDecision(str, Enum):
    CONTINUE = "continue"
    REPLAN = "replan"
    FINALIZE = "finalize"


REFLECTION_PROMPT = """\
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

Return ONLY valid JSON, no extra text."""


def extract_json(text: str) -> dict:
    """Extract JSON from LLM output that may contain markdown fences."""
    text = text.strip()
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Try extracting from code fences
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            pass
    # Try finding first { ... }
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    raise ValueError(f"Cannot extract JSON from: {text[:200]}")


def looks_like_error(text: str) -> bool:
    """Heuristic: check if step output is dominated by error signals."""
    stripped = text.strip()
    if not stripped:
        return True
    lower = stripped.lower()
    return lower.startswith("error") or lower.startswith("traceback")


def reflect(
    plan_text: str,
    current_step_text: str,
    step_result_text: str,
    remaining_steps_text: str = "(none — all steps completed)",
    max_result_chars: int = 8000,
) -> dict:
    """Build reflection prompt and return the structured prompt.

    This function builds the prompt for the LLM to evaluate.
    The caller is responsible for sending it to any LLM and parsing the result.

    Returns:
        dict with keys: prompt (str), fallback_decision (str)
    """
    prompt = REFLECTION_PROMPT.format(
        plan=plan_text,
        current_step=current_step_text,
        step_result=step_result_text[:max_result_chars],
        remaining_steps=remaining_steps_text,
    )

    # Provide fallback for when LLM call fails
    if remaining_steps_text.strip() == "(none — all steps completed)":
        fallback = ReflectionDecision.FINALIZE
    elif looks_like_error(step_result_text):
        fallback = ReflectionDecision.REPLAN
    else:
        fallback = ReflectionDecision.CONTINUE

    return {
        "prompt": prompt,
        "fallback_decision": fallback.value,
    }


def parse_reflection_response(raw_text: str, remaining_steps_text: str = "") -> dict:
    """Parse LLM response into structured reflection result.

    Args:
        raw_text: Raw LLM output
        remaining_steps_text: Used for fallback logic

    Returns:
        dict with: decision, reason, next_step_hint, completed_step_id
    """
    try:
        data = extract_json(raw_text)

        # Normalize completed_step_id
        if "completed_step_id" in data:
            step_id = data["completed_step_id"]
            if isinstance(step_id, str):
                match = re.search(r"\d+", step_id)
                data["completed_step_id"] = int(match.group()) if match else None

        # Validate decision
        decision = data.get("decision", "continue")
        if decision not in ("continue", "replan", "finalize"):
            decision = "continue"
        data["decision"] = decision

        return {
            "decision": data.get("decision", "continue"),
            "reason": data.get("reason", ""),
            "next_step_hint": data.get("next_step_hint"),
            "completed_step_id": data.get("completed_step_id"),
        }
    except Exception as e:
        # Fallback
        has_remaining = remaining_steps_text and remaining_steps_text.strip() != "(none — all steps completed)"
        return {
            "decision": "continue" if has_remaining else "finalize",
            "reason": f"Reflection parse error ({e}), using fallback",
            "next_step_hint": None,
            "completed_step_id": None,
        }


def main():
    parser = argparse.ArgumentParser(description="Self-evolving agent reflection engine")
    parser.add_argument("--plan", required=True, help="Plan text or path to plan file")
    parser.add_argument("--step", required=True, help="Current step description")
    parser.add_argument("--result", required=True, help="Step result text or path to result file")
    parser.add_argument("--remaining", default="(none)", help="Remaining steps text")
    args = parser.parse_args()

    # Load from file if path exists
    plan_text = Path(args.plan).read_text("utf-8") if Path(args.plan).is_file() else args.plan
    result_text = Path(args.result).read_text("utf-8") if Path(args.result).is_file() else args.result

    output = reflect(plan_text, args.step, result_text, args.remaining)
    print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
