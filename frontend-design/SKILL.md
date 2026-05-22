---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Acts as the dedicated Frontend Developer in a micro-agent full-stack workflow. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Design System Operating Model

Borrow the useful shape of Open Design without depending on its runtime:

Relevant local references:
- `references/ui-ux-pro-max-patterns.md` for searchable design knowledge, domain buckets, master/page overrides, and pre-delivery checks.
- `references/design-consultation-patterns.md` for brand-from-zero design-system kickoff, creative-risk proposals, preview-first validation, and durable `DESIGN.md` structure.

1. **Resolve project context first.** If the repo contains a design-system file (`DESIGN.md`, brand guide, tokens file, screenshots, Figma notes, or an existing component library), treat it as the primary visual contract. Do not freestyle over an existing brand.
2. **Separate brand from craft.** Brand rules answer "what this product should feel like"; craft rules answer "what good interface work always requires." Brand rules win when they conflict with generic craft guidance.
3. **Lock a direction before coding.** When no brand exists, pick one concrete direction with palette, type stack, layout posture, interaction density, and 2-4 real references. Bind that direction into CSS variables or design tokens before writing components.
4. **Choose the artifact type.** Decide whether the request is a product UI, landing page, dashboard, mobile flow, deck-like page, poster/card, data visualization, or design-system artifact. The artifact type determines density, controls, state coverage, motion, and verification.
5. **Use templates only when they raise the floor.** Reuse local components, shadcn patterns, app shells, or starter layouts when they match the product. Otherwise design from first principles.

When a full `DESIGN.md` is available or worth creating, prefer this compact 9-part shape:

```markdown
# <Product or Brand>
## Visual Theme & Atmosphere
## Color Palette & Roles
## Typography Rules
## Component Stylings
## Layout Principles
## Depth & Elevation
## Do's and Don'ts
## Responsive Behavior
## Agent Prompt Guide
```

### Direction Fallbacks

If the user gives no brand and the repo has no usable visual contract, choose one of these as a starting point and make it specific to the product:

- **Editorial intelligence:** print-magazine hierarchy, restrained palette, one decisive image, serif display, quiet confidence.
- **Modern product minimal:** structured software UI, sparse color, crisp controls, low ornament, strong alignment.
- **Technical utility:** dense information, mono accents, visible system status, comparison tables, sharp affordances.
- **Brutalist clarity:** oversized type, hard borders, asymmetric layout, direct copy, deliberate visual tension.
- **Soft warm utility:** calm surfaces, humane empty states, gentle contrast, rounded but not bubbly components.

Never leave the direction as a vibe label. Name the fonts, token values, spacing rhythm, radius, border/shadow logic, and interaction posture.

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Use Motion library for React when available. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic. Apply creative forms like gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, and grain overlays.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. NEVER converge on common choices (Space Grotesk, for example) across generations.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations and effects. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

Remember: Claude is capable of extraordinary creative work. Don't hold back, show what can truly be created when thinking outside the box and committing fully to a distinctive vision.

## Artifact Quality Gates

Before calling the design done, pass these gates:

- **P0 - Usable artifact:** the primary screen renders, core controls work, no blank canvas, no text overflow, no incoherent overlap, and mobile/desktop layouts are intentionally composed.
- **P0 - Context fidelity:** if brand/project context exists, tokens, components, copy tone, and density match it. If no context exists, the selected direction is fully encoded in CSS/design tokens.
- **P0 - State coverage:** loading, empty, error, success, partial, long-content, and narrow-viewport states are handled for every user-facing workflow touched.
- **P1 - Anti-slop check:** remove generic purple gradients, interchangeable card grids, decorative fake metrics, emoji-as-icons, unmotivated glassmorphism, and any visual choice that could belong to any product.
- **P1 - Craft check:** typography hierarchy, color roles, spacing scale, radius, elevation, motion timing, accessibility, and touch targets are deliberate and consistent.
- **P2 - Export/readiness:** if the output is an artifact page, keep it self-contained enough to preview or export cleanly. If it is integrated app code, follow the repo's component and styling conventions.

## Design Quality Audit — 0-10 Rating Method

> Inspired by GStack's `/plan-design-review`. Use this method to **review and elevate** any frontend design from its current state to a 10/10.

For each design dimension below, rate the current design 0-10. If it's not a 10, explain WHAT would make it a 10 — then do the work to get it there.

**Rating Loop:**
1. **Rate**: "Typography: 4/10"
2. **Gap**: "It's a 4 because the heading and body use the same font weight. A 10 would have a distinctive display font paired with a refined body font, with intentional scale and rhythm."
3. **Fix**: Edit the design/code to add what's missing
4. **Re-rate**: "Now 8/10 — still missing responsive type scaling"
5. **Ask user** if there's a genuine design choice to resolve
6. **Fix again** → repeat until 10 or user says "good enough, move on"

### 7-Dimension Design Audit

#### Dimension 1: Information Architecture
Does the user know what to see first, second, third? Apply "constraint worship" — if you can only show 3 things, which 3? Include ASCII diagram of screen structure and navigation flow.

#### Dimension 2: Interaction State Coverage
Does the design specify all states? Build a mental state table:

```
FEATURE          | LOADING | EMPTY | ERROR | SUCCESS | PARTIAL
-----------------|---------|-------|-------|---------|--------
[each feature]   | [spec]  | [spec]| [spec]| [spec]  | [spec]
```

**Empty states are features** — specify warmth, a primary action, and context. "No items found." is not a design.

#### Dimension 3: User Journey & Emotional Arc
Design for three time horizons simultaneously:
- **5 seconds** (visceral): First impression, visual impact
- **5 minutes** (behavioral): Task flow, interaction quality
- **5-year** (reflective): Brand memory, identity, trust

#### Dimension 4: AI Slop Risk 🚨
Detect and eliminate generic AI patterns:
- "Cards with icons" → What differentiates these from every SaaS template?
- "Hero section" → What makes this hero feel like THIS product?
- "Clean, modern UI" → Meaningless. Replace with actual design decisions.
- "Dashboard with widgets" → What makes this NOT every other dashboard?

**If it looks like it could be any product's UI, it fails.**

#### Dimension 5: Design System Alignment
Does the design use consistent tokens (spacing, colors, radius, shadows)? Flag any new component — does it fit the existing visual vocabulary? Use CSS variables for all design tokens.

#### Dimension 6: Responsive & Accessibility
- Responsive is NOT "stacked on mobile" — each viewport gets intentional design
- Keyboard navigation patterns specified
- ARIA landmarks and screen reader support
- Touch targets ≥ 44px
- Color contrast meeting WCAG AA

#### Dimension 7: Unresolved Design Decisions
Surface ambiguities that will haunt implementation:

```
DECISION NEEDED               | IF DEFERRED, WHAT HAPPENS
------------------------------|---------------------------
What does empty state look like? | Engineer ships "No items found."
Mobile navigation pattern?       | Desktop nav hides behind hamburger
```

## Design Principles

Core principles that separate intentional design from accidental output:

1. **Empty states are features.** Every empty state needs warmth, a primary action, and context.
2. **Every screen has a hierarchy.** If everything competes, nothing wins.
3. **Specificity over vibes.** Name the font, the spacing scale, the interaction pattern.
4. **Edge cases are user experiences.** 47-char names, zero results, error states — these are features, not afterthoughts.
5. **Subtraction default.** If a UI element doesn't earn its pixels, cut it.
6. **Trust is earned at the pixel level.** Every interface decision either builds or erodes user trust.
7. **Principled taste is debuggable.** Never say "this feels off" without tracing it to a broken principle.

### Cognitive Patterns — How Great Designers See

These aren't a checklist — they're perceptual instincts. Let them run automatically:

1. **Seeing the system, not the screen** — What comes before, after, and when things break
2. **Empathy as simulation** — Run mental simulations: bad signal, one hand free, boss watching, first time vs 1000th time
3. **Hierarchy as service** — Respecting the user's time, not prettifying pixels
4. **Constraint worship** — "If I can only show 3 things, which 3 matter most?"
5. **Edge case paranoia** — 47 chars? Zero results? Network fails? Colorblind? RTL?
6. **The "Would I notice?" test** — Invisible = perfect. The highest compliment is not noticing the design
7. **Time-horizon design** — 5s visceral, 5min behavioral, 5yr reflective — design for all three

> Key references: Dieter Rams' 10 Principles, Don Norman's 3 Levels of Design, Nielsen's 10 Heuristics, Gestalt Principles, Joe Gebbia (designing for trust, storyboarding emotional journeys)
