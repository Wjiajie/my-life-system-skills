# Review Workflows

Procedures for daily and weekly reviews that integrate `07_Wiki/` operations.

---

## Daily Review

### Step 1: Gather Activity

Find all vault files modified today across all PARA layers (00-06). Include wiki pages touched in `07_Wiki/`.

### Step 2: Progress Summary

For each active project and area:

- What was accomplished
- What got stuck
- Unexpected discoveries

### Step 3: Insight Extraction

From today's work, identify:

- New connections between ideas
- Questions that arose
- Key learnings

### Step 4: Wiki Integration

For each extracted insight, evaluate:

- Does this update an existing concept/entity page in `07_Wiki/`? → Update it
- Does this warrant a new concept page? → Propose it to user
- Did any source get partially ingested? → Complete the ingest

### Step 5: Create Review Note

Create `00_Inbox/YYYY-MM-DD-daily-review.md` (human-owned):

```markdown
# Daily Review — YYYY-MM-DD

## Accomplished

- Item 1
- Item 2

## Progress

- [Project/Area]: what moved forward

## Insights

- Key realization or connection

## Blocked

- What didn't progress and why

## Tomorrow's Focus

1. Priority 1
2. Priority 2
3. Priority 3

## Wiki Updates

- Updated: [[07_Wiki/concepts/X]], [[07_Wiki/entities/Y]]
- Created: [[07_Wiki/concepts/Z]]
```

### Step 6: Log

Append to `07_Wiki/log.md`:

```markdown
## [YYYY-MM-DD] review | Daily Review

- Notes reviewed: N
- Wiki pages updated: N
- New wiki pages: N
```

---

## Weekly Synthesis

### Step 1: Gather Week's Work

- All notes created/modified this week across vault (00-06)
- All wiki operations from `07_Wiki/log.md` this week

### Step 2: Pattern Analysis

Identify across the week:

- Recurring themes
- Common challenges
- Energy patterns (from daily reviews if available)
- Breakthrough moments

### Step 3: Synthesize Learnings

- Key insights that emerged
- How thinking evolved
- Connections discovered
- Questions answered and raised

### Step 4: Wiki Compounding

This is the most important step — it's where knowledge compounds.

Evaluate each weekly theme:

- **Synthesis opportunity**: Create `07_Wiki/syntheses/weekly-[topic].md` for cross-cutting themes
- **Concept maturation**: Update concept pages with new nuance from the week
- **Entity evolution**: Update entity pages with new interactions/learnings
- **Gap identification**: Note what's missing — suggest sources to find

### Step 5: Create Synthesis Note

Create `00_Inbox/YYYY-MM-DD-weekly-synthesis.md`:

```markdown
# Weekly Synthesis — Week of YYYY-MM-DD

## Week at a Glance

- Notes created: X
- Sources ingested: X
- Wiki pages created/updated: X
- Active projects: [list]

## Key Themes

### Theme 1: [Name]

- Where it appeared
- Why it matters
- Next actions

## Major Insights

1. Insight with context
2. Insight with context

## Connections Made

- [[A]] connects to [[B]]: significance of connection

## Wiki Growth

- New concepts: [list]
- New entities: [list]
- New syntheses: [list]
- Total wiki pages: N (+growth this week)

## Next Week's Intentions

1. Primary focus
2. Secondary focus
3. Thing to explore
```

### Step 6: Auto-Lint

After weekly synthesis, automatically run lint checks on `07_Wiki/`. Present findings as part of the weekly report.
