# Design Consultation Patterns For Frontend Design

Source:
- Open Design catalogue entry: https://github.com/nexu-io/open-design/tree/main/skills/design-consultation
- Upstream project: https://github.com/garrytan/gstack
- Upstream skill: https://github.com/garrytan/gstack/blob/main/design-consultation/SKILL.md

## What To Learn

Design Consultation is useful for brand-from-zero work and design-system kickoff. Its valuable pattern is a staged process, not a bundle to copy wholesale.

Its strong ideas:

1. **Pre-check before invention.** Look for existing `DESIGN.md`, design-system files, brand notes, screenshots, and prior decisions before proposing a new direction.
2. **Product-context interview.** Identify audience, product category, trust needs, emotional tone, competitive landscape, and critical screens before visual decisions.
3. **Landscape research.** Study comparable products for type, color, density, layout, and motion, then synthesize what to follow and what to avoid.
4. **Safe plus risky proposal.** A coherent design is table stakes. The proposal should include a safe foundation plus two or more deliberate creative risks with tradeoffs.
5. **Preview before codifying.** Show the direction through realistic screens or a rendered preview so the design system is tested visually before becoming policy.
6. **Write `DESIGN.md` as the source of truth.** Final output should be a reusable design-system document, not only a chat explanation.

## Adapt For This Skill

Use this pattern when the user asks for:

- a new product UI with no existing design system
- brand guidelines
- a visual direction from scratch
- a redesign whose current brand is weak or missing
- a durable `DESIGN.md`

Do not run the full gstack workflow unless it is installed and explicitly requested. For this skill, use the compact version:

1. Check for existing design sources.
2. Gather only the missing product context that changes visual direction.
3. Research or infer competitor/category conventions.
4. Propose one integrated direction:
   - aesthetic
   - typography stack
   - color palette
   - spacing/radius/elevation
   - layout approach
   - motion posture
   - safe choices
   - creative risks
5. Render or implement a realistic screen, not just a palette board.
6. Persist the approved direction into `DESIGN.md` or update the closest equivalent.

## DESIGN.md Shape

Use this structure when a project-level design system is needed:

```markdown
# <Product or Brand> Design System

## Product Context
Audience, category, primary use cases, trust needs, and critical screens.

## Aesthetic Direction
Named direction, mood, reference categories, and the choices this direction rejects.

## Typography
Display, body, UI label, data, and code font roles with rationale.

## Color
Primary, accent, surface, text, border, muted, success, warning, and error roles.

## Spacing
Spacing scale, density, section rhythm, and component padding rules.

## Shape And Elevation
Radius scale, border style, shadow/elevation rules, and layering.

## Layout
Grid, content width, navigation, page composition, and mobile behavior.

## Motion
Duration, easing, entrance/exit behavior, reduced-motion policy, and when not to animate.

## Component Rules
Buttons, forms, cards, tables, modals, empty states, errors, and loading states.

## Creative Risks
Two or more intentional deviations from category defaults, each with tradeoffs.

## Decisions Log
Accepted decisions, rejected alternatives, and reasons.

## Agent Prompt Guide
Short instructions future agents must follow before making visual changes.
```

## Creative Risk Rubric

Every new direction should contain a stable foundation and controlled risks:

| Layer | Safe Foundation | Possible Risk |
| --- | --- | --- |
| Typography | Clear hierarchy and readable body text | Unexpected display face or tighter editorial scale |
| Color | Accessible semantic roles | Uncommon accent or restrained monochrome system |
| Layout | Predictable task flow | Asymmetry, overlap, or editorial rhythm in non-critical areas |
| Motion | Fast feedback and state continuity | One signature transition or kinetic brand moment |
| Density | Comfortable scanning | Deliberately dense operational surfaces where expert users benefit |

## Local Checklist To Reuse

- Existing design source checked before proposing a new one.
- Proposal names both safe decisions and creative risks.
- At least one realistic screen proves the system in context.
- `DESIGN.md` or equivalent contains exact tokens and rules.
- Future-agent guidance is included so the system survives later edits.

