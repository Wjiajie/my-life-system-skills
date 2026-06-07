---
name: release-workflow
description: End-to-end release workflow that turns a feature branch into a verified production deploy. Detects platform and base branch, runs tests, reviews the diff, bumps VERSION, updates CHANGELOG, commits, pushes, creates a PR, waits for CI, merges, deploys, and runs canary verification. Use when the user says "ship it", "release", "publish", "deploy this", "merge to main", "push to main", "create a PR", "land and deploy", "get it to production", or asks to ship a feature branch end-to-end.
---

# Release Workflow

Drive a feature branch from "code is ready" to "verified in production" in a single non-interactive pass, with a small number of hard decision gates where user judgment is required.

This is a **state machine** with seven stages. The skill walks through them in order; a stage only advances when its own gate is satisfied. Re-running the skill is **idempotent** — verification steps always rerun, but actions (bump, push, merge) skip themselves if they have already been done on this branch.

If the user only wants a subset (for example, "just merge the PR"), you can start at the relevant stage — see `## 阶段起点速查` below.

## 阶段起点速查

| User intent | Start at |
|---|---|
| "ship it" / "release" / "deploy this" | 阶段 1 |
| "create a PR" / "push to main" | 阶段 5 |
| "merge the PR" / "land it" | 阶段 6 |
| "deploy and verify" / "canary check" | 阶段 6 → 7 |
| "just bump the version" | 阶段 4 |
| "rerun the deploy report" | 阶段 7 |

---

## 阶段 0 — Detect platform, base branch, deploy target

Before anything else, classify the environment. These detections are referenced by every later stage.

```bash
# Current branch
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

# Git remote / platform
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
case "$REMOTE_URL" in
  *github.com*)      PLATFORM="github" ;;
  *gitlab*)          PLATFORM="gitlab" ;;
  *)
    if command -v gh   >/dev/null 2>&1 && gh   auth status >/dev/null 2>&1; then PLATFORM="github"
    elif command -v glab >/dev/null 2>&1 && glab auth status >/dev/null 2>&1; then PLATFORM="gitlab"
    else PLATFORM="unknown"; fi ;;
esac

# Base branch (target of the PR/MR, or repo default)
if [ "$PLATFORM" = "github" ]; then
  BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null \
         || gh repo view --json defaultBranchRef -q .defaultBranchRef.name 2>/dev/null)
elif [ "$PLATFORM" = "gitlab" ]; then
  BASE=$(glab mr view -F json 2>/dev/null | jq -r .target_branch // empty \
         || glab repo view -F json 2>/dev/null | jq -r .default_branch // empty)
fi
[ -z "$BASE" ] && BASE=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's|refs/remotes/origin/||')
[ -z "$BASE" ] && BASE="main"

# Deploy target (user-configurable; falls back to env or detected platform)
PROD_URL=${RELEASE_PROD_URL:-$(grep -E '^\s*-\s*production_url' .release-config.yml 2>/dev/null | head -1 | sed 's/.*production_url: *//')}
STAGING_URL=${RELEASE_STAGING_URL:-$(grep -E '^\s*-\s*staging_url' .release-config.yml 2>/dev/null | head -1 | sed 's/.*staging_url: *//')}

# Deploy workflow (GitHub Actions, GitLab CI, etc.)
DEPLOY_WORKFLOW=""
if [ -d .github/workflows ]; then
  DEPLOY_WORKFLOW=$(grep -liE 'deploy|release|production|cd' .github/workflows/*.yml .github/workflows/*.yaml 2>/dev/null | head -1)
fi
[ -z "$DEPLOY_WORKFLOW" ] && [ -f .gitlab-ci.yml ] && grep -qE 'deploy|release|production' .gitlab-ci.yml && DEPLOY_WORKFLOW=".gitlab-ci.yml"

echo "BRANCH=$BRANCH  BASE=$BASE  PLATFORM=$PLATFORM"
echo "PROD_URL=${PROD_URL:-<not set>}"
echo "STAGING_URL=${STAGING_URL:-<not set>}"
echo "DEPLOY_WORKFLOW=${DEPLOY_WORKFLOW:-<none>}"
```

If `.release-config.yml` does not exist, create a minimal one on first run:

```yaml
# .release-config.yml — release workflow user configuration
production_url: https://example.com
staging_url:    https://staging.example.com   # leave empty to skip staging
deploy_command: gh run watch                   # optional: override how deploys are observed
```

A **first-run gate** is the only one that pauses here: if both `PROD_URL` and `DEPLOY_WORKFLOW` are empty, ask once which deploy story applies (web app with URL / library with no deploy / user wants to configure `.release-config.yml` later). This avoids blindly running canary against a missing endpoint.

---

## 阶段 1 — Pre-flight (branch, tree, conflicts)

Refuse to ship from the base branch; capture the current state for later stages; make sure tests will run against the latest base.

1. **Abort if on the base branch**:
   `if [ "$BRANCH" = "$BASE" ]; then abort "You're on $BASE. Ship from a feature branch."; fi`

2. **Capture tree state**:
   ```bash
   git status --porcelain
   git diff $BASE...HEAD --stat
   git log  $BASE..HEAD --oneline
   ```
   Uncommitted changes are always included in the ship — do not ask.

3. **Merge the base branch in** so the rest of the workflow runs against the merged state:
   ```bash
   git fetch origin $BASE
   git merge origin/$BASE --no-edit
   ```
   On conflict: try to auto-resolve trivial cases (VERSION, CHANGELOG ordering, lockfiles). Otherwise stop and show the conflicts.

4. **Detect test framework and build command** (used in 阶段 2):
   ```bash
   [ -f Gemfile ]               && RUNTIME=ruby
   [ -f package.json ]          && RUNTIME=node
   [ -f requirements.txt ] || [ -f pyproject.toml ] && RUNTIME=python
   [ -f go.mod ]                && RUNTIME=go
   [ -f Cargo.toml ]            && RUNTIME=rust

   ls jest.config.* vitest.config.* playwright.config.* .rspec pytest.ini phpunit.xml 2>/dev/null
   ls -d test/ tests/ spec/ __tests__/ 2>/dev/null
   ```
   If no test framework is present, ask once: "No test framework detected — bootstrap one now (vitest/jest/pytest/etc.), or skip testing for this release?" Skip is always an option but should be a conscious choice.

---

## 阶段 2 — Test + coverage

Run the project's test command(s) and a quick coverage check. Failures are triaged; missing tests inside the diff are flagged.

1. **Run tests** using whatever the project uses:
   ```bash
   # pick one based on detected framework; many projects have a single "test" script
   (npm test 2>&1 || pytest 2>&1 || go test ./... 2>&1 || bundle exec rspec 2>&1) | tee /tmp/release-tests.log
   ```

2. **Triage failures**:
   - **In-branch failures** (a file in `git diff $BASE...HEAD` is implicated): STOP. The developer must fix their own broken tests.
   - **Pre-existing failures**: warn, add a P0 TODO, and continue.

3. **Coverage audit** (lightweight, no subagent dispatch):
   - Count test files before/after: `find . -name '*_test.*' -o -name '*.test.*' -o -name '*.spec.*' | grep -v node_modules | wc -l`
   - For each changed source file, check whether existing tests cover the new branches. Flag any file in the diff that has no test reference.
   - Use defaults: **Minimum 60% coverage of changed code, Target 80%**. If below minimum, ask: "Generate more tests now (recommended) / ship anyway with risk accepted / mark paths as intentionally uncovered."

4. **Re-run any test that depends on a side effect of the diff** (e.g. snapshot, golden file) after a manual fix during this stage. The `Verification Gate` (阶段 5.5) re-runs tests after every code-changing step.

---

## 阶段 3 — Review the diff

A pre-landing review that catches what tests miss. Calibrate findings by confidence (1-10); act on confidence ≥ 7 only.

1. **Scope check** — confirm the diff matches the stated intent (PR body, TODOS.md, branch name). Anything unrelated is "scope drift"; flag but do not block.

2. **Review checklist** — apply these to the diff:
   - **Critical:** SQL/data safety, authn/authz, secret leakage, destructive operations without backup
   - **Important:** race conditions, error handling that swallows failures, N+1 queries, missing input validation
   - **Nice-to-have:** naming, dead code, stale comments

3. **Classify each finding**:
   - `AUTO-FIX` (whitespace, unused imports, dead code, missing obvious null check): fix and commit
   - `ASK` (SQL change, schema change, security-sensitive): ask the user with a single decision block

4. **Confidence gate**: only report findings at confidence ≥ 7 in the main output; lower confidence goes in an appendix.

5. If code changes were applied during the review: commit them and re-run 阶段 2's tests before continuing.

---

## 阶段 4 — VERSION, CHANGELOG, TODOS

Three doc artifacts, one pass.

### 4a. Bump VERSION (4-digit `MAJOR.MINOR.PATCH.MICRO`)

```bash
BASE_VERSION=$(git show origin/$BASE:VERSION 2>/dev/null | tr -d '[:space:]' || echo "0.0.0.0")
CUR_VERSION=$(cat VERSION 2>/dev/null | tr -d '[:space:]' || echo "$BASE_VERSION")
```

**Idempotency** — four states:
- `FRESH`: `CUR == BASE` → bump below
- `ALREADY_BUMPED`: `CUR != BASE` and in sync with `package.json` → reuse `CUR`
- `DRIFT_STALE_PKG`: `CUR != BASE` but `package.json` differs → sync `package.json` to `CUR`, do not re-bump
- `DRIFT_UNEXPECTED`: `CUR == BASE` but `package.json` differs → STOP, manual reconciliation required

**Auto-decide bump level** from the diff:
- `MICRO` (4th digit): < 50 lines, trivial tweaks, typos, config
- `PATCH` (3rd digit): 50+ lines, no feature signal
- `MINOR` (2nd digit): **ASK** if new routes/pages/migrations detected, or 500+ lines, or new modules
- `MAJOR` (1st digit): **ASK** — milestones and breaking changes only

Compute the new version locally (no need for a queue-aware daemon — this skill is single-developer):
```bash
IFS=. read -r MA MI PA MU <<<"$BASE_VERSION"
case "$LEVEL" in
  major) MA=$((MA+1)); MI=0; PA=0; MU=0 ;;
  minor) MI=$((MI+1)); PA=0; MU=0 ;;
  patch) PA=$((PA+1)); MU=0 ;;
  micro) MU=$((MU+1)) ;;
esac
NEW_VERSION="$MA.$MI.$PA.$MU"
echo "$NEW_VERSION" > VERSION
[ -f package.json ] && node -e "const f=require('fs'),p=require('./package.json');p.version='$NEW_VERSION';f.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
```

### 4b. CHANGELOG (auto-generate from diff)

Insert a new `## [$NEW_VERSION] - YYYY-MM-DD` section under the file header. Group changes by `### Added`, `### Changed`, `### Fixed`, `### Removed`. Voice: lead with what the user can now do, not implementation details.

```bash
git log $BASE..HEAD --oneline
git diff $BASE...HEAD
```

Every commit must map to at least one bullet. If existing branch CHANGELOG entries cover some commits, collapse them into the unified version block.

### 4c. TODOS.md (auto-update)

If `TODOS.md` exists, mark items completed when the diff clearly demonstrates the work. Be conservative — only flip an item when the evidence is unambiguous. Move completed items to a `## Completed` section with `**Completed:** v$NEW_VERSION (YYYY-MM-DD)`.

If `TODOS.md` does not exist: ask once. "Create a TODOS.md skeleton now (recommended for tracking follow-ups) / skip and continue."

### 4d. Commit the docs

```bash
git add VERSION package.json CHANGELOG.md TODOS.md 2>/dev/null
git commit -m "chore: bump version and changelog (v$NEW_VERSION)"
```

---

## 阶段 5 — Commit, push, PR/MR

### 5.1 — Bisectable commits

If the diff is one logical change: one commit. Otherwise, group into independent commits that each leave the tree valid:

- Infrastructure (migrations, config, routes)
- Models and services (with their tests)
- Controllers and views (with their tests)
- Final commit: VERSION + CHANGELOG + TODOS

The final commit carries the version tag; do not tag intermediate commits.

### 5.2 — Verification gate

If any code changed after 阶段 2 ran, re-run the test command and capture fresh output. **Stale evidence is not evidence.** If the test command exits non-zero, STOP — fix and return to 阶段 2.

### 5.3 — Push

```bash
git push -u origin $BRANCH
```

Idempotent: if the local HEAD already equals `origin/$BRANCH`, skip the push but continue.

### 5.4 — Create or update PR/MR

Idempotency: if an open PR/MR already exists for this branch, **update** its body and title instead of creating a duplicate.

PR title format (enforced):
```
v$NEW_VERSION <type>: <summary>
```

PR body (concise, no padding):

```markdown
## Summary
<grouped bullets: which commits land in this release, what the user gains>

## Test plan
- [ ] <the test command and result>
- [ ] <any manual checks worth recording>

## Verification
- Tests: <before> → <after> (+<delta> new)
- Review: <N findings, M auto-fixed, K asked>
- VERSION: $BASE_VERSION → $NEW_VERSION ($LEVEL bump)
```

GitHub:
```bash
gh pr create --base $BASE --title "v$NEW_VERSION <type>: <summary>" --body "..."
# or, if PR already exists:
gh pr edit --title "v$NEW_VERSION <type>: <summary>" --body "..."
```

GitLab:
```bash
glab mr create -b $BASE -t "v$NEW_VERSION <type>: <summary>" -d "..."
# or:
glab mr update --title "v$NEW_VERSION <type>: <summary>" --description "..."
```

Capture the PR/MR URL — it goes into the deploy report at 阶段 7.

---

## 阶段 6 — Merge and deploy

Two irreversible steps. A `readiness gate` sits between them.

### 6.1 — Wait for CI

```bash
gh pr checks --watch --fail-fast    # GitHub
glab ci status --live               # GitLab
```

15-minute timeout. On failure: STOP, do not merge. On pending past 15 minutes: warn the user and ask whether to keep waiting.

### 6.2 — Readiness gate (the last decision before merge)

Walk through five checks, all visible to the user:

| Check | Source | Blocker? |
|---|---|---|
| CI green | `gh pr checks` / `glab ci status` | yes |
| No merge conflicts | `gh pr view --json mergeable` | yes |
| Review not stale | diff vs last review commit | no (warn) |
| `VERSION` / `CHANGELOG` updated | `git diff $BASE -- VERSION CHANGELOG.md` | no (warn) |
| PR body matches actual diff | compare summary vs `git log $BASE..HEAD` | no (warn) |

Show the user a single decision block:

- **A) Merge it — all green (recommended)**
- **B) Hold off — fix the warnings first**
- **C) Merge anyway — I understand the warnings**

Only A and C advance to merge. B stops with concrete next steps (e.g. "re-run review", "update CHANGELOG", "sync PR body").

### 6.3 — Merge

Try auto-merge first (respects repo merge settings and merge queues):
```bash
gh pr merge --auto --delete-branch     # GitHub
glab mr merge --auto-merge --remove-source-branch  # GitLab
```

If auto-merge is not enabled, fall back to squash:
```bash
gh pr merge --squash --delete-branch
glab mr merge --squash --remove-source-branch
```

Permission errors: STOP and tell the user to merge manually or check branch protection.

**Merge-queue handling**: if auto-merge is used and the PR does not become `MERGED` immediately, poll every 30 seconds up to 30 minutes. If the PR leaves the queue (state goes back to `OPEN`), stop — the merge queue rejected it.

### 6.4 — Wait for deploy

Strategy depends on what was detected in 阶段 0:

| Strategy | How to observe | When to use |
|---|---|---|
| A. GH Actions workflow | `gh run watch <run-id>` matched to merge SHA | `DEPLOY_WORKFLOW` set |
| B. GL CI pipeline | `glab ci status --live` matched to merge SHA | `DEPLOY_WORKFLOW` is `.gitlab-ci.yml` |
| C. Auto-deploy platform (Vercel/Netlify) | wait 60s, then `curl -sf $PROD_URL` | no workflow, but `PROD_URL` set |
| D. Custom command | `$RELEASE_DEPLOY_COMMAND` (from `.release-config.yml`) | user override |

20-minute timeout. On deploy failure: ask once — investigate / revert immediately / continue to health check (the failure might be flaky).

### 6.5 — Staging first (optional)

If `STAGING_URL` is set in `.release-config.yml`, ask once before going to production: "Deploy to staging first (recommended, safest) / skip staging / staging only (no production deploy)." The staging pass uses the same wait + canary logic as production, just pointed at the staging URL.

---

## 阶段 7 — Canary verification + report

One pass of post-deploy health checks, then a written summary. This is single-pass, not continuous monitoring — for extended watching, run a dedicated canary loop after the skill exits.

### 7.1 — Choose canary depth by scope

| Diff scope | Canary depth |
|---|---|
| Docs only (already excluded in 阶段 0/6) | skipped |
| Config only | smoke: `curl -sf $PROD_URL -o /dev/null -w "%{http_code}"` → expect 200 |
| Backend only | smoke + console error check via `curl $PROD_URL` |
| Frontend (any) | smoke + console + perf + screenshot |
| Mixed | full canary |

### 7.2 — Run the checks

```bash
# Smoke
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $PROD_URL 2>/dev/null)
[ "$STATUS" = "200" ] || REPORT_HEALTH="DEGRADED: $STATUS"

# Content
curl -s $PROD_URL | head -50  # look for known content, not blank page

# Console (if accessible via headless browser, optional)
# $RELEASE_CANARY_BROWSER "$PROD_URL" --check-console --check-perf --screenshot

# Perf
LOAD_MS=$(curl -s -o /dev/null -w "%{time_total}" $PROD_URL | awk '{print int($1*1000)}')
[ "$LOAD_MS" -gt 10000 ] && REPORT_HEALTH="DEGRADED: slow load ${LOAD_MS}ms"
```

### 7.3 — Health verdict

- `HEALTHY`: 200, content present, load < 10s
- `DEGRADED`: any of the above fails
- `SKIPPED`: docs-only or no `PROD_URL`

On `DEGRADED`, ask once: "Issues on the live site (see evidence). A) Mark as healthy (warming up) / B) Revert the merge / C) Investigate further before deciding."

### 7.4 — Revert (if user chose B)

```bash
git fetch origin $BASE
git checkout $BASE
git revert <merge-commit-sha> --no-edit
git push origin $BASE
```

On conflict: tell the user to resolve manually (the merge SHA is captured). On branch protection: open a revert PR instead and merge it.

### 7.5 — Final report

Write to `.release-reports/<date>-pr<N>-release.md` and print the summary to the user:

```text
RELEASE REPORT
══════════════
PR:           #<N> — <title>
Branch:       <head> → <base>
Merged:       <timestamp> (<merge method>)
Merge SHA:    <sha>

Timing:
  Tests:      <duration>
  Review:     <duration>
  CI wait:    <duration>
  Merge:      <duration>
  Deploy:     <duration>
  Canary:     <duration>
  Total:      <end-to-end>

VERSION:      $BASE → $NEW_VERSION ($LEVEL)
CHANGELOG:    updated
TODOS:        <N completed, M remaining>

CI:           <PASSED / SKIPPED>
Deploy:       <PASSED / FAILED / NO WORKFLOW>
Staging:      <VERIFIED / SKIPPED / N/A>
Canary:       <HEALTHY / DEGRADED / SKIPPED / REVERTED>

VERDICT: <DEPLOYED AND VERIFIED / DEPLOYED (UNVERIFIED) / STAGING VERIFIED / REVERTED>
```

End with follow-up suggestions:

- If healthy: "Want extended monitoring? Run `$canary <url>` for the next 10 minutes."
- If degraded/reverted: "Investigate logs, then re-run `$release-workflow` once fixed."

---

## Decision blocks (AskUserQuestion)

These are the only places where user judgment is required. Other steps run straight through.

| When | What to ask | Why |
|---|---|---|
| 阶段 0, first run, no `PROD_URL` and no deploy workflow | "How does this project deploy? (web app with URL / library no deploy / configure `.release-config.yml`)" | avoid canary against nothing |
| 阶段 1, no test framework | "Bootstrap a test framework now, or skip testing for this release?" | test gap is a deliberate choice |
| 阶段 2, in-branch test failure | "Fix now / revert and try again / skip with a P0 TODO" | broken tests block the ship |
| 阶段 2, coverage below minimum | "Generate more tests / ship anyway with risk / mark paths intentionally uncovered" | explicit risk acknowledgement |
| 阶段 3, ASK-classified findings | "Fix the finding / acknowledge and ship anyway / mark as false positive" | each one is a real judgment call |
| 阶段 4, MINOR or MAJOR bump | "Confirm the bump level (MINOR/MAJOR) / downgrade to PATCH/MICRO" | semver is user-owned |
| 阶段 4, no `TODOS.md` | "Create one / skip" | doc artifact, optional |
| 阶段 6, readiness gate | "Merge / hold off / merge anyway" | merge is irreversible |
| 阶段 6, deploy failure | "Investigate logs / revert / continue to canary" | recovery choice |
| 阶段 6, staging detected | "Deploy to staging first / skip staging / staging only" | safety choice |
| 阶段 7, canary DEGRADED | "Mark healthy / revert / investigate more" | post-deploy recovery |

---

## Important rules

- **Never force-push.** Use `git push` and `gh pr merge` only.
- **Never skip CI.** If checks are failing, stop and explain why.
- **Never claim completion without fresh evidence.** Re-run tests after any code-changing step.
- **Never auto-bump MAJOR/MINOR without asking.** Semver belongs to the user.
- **Never auto-revert without asking.** The merge is irreversible; the revert should be too.
- **Be idempotent.** Re-running the skill is safe; verification always reruns, actions skip themselves when already done.
- **Narrate, don't perform silently.** Tell the user what just happened, what's happening now, what's next. No silent gaps between stages.

---

## Dependencies

Sibling skills this skill may want to defer to (none required to run release-workflow standalone):

- `plan-eng-review` — for the architecture review that should already be on the branch before 阶段 3
- `qa` — for an extended post-merge verification pass if canary is inconclusive
- `code-review` — for the deeper code review that produces the review record referenced in 阶段 6.2
- `goal-loop` — for orchestrating "release + iterate" cycles where the next release depends on findings from this one

If any of those skills ran recently (within 7 days) on the same branch, pull their output into the relevant stage instead of redoing the work.
