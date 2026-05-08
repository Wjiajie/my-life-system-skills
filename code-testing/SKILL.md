---
name: code-testing
description: Codex-native testing and evidence QA skill. Use when Codex needs to verify code changes, run unit/integration tests, test a local web app, inspect UI behavior in a browser, capture screenshots, reproduce bugs, or produce a QA report. Combines automated test commands with evidence-based browser QA: start the dev server, use the Codex Browser plugin or Playwright where appropriate, record repro steps, screenshots, console/network errors, fixes, and re-verification.
---

# Code Testing

Use this skill as the dynamic verification and evidence layer for coding work. It replaces the old `webapp-testing` role and is optimized for Codex desktop.

## Testing Ladder

Choose the lowest ladder rung that proves the claim:

1. **Static checks:** typecheck, lint, format check, config validation.
2. **Unit tests:** focused tests for changed logic.
3. **Integration tests:** API, database, job, CLI, or service boundary tests.
4. **Browser QA:** real local app interaction, screenshots, console/network checks.
5. **Regression loop:** reproduce a bug, fix it, add coverage, verify the original path again.

## Browser QA

For local web apps:

1. Start or reuse the dev server. If the URL is obvious, use it; otherwise inspect package scripts and common ports.
2. Open the app with the Codex Browser plugin when available.
3. Exercise the changed user flows like a real user.
4. Capture evidence:
   - URL and viewport.
   - Before/after screenshots when visual state matters.
   - Repro steps for bugs.
   - Console errors and failed network requests.
   - Expected vs actual behavior.
5. If fixing bugs, re-run the same flow after the patch and add a regression test when practical.

Use Playwright or existing project test tools when the repo already has them. Prefer the Browser plugin for interactive inspection and screenshots in the Codex app.

## Evidence Report

End substantial testing with:

```markdown
## Test Evidence

Commands:
Browser coverage:
Findings:
Fixes:
Screenshots:
Re-verification:
Residual risk:
```

Keep reports concrete. A screenshot path, command output summary, or failing test name is better than a vague confidence statement.

## Report-Only Mode

If the user asks to test without modifying code, do not edit files. Produce findings only:

- Severity.
- Repro steps.
- Evidence.
- Suggested fix.
- Whether a regression test is recommended.

## Fix Mode

If the user asks to test and fix:

1. Reproduce first.
2. Fix the smallest proven cause.
3. Add or update tests.
4. Re-run the failing path.
5. Re-run the relevant broader check.

Use `debug-investigator` when the cause is unclear or multiple hypotheses are competing.

## Guardrails

- Do not claim UI works without opening or testing the relevant UI when a browser is feasible.
- Do not delete screenshots or reports created as QA evidence.
- Do not rely only on screenshots for behavior that can be asserted with tests.
- If credentials are needed, ask for safe test credentials or use documented local fixtures.
