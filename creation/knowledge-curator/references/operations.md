# Operations — Detailed Procedures

## Ingest Procedure

### Step 1: Read and Analyze

Read the source document completely. Identify:

- **Entities**: people, tools, companies, projects, books mentioned
- **Concepts**: ideas, frameworks, mental models, principles
- **Facts**: claims, data points, statistics, dates
- **Connections**: how this relates to existing wiki content in `07_Wiki/`

### Step 2: Discuss with User

Present a 3-bullet summary:

```text
📥 Source: [title]
- Key takeaway 1
- Key takeaway 2
- Key takeaway 3

Which aspects should I emphasize in the wiki? Any entities or concepts to prioritize?
```

Wait for user response before proceeding.

### Step 3: Create Source Summary

Create `07_Wiki/sources/[slug].md` using the source template from [page-templates.md](page-templates.md).

Key requirements:

- Slug should be URL-safe: lowercase, hyphens, no spaces
- Summary should be 2-3 paragraphs, capturing the core argument
- List all entities and concepts with `[[wikilinks]]`
- Include notable quotes when source has compelling phrasing
- Add a "Significance" section explaining why this source matters

### Step 4: Update Entity Pages

For each entity mentioned:

- **If page exists** in `07_Wiki/entities/`: Append new information under appropriate section. Add `[[sources/source-slug]]` to Sources. Note if new information contradicts existing content in a `## Contradictions` section.
- **If page doesn't exist**: Create `07_Wiki/entities/[entity-slug].md` using the entity template.

### Step 5: Update Concept Pages

For each concept:

- Same create/update logic as entities
- Create in `07_Wiki/concepts/[concept-slug].md`
- Set `confidence` field based on source quality and corroboration

### Step 6: Cross-Reference

Scan all pages touched in this ingest. Ensure:

- Every entity page links to relevant concept pages
- Every concept page links to related entities
- `[[wikilinks]]` are bidirectional where meaningful
- The source summary links to all entities and concepts it discusses

### Step 7: Update Index

Add entry to `07_Wiki/index.md` under the appropriate category:

```markdown
- [[sources/source-slug]] — One-line summary (YYYY-MM-DD)
```

Also add new entity/concept entries if created.

### Step 8: Log

Append to `07_Wiki/log.md`:

```markdown
## [YYYY-MM-DD] ingest | Source Title
- Source: [[original/note/path]]
- Created: sources/source-slug.md
- Updated entities: entity1, entity2
- Updated concepts: concept1, concept2
- Total pages touched: N
```

### Step 9: Report

Tell the user:

```text
✅ Ingested: [Source Title]
📄 Created: 3 new pages (source summary, 1 entity, 1 concept)
📝 Updated: 4 existing pages
🔗 Added: 12 cross-references
```

---

## Query Procedure

### Step 1: Index Scan

Read `07_Wiki/index.md`. Identify all potentially relevant pages by:

- Matching keywords in page summaries
- Following concept-entity links
- Checking source summaries for related topics

### Step 2: Deep Read

Read the identified pages in full. Prioritize:

1. Concept pages (synthesized knowledge)
2. Syntheses (cross-cutting analysis)
3. Entity pages (specific details)
4. Source summaries (original context)

If wiki content is insufficient, search raw sources across `00_Inbox/` through `06_Metadata/`.

### Step 3: Synthesize Answer

Construct response with:

- Direct answer to the question
- Supporting evidence from wiki pages, cited as `[[page-name]]`
- Connections the user may not have considered
- Gaps or contradictions in current knowledge

### Step 4: Write-Back Decision

Evaluate: "Is this answer reusable? Would future queries benefit from having this synthesis pre-computed?"

**Write back if**: the answer synthesizes 3+ sources, reveals non-obvious connections, or creates a comparison/framework.

**Don't write back if**: the answer is a simple fact lookup or already exists as a wiki page.

If writing back, create `07_Wiki/syntheses/[topic-slug].md` and update index.

---

## Batch Ingest

For processing multiple sources at once:

1. List all sources to process
2. For each source, create the source summary (skip discussion step)
3. After all summaries created, do a single pass of entity/concept updates
4. Update `07_Wiki/index.md` once at the end
5. Create one consolidated log entry in `07_Wiki/log.md`

---

## Rebuild Index Procedure

Use this when the user asks to update, refresh, rebuild, or recompile the `07_Wiki/` index layer.

### Step 1: Confirm Vault Root

Identify the vault root. In Claudesidian this is usually:

```text
C:\Users\jiaji\Documents\github-project\claudesidian
```

If the current working directory is already the vault root, use `--vault .`.

### Step 2: Run Deterministic Indexer

Run the bundled skill script:

```bash
python <skill-dir>/scripts/rebuild_wiki_index.py --vault <vault-root>
```

For a preview without writes:

```bash
python <skill-dir>/scripts/rebuild_wiki_index.py --vault <vault-root> --dry-run --json
```

### Step 3: Generated Files

The script rewrites only generated files in `07_Wiki/`:

- `index.md`
- `source-map.md`
- `recent.md`
- `health.md`
- `manifest.json`

It also appends one operation entry to `07_Wiki/log.md`.

### Step 4: Safety Rules

- Never edit `00_Inbox/` through `06_Metadata/`.
- Never delete existing `07_Wiki/concepts/`, `entities/`, `sources/`, or `syntheses/` pages.
- Treat generated index files as replaceable machine output.
- Treat concept/entity/source/synthesis pages as interpretive compiled knowledge that still requires user confirmation before changes.

### Step 5: Report

Tell the user:

```text
Updated 07_Wiki index.
- Source notes scanned: N
- Wiki pages scanned: N
- Generated: index.md, source-map.md, recent.md, health.md, manifest.json
- Health: X missing frontmatter, Y broken wikilinks, Z notes without parent
```

---

## Source Type Handling

| Source Type | Location | Ingest Focus |
| ----------- | -------- | ------------ |
| Web article/clipping | 03_Resources/Clippings/ | Extract key arguments, entities, concepts |
| Book notes (highlights) | 03_Resources/ | Extract per-chapter insights, track themes |
| Daily note / journal | 00_Inbox/ | Extract actionable insights, decisions |
| Technical article | 03_Resources/ | Extract tools, patterns, code concepts |
| Translation (D- series) | 03_Resources/ | Extract core thesis, mental models, entities |
| Planning note (B- series) | 02_Areas/ | Extract goals, milestones, decision rationale |
| Podcast / video notes | 03_Resources/ | Extract speaker claims, references |
| Project notes | 01_Projects/ | Extract learnings, patterns, outcomes |
