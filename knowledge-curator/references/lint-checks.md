# Lint Checks

Complete list of wiki health checks for `07_Wiki/`. Run periodically or when user requests.

---

## Structural Checks

### Orphan Pages

Pages in `07_Wiki/` with zero inbound `[[links]]` from other wiki pages.

**How to find**: Scan all wiki pages. For each page, check if any other page contains `[[page-name]]`. Pages with no inbound links are orphans.

**Fix**: Either add links from related pages, or delete if the page has no value.

### Missing Pages

`[[wikilinks]]` that point to pages that don't exist in `07_Wiki/`.

**How to find**: Extract all `[[link-targets]]` from wiki pages. Check if target `.md` file exists.

**Fix**: Create the missing page (even a stub is better than a broken link).

### Empty or Stub Pages

Pages with less than 50 words of content (excluding frontmatter).

**How to find**: Read each page, count word length of body.

**Fix**: Expand with available information from sources, or mark for future development.

---

## Content Quality Checks

### Contradictions

Different pages make conflicting claims about the same topic.

**How to detect**: Look for entity/concept pages referenced by multiple sources. Compare factual claims. Flag when dates conflict, descriptions fundamentally disagree, or one source's "fact" contradicts another.

**Fix**: Add a `## Contradictions` section noting the conflict, citing both sources. Let the user decide which is authoritative.

### Stale Claims

Claims that newer sources have superseded or invalidated.

**How to detect**: Compare dates of sources. When a newer source discusses the same topic as an older one, check if facts have changed.

**Fix**: Update the wiki page with current information. Move old claims to an "Historical" or "Previously believed" section.

### Low Cross-Reference Density

Pages that discuss concepts/entities mentioned on other pages but don't link to them.

**How to detect**: For each wiki page, extract key terms. Check if any match an existing entity/concept page name. If match exists but no `[[link]]` is present, flag it.

**Fix**: Add `[[wikilinks]]` where appropriate.

---

## Completeness Checks

### Concepts Without Pages

Important concepts mentioned across multiple sources but lacking their own page in `07_Wiki/concepts/`.

**How to detect**: Extract common terms/phrases from source summaries. Check if they have corresponding concept pages. Terms appearing in 3+ sources without a page are candidates.

**Fix**: Create concept page.

### Entities Without Pages

People, tools, or organizations mentioned repeatedly without entity pages in `07_Wiki/entities/`.

**How to detect**: Same approach as concepts — extract named entities from sources.

**Fix**: Create entity page.

### Un-ingested Sources

Raw notes across the vault (00-06) that have never been ingested into `07_Wiki/`.

**How to detect**: List `.md` files in raw source locations. For `03_Resources/`, check A-F prefixed files and Clippings/. Also scan `01_Projects/` for completed project learnings and `02_Areas/` for area reference notes. Check if corresponding `07_Wiki/sources/` page exists.

**Fix**: Recommend ingesting the source. Prioritize by recency and relevance.

---

## Reporting Format

```markdown
# Wiki Health Report — YYYY-MM-DD

## Summary

- Total wiki pages: N
- Issues found: N
- Critical: N | Warning: N | Info: N

## Critical Issues

### [Issue Type]: [Details]

- Location: [[page-name]]
- Description: what's wrong
- Suggested fix: specific action

## Warnings

### [Issue Type]: [Details]

- Location: [[page-name]]
- Suggested fix: specific action

## Suggestions

### [Issue Type]: [Details]

- Opportunity for improvement

## Recommended Actions

1. Action 1 (priority: high)
2. Action 2 (priority: medium)
3. Action 3 (priority: low)
```

After presenting the report, ask user which fixes to apply. Execute only approved fixes.
