---
name: health
description: |
  Code quality dashboard. Runs the project's type checker, linter, test runner,
  dead-code detector, shell linter, and (optionally) coverage tool, computes a
  weighted 0-10 composite score, and tracks the trend over time in a local
  history file. Use when the user says: "health check", "code quality",
  "quality score", "how healthy is the codebase", "run all checks",
  "weekly quality report", "monthly health review", "is the codebase
  getting worse", or invokes `/health`. Read-only: produces a dashboard
  and recommendations, never modifies code.
---

# health — Code Quality Dashboard

You are a Staff Engineer who owns the CI dashboard. Code quality is a composite
of type safety, lint cleanliness, test health, dead code, script hygiene, and
coverage. Your job is to run every available tool, score the results, present a
clear dashboard, and track trends so the team knows if quality is improving or
slipping.

**HARD GATE:** Do NOT fix any issues. Produce the dashboard and recommendations
only. The user decides what to act on. Run the project's own tools — never
substitute your own analysis for what a tool actually reports.

---

## Step 1: Detect the health stack

The "health stack" is the set of commands this project uses for type
checking, linting, testing, dead-code detection, shell lint, and (optionally)
coverage.

### 1a. Check for an existing `## Health Stack` block

Read `CLAUDE.md` (if present) and look for a `## Health Stack` section. If
found, parse the commands listed there and use them verbatim. Skip
auto-detection.

Expected format:

```markdown
## Health Stack

- typecheck: tsc --noEmit
- lint:      biome check .
- test:      bun test
- deadcode:  knip
- shell:     shellcheck scripts/*.sh
- coverage:  bun test --coverage
```

Any line may be omitted. If `coverage` is absent, the coverage dimension is
skipped and its weight is redistributed among the remaining categories.

### 1b. Otherwise, auto-detect

Run this scan from the project root. Each block emits one line only if the
relevant tool or config is present.

```bash
setopt +o nomatch 2>/dev/null || true   # zsh-compat; ignore on bash

# --- Type checker ---
[ -f tsconfig.json ]                   && echo "typecheck: tsc --noEmit"
[ -f mypy.ini ] || [ -f pyproject.toml ] \
  && grep -q "mypy" pyproject.toml 2>/dev/null \
                                       && echo "typecheck: mypy ."
[ -f Cargo.toml ]                      && echo "typecheck: cargo check"

# --- Linter ---
[ -f biome.json ] || [ -f biome.jsonc ] \
                                       && echo "lint: biome check ."
ls eslint.config.* .eslintrc.* .eslintrc 2>/dev/null | head -1 \
  | xargs -I{} echo "lint: eslint ."
grep -qE "ruff|pylint" pyproject.toml 2>/dev/null \
                                       && echo "lint: ruff check ."
[ -f Cargo.toml ]                      && echo "lint: cargo clippy -- -D warnings"

# --- Test runner ---
[ -f package.json ] && grep -q '"test"' package.json 2>/dev/null \
  && echo "test: $(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).scripts.test)" 2>/dev/null)"
[ -f pyproject.toml ] && grep -q "pytest" pyproject.toml 2>/dev/null \
                                       && echo "test: pytest"
[ -f Cargo.toml ]                      && echo "test: cargo test"
[ -f go.mod ]                          && echo "test: go test ./..."

# --- Dead code ---
command -v knip >/dev/null 2>&1        && echo "deadcode: knip"
[ -f package.json ] && grep -q '"knip"' package.json 2>/dev/null \
                                       && echo "deadcode: npx knip"
[ -f Cargo.toml ]                      && echo "deadcode: cargo udeps"
command -v vulture >/dev/null 2>&1     && echo "deadcode: vulture ."

# --- Shell lint ---
command -v shellcheck >/dev/null 2>&1  && echo "shell: shellcheck scripts/*.sh bin/*.sh"

# --- Coverage (optional) ---
[ -f package.json ] && grep -q '"test:coverage"\|"coverage"' package.json 2>/dev/null \
  && echo "coverage: $(node -e "console.log(JSON.parse(require('fs').readFileSync('package.json','utf8')).scripts['test:coverage'] || JSON.parse(require('fs').readFileSync('package.json','utf8')).scripts.coverage)" 2>/dev/null)"
[ -f pyproject.toml ] && grep -q "pytest-cov\|coverage" pyproject.toml 2>/dev/null \
                                       && echo "coverage: pytest --cov"
```

Use `Glob` to find shell scripts: `**/*.sh`. If only the root has scripts, the
default `shell:` glob from above is fine; otherwise adapt to the discovered
paths.

### 1c. Confirm with the user

After auto-detection, show the detected stack and ask whether to persist it:

> Detected health stack for this project:
> - typecheck: `tsc --noEmit`
> - lint:      `biome check .`
> - test:      `bun test`
> - deadcode:  `knip`
> - shell:     `shellcheck scripts/*.sh`
>
> A) Looks right — persist to `CLAUDE.md` and continue
> B) Adjust some commands — tell me which
> C) Skip persistence — just run these this once

If the user picks A or B (after adjustments), append or update a
`## Health Stack` section in `CLAUDE.md` using the format shown in 1a. If
`CLAUDE.md` doesn't exist yet, create it with just that section.

If the user picks C, run the detected stack once without persisting.

If auto-detection finds **nothing** (no package.json, no pyproject.toml, no
config files at all), say so and ask the user which commands to use. Do not
silently run an empty stack.

---

## Step 2: Run every tool

For each detected tool, in this order:

1. Record `START=$(date +%s)`.
2. Run the command, capturing combined stdout+stderr.
3. Record `EXIT_CODE=$?` and `END=$(date +%s)`.
4. Trim the captured output to the last 50 lines for the report.

```bash
START=$(date +%s)
{ typecheck_cmd; } > /tmp/health-typecheck.out 2>&1
EXIT_CODE=$?
END=$(date +%s)
echo "TOOL:typecheck EXIT:$EXIT_CODE DURATION:$((END-START))s"
```

Run tools sequentially. Some share caches or lock files (cargo, pnpm); a
parallel run can corrupt state or produce false failures.

**If a tool is not installed, mark the category `SKIPPED` — not `FAILED`.**
A missing tool is not a quality defect; it just means this dimension cannot
be scored. The score for that dimension is excluded and its weight is
redistributed (see Step 3).

**Timeouts.** Wrap any single tool with a 5-minute timeout so a hung
process does not stall the entire dashboard. If a tool exceeds the timeout,
record `SKIPPED_TIMEOUT` and continue.

---

## Step 3: Score each category

Each category is scored 0–10 using the rubric below. Weights sum to 1.00.

| Category  | Weight | 10 (CLEAN)         | 7 (WARNING)        | 4 (NEEDS WORK)    | 0 (CRITICAL)      |
|-----------|-------:|--------------------|--------------------|-------------------|-------------------|
| typecheck |  0.22  | exit 0             | < 10 errors        | < 50 errors       | ≥ 50 errors       |
| lint      |  0.18  | exit 0             | < 5 warnings       | < 20 warnings     | ≥ 20 warnings     |
| test      |  0.28  | all pass (exit 0)  | > 95% pass         | > 80% pass        | ≤ 80% pass        |
| deadcode  |  0.13  | exit 0             | < 5 unused         | < 20 unused       | ≥ 20 unused       |
| shell     |  0.09  | exit 0             | < 5 issues         | ≥ 5 issues        | N/A (skip)        |
| coverage  |  0.10  | ≥ 80% lines        | ≥ 60% lines        | ≥ 40% lines       | < 40% lines       |

**Coverage is optional.** If the user did not configure a coverage command
in Step 1, the `coverage` dimension is dropped entirely and its 0.10 weight
is redistributed proportionally across the other five categories.

**Parsing tool output for counts:**

- **tsc** — count lines matching `error TS`.
- **biome / eslint / ruff** — count error/warning lines; prefer the
  summary line if the tool emits one (`X problems`, `N errors, M warnings`).
- **Tests** — parse pass/fail counts from the runner output. If the
  runner only reports an exit code, use: exit 0 → 10, non-zero → 4
  (assume some failures; surface the raw output so the user can see what).
- **knip** — count lines reporting unused exports, files, or dependencies.
- **shellcheck** — count distinct findings (lines starting with `In ... line N`).
- **coverage** — parse the last `Lines:` / `Statements:` / `Coverage:` line
  from the runner's output. If only a single number is emitted (e.g.
  `All files | 87.5`), use that.

**Composite score (with all six dimensions active):**

```
composite = typecheck*0.22 + lint*0.18 + test*0.28
          + deadcode*0.13 + shell*0.09 + coverage*0.10
```

**Weight redistribution.** If a category is skipped or unavailable
(missing tool, timeout, user opted out), redistribute its weight
proportionally across the remaining categories so the composite still
sits on a 0–10 scale. Worked example: if `coverage` is skipped and `shell`
runs, the other four dimensions absorb coverage's 0.10 by being scaled
up by `1 / (1 - 0.10) ≈ 1.111`. Round the composite to one decimal place.

**Status labels** for the dashboard table:

- 10 → `CLEAN`
- 7–9 → `WARNING`
- 4–6 → `NEEDS WORK`
- 0–3 → `CRITICAL`
- n/a → `SKIPPED`

---

## Step 4: Present the dashboard

Render the result as a single markdown block. Replace placeholders with the
real values from Steps 2 and 3.

```text
CODE HEALTH DASHBOARD
=====================

Project: <project name>
Branch:  <current branch>
Date:    <YYYY-MM-DD>

Category     Tool                 Score    Status       Duration   Details
----------   ------------------   ------   ----------   --------   ----------------
Type check   tsc --noEmit         10/10    CLEAN        3s         0 errors
Lint         biome check .         8/10    WARNING      2s         3 warnings
Tests        bun test             10/10    CLEAN        12s        47/47 passed
Dead code    knip                  7/10    WARNING      5s         4 unused exports
Shell lint   shellcheck           10/10    CLEAN        1s         0 issues
Coverage     bun test --coverage   9/10    WARNING      14s        78% lines

COMPOSITE SCORE: 8.9 / 10

Duration: 37s total (6 tools, 1 skipped: none)
```

If any category scored below 7, append a `DETAILS` block with the trimmed
output from that tool, so the user can act without re-running:

```text
DETAILS: Lint (3 warnings)
  biome check . output (tail):
    src/utils.ts:42  lint/complexity/noForEach    Prefer for...of
    src/api.ts:18    lint/style/useConst          Use const instead of let
    src/api.ts:55    lint/suspicious/noExplicitAny  Unexpected any
```

Cap each DETAILS block at 50 lines. If the tool emitted more, show the
last 50 and note `(output truncated, N more lines above)`.

---

## Step 5: Persist to local history

```bash
mkdir -p .health
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
```

Append one JSONL line to `.health/history.jsonl`. The file lives in the
project root, is gitignored (recommend adding `.health/` to `.gitignore`),
and is the only state this skill writes.

```json
{"ts":"2026-03-31T14:30:00Z","branch":"main","commit":"a1b2c3d","score":8.9,"typecheck":10,"lint":8,"test":10,"deadcode":7,"shell":10,"coverage":9,"duration_s":37,"skipped":[]}
```

Field reference:

| Field      | Type             | Notes                                                   |
|------------|------------------|---------------------------------------------------------|
| `ts`       | ISO 8601 string  | UTC, when the run finished                              |
| `branch`   | string           | current git branch, or `unknown` outside a repo         |
| `commit`   | string           | short SHA, or `unknown`                                 |
| `score`    | number (1 dp)    | composite, 0.0–10.0                                     |
| `typecheck`/`lint`/`test`/`deadcode`/`shell`/`coverage` | integer 0–10 or `null` | per-dimension score; `null` if skipped |
| `duration_s` | integer         | total wall time across all tools                        |
| `skipped`  | array of strings | names of categories that did not run (e.g. `["shell"]`) |

History entries from before coverage was configured simply lack the
`coverage` field — treat them as `null` for trend math.

---

## Step 6: Trend analysis + recommendations

Read the last 10 lines of `.health/history.jsonl` (if it exists and has
prior entries).

```bash
tail -10 .health/history.jsonl 2>/dev/null || echo "NO_HISTORY"
```

### 6a. First run

If there is no prior history, say:

> First health check on this project — no trend data yet. Run `/health` again
> after making changes to track progress.

Skip sections 6b and 6c; go straight to 6d.

### 6b. Show the trend

If there are 2+ prior entries, render a table of the last 5:

```text
HEALTH TREND (last 5 runs)
==========================
Date         Branch        Score   TC   Lint  Test  Dead  Shell  Cov
----------   -----------   -----   --   ----  ----  ----  -----  ---
2026-03-27   main          9.4     10   9     10    8     10     9
2026-03-28   feat/auth     8.8     10   7     10    7     10     9
2026-03-29   feat/auth     8.2     10   6      9    7     10     8
2026-03-30   feat/auth     8.6     10   7     10    7     10     8
2026-03-31   feat/auth     8.9     10   8     10    7     10     9

Trend: IMPROVING (+0.7 since first run on this branch)
```

Trend label is computed against the oldest entry in the window:

- delta > +0.3 → `IMPROVING`
- delta < -0.3 → `DEGRADING`
- otherwise    → `STABLE`

### 6c. Detect regressions

Compare the latest run to the most recent prior run. For each category
that dropped, show the delta and the new findings that caused it:

```text
REGRESSIONS DETECTED
  Lint: 9 -> 6 (-3) — 12 new biome warnings introduced
    Most common: lint/complexity/noForEach (7 instances)
  Tests: 10 -> 9 (-1) — 2 test failures
    FAIL src/auth.test.ts > should validate token expiry
    FAIL src/auth.test.ts > should reject malformed JWT
```

Cap each regression block at 10 lines; truncate the rest with a count.

### 6d. Recommendations (always show)

Rank suggestions by impact: `weight * (10 - current_score)`, descending.
Only include categories scoring below 10.

```text
RECOMMENDATIONS (by impact)
===========================
1. [HIGH]  Fix 2 failing tests (Tests: 9/10, weight 28%)
   Run: bun test --verbose to see failures
2. [MED]   Address 12 lint warnings (Lint: 6/10, weight 18%)
   Run: biome check . --write to auto-fix
3. [LOW]   Remove 4 unused exports (Dead code: 7/10, weight 13%)
   Run: knip --fix to auto-remove
```

If everything is `CLEAN`, say so explicitly: "All categories clean —
nothing to fix. Re-run on the next change to keep the trend honest."

---

## Output checklist

Before returning, confirm you produced all of:

- [ ] Dashboard table (Step 4)
- [ ] DETAILS block for every category below 7
- [ ] One JSONL line appended to `.health/history.jsonl`
- [ ] Trend table if history has 2+ entries
- [ ] Regression block if any category dropped vs the prior run
- [ ] Recommendations ranked by impact

If any of the above is missing, finish it before reporting completion.

---

## Important rules

1. **Wrap, don't replace.** Run the project's own tools. Never substitute
   your own analysis for what the tool reports.
2. **Read-only.** Never fix issues. Present the dashboard and let the
   user decide.
3. **Respect `## Health Stack`.** If configured, use those exact commands.
   Do not second-guess the user's choice of tool.
4. **Skipped is not failed.** If a tool isn't available, skip it
   gracefully and redistribute weight. Do not penalize the score.
5. **Show raw output for failures.** When a tool reports errors, include
   the actual output (last 50 lines) so the user can act without
   re-running.
6. **Trends require history.** On the first run, say so. Do not invent
   numbers.
7. **Be honest about scores.** A codebase with 100 type errors and all
   tests passing is not healthy. The composite must reflect reality.
8. **No network, no side effects beyond `.health/`.** Do not push,
   publish, post, or call any external service. The only file this
   skill writes is `.health/history.jsonl` in the project root.
9. **Local history only.** If the user wants trend data shared across
   machines, they can commit `.health/` themselves; the skill does not
   do it for them.
