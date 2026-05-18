# Codex Project Manager Operations

This reference defines the durable operating policy for the `codex-project-manager` skill.

## State Directory

Default:

```text
~/.codex-project-manager/
  index.json
  report.md
  backups/
  context-bundles/
  trash/
  sync/
    staging/
    manifests/
```

Use `--state-dir <path>` to override. Keep this directory out of application source control unless the user explicitly asks to store a generated artifact in a repo.

## Inventory

Run:

```powershell
py scripts/manage_codex_sessions.py scan
py scripts/manage_codex_sessions.py list-projects
```

Inventory should:

- Detect `$CODEX_HOME`, then fall back to `~/.codex`.
- Scan session files recursively.
- Group conversations by `cwd` or the best available project path.
- Preserve raw source paths and file hashes.
- Mark conversations with missing/unknown project paths as `unassigned`.

## Context Bundle

Run:

```powershell
py scripts/manage_codex_sessions.py bundle --project "C:\path\to\project" --limit 8
py scripts/manage_codex_sessions.py bundle --thread <id-a> --thread <id-b>
```

Use bundles when the user wants to reference multiple local Codex conversations as context. After creating the bundle, tell Codex in the current conversation:

```text
Use <bundle path> as the project context boundary for this task. Do not assume unrelated local Codex conversations are in scope.
```

## Backup

Run:

```powershell
py scripts/manage_codex_sessions.py backup --project "C:\path\to\project"
py scripts/manage_codex_sessions.py backup --thread <id-a> --thread <id-b>
```

Every backup writes:

- copied session files,
- `manifest.json`,
- sha256 hashes,
- original source paths,
- created timestamp,
- operation scope.

## Archive

Archive means reversible removal from active Codex session discovery. It moves selected session files into manager storage and writes an archive manifest.

Start with:

```powershell
py scripts/manage_codex_sessions.py archive --thread <id> --dry-run
```

Then, after user approval:

```powershell
py scripts/manage_codex_sessions.py archive --thread <id> --execute --confirm "ARCHIVE 1 THREADS"
```

Rules:

- Archive must not permanently delete files.
- Archive writes a manifest with original paths and archived paths.
- Restore from the archive manifest before assuming the Codex client will see the conversation again.

## Delete

Always start with:

```powershell
py scripts/manage_codex_sessions.py delete --thread <id> --dry-run
```

Then, after user approval:

```powershell
py scripts/manage_codex_sessions.py delete --thread <id> --execute --confirm "DELETE 1 THREADS"
```

Rules:

- Default delete mode moves files to manager trash.
- Permanent deletion requires `--permanent`, `--execute`, and the exact confirmation phrase.
- A backup is created during execute unless `--skip-backup` is supplied after explicit user approval.
- Never infer approval from earlier chat if the selected thread count changed.

## Restore

Run:

```powershell
py scripts/manage_codex_sessions.py restore --manifest "C:\path\to\manifest.json" --dry-run
py scripts/manage_codex_sessions.py restore --manifest "C:\path\to\manifest.json" --execute
```

Restore is conservative:

1. Open the backup manifest.
2. Verify source paths still point inside Codex home or the expected session directory.
3. Copy files back to original paths.
4. Rerun `scan`.

If a file already exists, write a conflict copy rather than overwriting.

## Cloud Sync

Run:

```powershell
py scripts/manage_codex_sessions.py sync-stage --include-backups
```

This creates a local zip package plus manifest. Upload policy:

- Prefer configured tools such as `rclone`, `aliyunpan`, or WebDAV only when the user asks to upload.
- Do not store cloud tokens in this skill.
- Do not sync Codex login credentials or raw project source.
- Sync staged manager artifacts: index, report, context bundles, selected backups, and manifests.
- Treat cloud sync as redundancy, not as permission to delete local files.

## QA Checklist

Before reporting success:

- Confirm `index.json` exists after scan.
- Confirm selected thread ids resolve to concrete files before backup/delete.
- Confirm backup manifests include sha256 hashes.
- Confirm context bundles include source paths and project boundary text.
- Confirm destructive operations report whether they were dry-run or execute.
