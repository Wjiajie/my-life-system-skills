---
name: codex-project-manager
description: Manage local Codex client projects and conversations as a Codex skill instead of a separate app. Use when the user wants to scan or organize local Codex sessions, list projects by conversation history, create project-bounded context bundles from multiple conversations, archive/delete/restore sessions safely, prepare backups, stage cloud-sync packages for Aliyun Drive/rclone/WebDAV/local folder, or inspect Codex project/session state. Trigger on requests to manage Codex projects, delete/archive Codex conversations, sync Codex sessions to cloud storage, reference multiple conversations as context, or constrain work to one project context.
---

# Codex Project Manager

Use this skill to manage Codex client local project/session files while keeping normal conversation inside the Codex client. Do not build a separate chat UI, call model APIs directly, or route user prompts through `codex` CLI unless the user explicitly asks for CLI testing.

## Core Boundary

- Treat Codex client session files as external data. Read freely; write only through explicit management operations.
- Keep generated indexes, backups, context bundles, trash, and sync staging under a manager state directory, defaulting to `~/.codex-project-manager`.
- For destructive work, always run dry-run first, create a backup, then require explicit confirmation.
- For project-bounded work, create a context bundle from selected project sessions and tell the current Codex conversation to use that bundle as the boundary.
- For cloud sync, stage a local package first. Upload only when the user explicitly requests it and a configured uploader is available.

## Quick Start

Use the bundled helper script:

```powershell
cd <this-skill-directory>
py scripts/manage_codex_sessions.py scan
py scripts/manage_codex_sessions.py list-projects
py scripts/manage_codex_sessions.py bundle --project "C:\path\to\project" --limit 5
py scripts/manage_codex_sessions.py backup --project "C:\path\to\project"
py scripts/manage_codex_sessions.py archive --thread <thread-id> --dry-run
py scripts/manage_codex_sessions.py delete --thread <thread-id> --dry-run
py scripts/manage_codex_sessions.py sync-stage --include-backups
```

If `py` is unavailable, use the active Python runtime. On this Windows machine, prefer setting `PYTHONIOENCODING=utf-8` before running Python scripts when output may contain non-ASCII paths.

## Workflow Decision Tree

1. **Need inventory?** Run `scan`, then `list-projects`.
2. **Need project context?** Run `bundle --project <path>` or `bundle --thread <id>...`, then reference the generated Markdown bundle in the current Codex conversation.
3. **Need archive?** Run `archive --dry-run`, review the impact, then run `archive --execute --confirm "ARCHIVE N THREADS"` only after user approval.
4. **Need cleanup?** Run `delete --dry-run`, review the impact, run `backup`, then run `delete --execute --confirm "DELETE N THREADS"` only after user approval.
5. **Need cloud sync?** Run `sync-stage` to create a zip package and manifest. Use `references/operations.md` for uploader policy.
6. **Need restore?** Run `restore --manifest <manifest.json> --dry-run`, then execute after checking conflicts.

## Project Context Bundles

Use context bundles instead of trying to force Codex internals to load hidden state.

Bundle rules:

- Include only conversations from the selected project unless the user names extra threads.
- Keep the bundle compact: metadata, selected messages, key prompts/responses, source file paths.
- Save bundles under `~/.codex-project-manager/context-bundles/` unless the user asks for a project-local path.
- In the final response, give the bundle path and the intended use, for example: "Use this file as the current project context boundary."

## Safe Session Operations

Use `references/operations.md` for exact deletion, backup, restore, and cloud-sync policy.

Minimum safety contract:

- Never permanently delete without a backup created in the same workflow or an explicit user decision to skip backup.
- Treat archive as reversible removal from Codex active sessions, not as deletion.
- Never delete by broad path glob alone; resolve selected thread ids to exact source files from the current index.
- Prefer moving to manager trash over permanent deletion.
- Preserve a manifest for every backup, delete, and sync-stage operation.
- Report the exact count of affected threads and files.

## Output Shape

For inventory or context work, end with:

```text
done:
pending:
risks:
next action:
artifacts:
```

For destructive operations, end with:

```text
dry-run/execute:
threads:
files:
backup:
trash/permanent:
restore path:
risks:
next action:
```
