# UI UX Pro Max Patterns For Frontend Design

Source:
- Open Design catalogue entry: https://github.com/nexu-io/open-design/tree/main/skills/ui-ux-pro-max
- Upstream project: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill

## What To Learn

UI UX Pro Max is useful less as a single prompt and more as a structured design intelligence pattern.

Its strong ideas:

1. **Searchable design knowledge.** It stores product types, UI styles, color palettes, typography pairings, landing structures, chart guidance, UX rules, and stack-specific guidance as queryable data instead of one long prompt.
2. **Design-system-first workflow.** New pages start by generating a design system, then use focused searches only for unresolved dimensions.
3. **Multi-domain reasoning.** A product request is decomposed into product category, style, color, typography, landing pattern, effects, and anti-patterns.
4. **Master plus page overrides.** The durable design system is a master file, while individual pages can define scoped deviations.
5. **Pre-delivery checklist.** The workflow ends with checks for accessibility, interaction feedback, responsive breakpoints, contrast, motion, focus states, and icon usage.

## Adapt For This Skill

When using `frontend-design`, do not claim UI UX Pro Max is installed unless its upstream data and scripts are present locally. Instead, borrow the pattern:

1. Extract the product type, user context, stack, and artifact type.
2. Decide a primary design-system recommendation:
   - product pattern
   - visual style
   - color roles
   - typography roles
   - layout pattern
   - motion/effects
   - anti-patterns to avoid
3. If uncertainty remains, perform focused research or codebase inspection for only that dimension.
4. Persist durable direction in `DESIGN.md` or the nearest project design-system file.
5. Run a pre-delivery pass before reporting completion.

## Reference Domains

Use these domains as mental search buckets even when no local search script exists:

| Domain | Use For | Typical Questions |
| --- | --- | --- |
| Product | Category-to-pattern fit | What kind of product is this, and what structure does it need? |
| Style | Visual language | Which aesthetic supports trust, speed, luxury, play, clarity, or density? |
| Color | Semantic palette | Which colors carry brand, action, surface, success, warning, and error roles? |
| Typography | Font roles | What display, body, label, data, and code fonts fit the product? |
| Landing | Marketing structure | What section order and CTA rhythm match the conversion goal? |
| Chart | Data display | Which chart best represents comparison, trend, proportion, flow, or status? |
| UX | Interaction quality | What loading, empty, error, focus, motion, and recovery states are needed? |
| Stack | Implementation fit | What framework-specific constraints affect the design? |

## Local Checklist To Reuse

- Start from design-system recommendation before component details.
- Encode the chosen direction into tokens, not scattered raw values.
- Define page-specific overrides only when they clarify a real exception.
- Prefer SVG/icon libraries over emoji for functional UI.
- Verify 375, 768, 1024, and 1440 px layouts when practical.
- Check contrast, focus, reduced motion, text scaling, and touch target size.
- Avoid default category cliches such as generic SaaS card grids, decorative metrics, or automatic purple gradients.

