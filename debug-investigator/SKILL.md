---
name: debug-investigator
description: "Root-cause debugging skill for Codex. Use when the user reports a bug, failing test, regression, exception, production issue, flaky behavior, broken UI flow, or asks to investigate before fixing. Enforces evidence-first debugging — reproduce, trace data and control flow, test hypotheses, fix the root cause, add regression coverage, and verify."
---

# Debug Investigator

Use this skill when something is broken and the cause is not already proven. The rule is simple: no fix before investigation.

## Investigation Loop

1. **Reproduce:** capture the exact command, URL, input, test, log, or user action that fails.
2. **Bound the area:** identify the smallest module or flow that can explain the symptom.
3. **Trace:** follow data and control flow through the relevant files.
4. **Hypothesize:** name one concrete cause and the evidence that would confirm or reject it.
5. **Test the hypothesis:** run a focused command, add temporary observation, inspect state, or reproduce in browser.
6. **Fix root cause:** make the smallest change that removes the proven cause.
7. **Add regression coverage:** test the failure mode, not just the happy path.
8. **Verify fresh:** rerun the original reproduction and the relevant broader checks.

## Three-Strike Rule

After three failed hypotheses, stop and reassess. Report:

- What was reproduced.
- Which hypotheses failed.
- What evidence is missing.
- The next best options.

Do not keep patching variants of the same guess.

## Output

When complete, report:

```markdown
Root cause:
Fix:
Regression test:
Verification:
Residual risk:
```

## Guardrails

- Do not say "this should fix it" without verification.
- Avoid broad refactors during debugging.
- If a fix needs to touch more than five files, pause and explain the blast radius.
- When UI behavior is involved, use `code-testing` for browser evidence and screenshots.
