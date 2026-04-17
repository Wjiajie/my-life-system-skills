# Wiki Page Templates

All wiki pages live in `07_Wiki/`. Use YAML frontmatter + markdown body. Use `[[wikilinks]]` for cross-references.

---

## Index Page

Location: `07_Wiki/index.md`

```markdown
---
type: index
updated: YYYY-MM-DD
---

# Wiki Index

## Concepts

- [[concepts/concept-slug]] — One-line description

## Entities

- [[entities/entity-slug]] — One-line description

## Sources

- [[sources/source-slug]] — One-line summary (YYYY-MM-DD)

## Syntheses

- [[syntheses/synthesis-slug]] — One-line description (YYYY-MM-DD)

---

Total pages: N | Last updated: YYYY-MM-DD
```

---

## Log Page

Location: `07_Wiki/log.md`

```markdown
---
type: log
---

# Wiki Log

<!-- Append-only. Each entry: ## [YYYY-MM-DD] operation | Title -->

## [YYYY-MM-DD] init | Wiki Initialized

- Created directory structure
- Bootstrapped from existing vault notes
```

---

## Source Summary

Location: `07_Wiki/sources/[slug].md`

```markdown
---
type: source
title: "Source Title"
created: YYYY-MM-DD
updated: YYYY-MM-DD
source_path: "[[03_Resources/path/to/original]]"
source_type: article
tags: [tag1, tag2]
entities: [entity1, entity2]
concepts: [concept1, concept2]
---

# Source Title

## Summary

2-3 paragraph synthesis of the source content.

## Key Points

- Point with evidence
- Point with evidence

## Entities Mentioned

- [[entities/name]] — context of mention

## Concepts Discussed

- [[concepts/name]] — relevance to this source

## Notable Quotes

> "Quote text" — attribution

## Significance

Why this source matters in the broader context of the wiki.
```

---

## Entity Page

Location: `07_Wiki/entities/[slug].md`

```markdown
---
type: entity
entity_type: person
title: "Entity Name"
created: YYYY-MM-DD
updated: YYYY-MM-DD
source_count: 1
tags: [tag1, tag2]
---

# Entity Name

## Overview

What/who this is and why it matters.

## Key Facts

- Fact 1 — [[sources/source]]
- Fact 2 — [[sources/source]]

## Related Concepts

- [[concepts/concept]] — relationship description

## Related Entities

- [[entities/other]] — relationship description

## Sources

- [[sources/source1]]
- [[sources/source2]]

## Evolution

- YYYY-MM-DD: Initial entry from [[sources/source]]
```

Supported `entity_type` values: `person`, `tool`, `company`, `book`, `project`, `organization`.

---

## Concept Page

Location: `07_Wiki/concepts/[slug].md`

```markdown
---
type: concept
title: "Concept Name"
created: YYYY-MM-DD
updated: YYYY-MM-DD
source_count: 1
confidence: medium
tags: [tag1, tag2]
---

# Concept Name

## Definition

Clear, concise definition in the user's own framing.

## Key Principles

1. Principle with explanation
2. Principle with explanation

## Examples

- Example from [[sources/source]]
- Real-world application

## Related Concepts

- [[concepts/related]] — how they connect
- [[concepts/contrasting]] — how they differ

## Key Proponents

- [[entities/person]] — their contribution

## Sources

- [[sources/source1]]

## Open Questions

- Question that needs more research
```

`confidence` values: `low` (single source, speculative), `medium` (multiple sources, reasonable), `high` (well-corroborated, extensively discussed).

---

## Synthesis Page

Location: `07_Wiki/syntheses/[slug].md`

```markdown
---
type: synthesis
title: "Synthesis Title"
created: YYYY-MM-DD
updated: YYYY-MM-DD
query: "Original question that prompted this"
source_count: 3
tags: [tag1, tag2]
---

# Synthesis Title

## Question

The question or analysis that prompted this synthesis.

## Analysis

Multi-paragraph synthesis drawing from multiple sources and wiki pages.

## Key Findings

1. Finding with [[citations]]
2. Finding with [[citations]]

## Implications

- What this means for the user's domain/goals

## Sources Used

- [[sources/source1]]
- [[concepts/concept1]]
- [[entities/entity1]]

## Gaps

- What's still unknown
- Suggested sources to investigate
```
