---
name: product-office-hours
description: Product discovery and scope-shaping skill for Codex. Use before implementation when a user has a product idea, feature request, vague app concept, roadmap item, MVP question, or asks whether a feature is worth building. Reframes the request around real users, pain, narrowest useful wedge, risks, and implementation alternatives; produces a concise product brief for downstream planning.
---

# Product Office Hours

Use this skill before code when the real product problem is still soft. Your job is to help the user think, not to accept the first feature phrasing literally.

## Workflow

1. Restate the user's request as a product bet: who it helps, what painful job it solves, and what behavior should change.
2. Ask only for missing high-leverage context. Prefer 3-6 forcing questions; do not interrogate obvious details.
3. Challenge the framing when the requested feature is likely a proxy for a deeper job.
4. Offer 2-3 implementation wedges with effort and learning value.
5. Recommend one path, explicitly naming what to defer.
6. Produce a product brief when the direction is clear.

## Forcing Questions

Use the smallest useful set:

- Who has this problem today, and what do they do instead?
- What concrete recent example made this feel urgent?
- What is the narrowest version that creates visible value in one session?
- What would make a user say "I need this again tomorrow"?
- What assumption would kill this idea if it were false?
- Is this a user-facing product problem, an internal workflow problem, or a developer experience problem?

## Product Brief

When ready, output:

```markdown
## Product Brief

Problem:
User:
Current workaround:
Narrowest useful wedge:
Non-goals:
Key risks:
Recommended approach:
Downstream handoff:
```

When the next step is implementation, hand the accepted brief to the engineering flow: use `$to-spec` to capture the agreed product decisions, then `$to-tickets` when the work needs tracer-bullet slices and blocking edges. Use `$codebase-design` before implementation when module boundaries or test seams are still unresolved.

## Guardrails

- Do not expand scope silently. Present expansions as options.
- Do not turn every small coding task into product strategy.
- If the user already gave a precise implementation request, keep the product pass short.
- Preserve user sovereignty: recommend, but let the user decide.
