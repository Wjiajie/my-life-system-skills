---
name: plan-eng-review
description: Engineering plan review skill for Codex. Use before implementation or after a draft plan when architecture, data flow, state transitions, API contracts, migrations, background jobs, performance, security boundaries, or test strategy need scrutiny. Produces a buildable engineering contract with risks, diagrams when useful, and a test matrix for code-dev and code-testing.
---

# Plan Engineering Review

Use this skill to make an idea buildable before editing code. It is the engineering manager pass between product direction and implementation.

## Inputs

Gather the most relevant available context:

- User request or product brief.
- Existing plan or TODO.
- Codebase patterns from `code-explorer`.
- Known constraints: stack, deployment, auth, data model, performance, deadlines.

## Review Passes

1. **System boundary:** what modules, services, files, and external systems are involved.
2. **Data flow:** what enters, transforms, persists, and returns to the user.
3. **State and failure modes:** loading, empty, error, retry, partial success, cancellation, concurrency.
4. **Contracts:** API shape, database changes, event/job payloads, validation rules.
5. **Security and privacy:** trust boundaries, authz, secret handling, prompt injection or untrusted content if AI/browser data is involved.
6. **Testing:** unit, integration, browser/UI, regression, migration/rollback where relevant.
7. **Implementation sequence:** smallest safe order of edits.

## Output Contract

Produce a concise contract:

```markdown
## Engineering Contract

Goal:
Scope:
Non-goals:
Architecture:
Data flow:
Failure modes:
Implementation steps:
Test matrix:
Risks and mitigations:
Handoff:
```

For complex systems, include a short Mermaid diagram. Use diagrams to clarify hidden assumptions, not as decoration.

## Decision Rules

- Ask the user only for high-stakes ambiguity: irreversible data model choices, security posture, product behavior users will notice, or scope expansion.
- Prefer existing project patterns over new abstractions.
- Keep the contract specific enough for `code-dev` to implement and `code-testing` to verify.
- If the plan is too vague to implement safely, return `NEEDS_CONTEXT` and list the exact missing facts.
