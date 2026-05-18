#!/usr/bin/env python3
"""Manage local Codex project sessions for the codex-project-manager skill.

The script is intentionally local-first and conservative:
- scan reads Codex session files and writes an index/report;
- bundle creates compact Markdown context bundles;
- backup copies exact selected session files with a manifest;
- delete defaults to dry-run and requires explicit confirmation to execute;
- sync-stage creates a local zip package for later upload.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path
from typing import Any


SESSION_EXTENSIONS = {".jsonl", ".json"}
DEFAULT_STATE_DIR = Path.home() / ".codex-project-manager"
MAX_MESSAGE_CHARS = 2400


def utc_now() -> str:
    return dt.datetime.now(dt.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def safe_slug(value: str, fallback: str = "item") -> str:
    value = value.strip().lower().replace("\\", "-").replace("/", "-").replace(":", "")
    value = re.sub(r"\s+", "-", value)
    value = re.sub(r"[^a-z0-9._-]+", "-", value)
    value = re.sub(r"-+", "-", value).strip(".-_")
    return value[:80] or fallback


def resolve_codex_home(explicit: str | None = None) -> Path:
    if explicit:
        return Path(explicit).expanduser().resolve()
    env_home = os.environ.get("CODEX_HOME")
    if env_home:
        return Path(env_home).expanduser().resolve()
    return (Path.home() / ".codex").resolve()


def resolve_state_dir(explicit: str | None = None) -> Path:
    return Path(explicit).expanduser().resolve() if explicit else DEFAULT_STATE_DIR.resolve()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def read_json_events(path: Path) -> list[Any]:
    events: list[Any] = []
    try:
        if path.suffix.lower() == ".jsonl":
            with path.open("r", encoding="utf-8-sig", errors="replace") as handle:
                for line in handle:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        events.append(json.loads(line))
                    except json.JSONDecodeError:
                        events.append({"_parse_error": line[:500]})
        else:
            with path.open("r", encoding="utf-8-sig", errors="replace") as handle:
                data = json.load(handle)
            if isinstance(data, list):
                events.extend(data)
            else:
                events.append(data)
    except Exception as exc:  # keep scan useful even with one bad file
        events.append({"_read_error": str(exc)})
    return events


def walk_dicts(value: Any):
    if isinstance(value, dict):
        yield value
        for child in value.values():
            yield from walk_dicts(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk_dicts(child)


def content_to_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, (int, float, bool)):
        return str(value)
    if isinstance(value, list):
        return "\n".join(part for part in (content_to_text(item) for item in value) if part)
    if isinstance(value, dict):
        for key in ("text", "content", "output", "value", "message"):
            if key in value:
                text = content_to_text(value[key])
                if text:
                    return text
    return ""


def find_first(events: list[Any], keys: tuple[str, ...]) -> str | None:
    for event in events:
        for obj in walk_dicts(event):
            for key in keys:
                value = obj.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
    return None


def extract_messages(events: list[Any], limit: int | None = None) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for event in events:
        for obj in walk_dicts(event):
            role = obj.get("role")
            if role not in {"user", "assistant", "system"}:
                continue
            text = content_to_text(obj.get("content") or obj.get("message") or obj.get("text"))
            text = normalize_text(text)
            if not text:
                continue
            key = (role, text[:200])
            if key in seen:
                continue
            seen.add(key)
            messages.append({"role": role, "text": text})
            if limit is not None and len(messages) >= limit:
                return messages
    return messages


def normalize_text(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\r", "\n")
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def infer_title(events: list[Any], path: Path) -> str:
    explicit = find_first(events, ("title", "name", "summary"))
    if explicit:
        return explicit[:160]
    for message in extract_messages(events, limit=8):
        if message["role"] == "user":
            return message["text"].replace("\n", " ")[:160]
    return path.stem


def infer_thread_id(events: list[Any], path: Path) -> str:
    found = find_first(events, ("thread_id", "threadId", "conversation_id", "conversationId", "session_id", "sessionId"))
    return found or path.stem


def infer_cwd(events: list[Any]) -> str | None:
    value = find_first(events, ("cwd", "working_dir", "workingDir", "workingDirectory", "project_path", "projectPath"))
    if value:
        return str(Path(value).expanduser())
    return None


def scan_sessions(codex_home: Path) -> list[dict[str, Any]]:
    session_root = codex_home / "sessions"
    roots = [session_root] if session_root.exists() else [codex_home]
    records: list[dict[str, Any]] = []
    for root in roots:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in SESSION_EXTENSIONS:
                continue
            events = read_json_events(path)
            stat = path.stat()
            cwd = infer_cwd(events)
            messages = extract_messages(events)
            record = {
                "id": infer_thread_id(events, path),
                "source_path": str(path.resolve()),
                "codex_home": str(codex_home),
                "project_path": cwd,
                "project_key": safe_slug(str(Path(cwd).resolve()) if cwd else "unassigned", "unassigned"),
                "title": infer_title(events, path),
                "message_count": len(messages),
                "byte_size": stat.st_size,
                "modified_at": dt.datetime.fromtimestamp(stat.st_mtime, dt.UTC).isoformat().replace("+00:00", "Z"),
                "sha256": sha256_file(path),
                "parse_warnings": [obj for event in events for obj in walk_dicts(event) if "_parse_error" in obj or "_read_error" in obj],
            }
            records.append(record)
    records.sort(key=lambda item: item["modified_at"], reverse=True)
    return records


def group_projects(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups: dict[str, dict[str, Any]] = {}
    for record in records:
        key = record["project_key"]
        group = groups.setdefault(
            key,
            {
                "project_key": key,
                "project_path": record.get("project_path"),
                "thread_count": 0,
                "byte_size": 0,
                "latest_modified_at": record["modified_at"],
                "thread_ids": [],
            },
        )
        group["thread_count"] += 1
        group["byte_size"] += int(record["byte_size"])
        group["thread_ids"].append(record["id"])
        if record["modified_at"] > group["latest_modified_at"]:
            group["latest_modified_at"] = record["modified_at"]
    return sorted(groups.values(), key=lambda item: item["latest_modified_at"], reverse=True)


def write_index(state_dir: Path, codex_home: Path, records: list[dict[str, Any]]) -> Path:
    state_dir.mkdir(parents=True, exist_ok=True)
    index = {
        "schema_version": 1,
        "created_at": utc_now(),
        "codex_home": str(codex_home),
        "thread_count": len(records),
        "project_count": len(group_projects(records)),
        "projects": group_projects(records),
        "threads": records,
    }
    index_path = state_dir / "index.json"
    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    write_report(state_dir / "report.md", index)
    return index_path


def write_report(path: Path, index: dict[str, Any]) -> None:
    lines = [
        "# Codex Project Manager Report",
        "",
        f"- created_at: {index['created_at']}",
        f"- codex_home: `{index['codex_home']}`",
        f"- projects: {index['project_count']}",
        f"- threads: {index['thread_count']}",
        "",
        "## Projects",
        "",
        "| project | threads | size bytes | latest |",
        "|---|---:|---:|---|",
    ]
    for project in index["projects"]:
        name = project.get("project_path") or "unassigned"
        lines.append(
            f"| `{name}` | {project['thread_count']} | {project['byte_size']} | {project['latest_modified_at']} |"
        )
    lines.extend(["", "## Recent Threads", ""])
    for thread in index["threads"][:50]:
        project = thread.get("project_path") or "unassigned"
        lines.append(f"- `{thread['id']}` [{project}] {thread['modified_at']} - {thread['title']}")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def load_index(state_dir: Path) -> dict[str, Any]:
    path = state_dir / "index.json"
    if not path.exists():
        raise SystemExit(f"index not found: {path}. Run scan first.")
    return json.loads(path.read_text(encoding="utf-8"))


def select_threads(index: dict[str, Any], thread_ids: list[str], project: str | None, limit: int | None = None) -> list[dict[str, Any]]:
    threads = index.get("threads", [])
    selected: list[dict[str, Any]] = []
    wanted_ids = set(thread_ids)
    project_resolved = str(Path(project).expanduser().resolve()) if project else None
    for thread in threads:
        if wanted_ids and thread["id"] in wanted_ids:
            selected.append(thread)
        elif project_resolved and thread.get("project_path") and str(Path(thread["project_path"]).expanduser().resolve()) == project_resolved:
            selected.append(thread)
    if not wanted_ids and not project_resolved:
        selected = threads
    if limit is not None:
        selected = selected[:limit]
    if wanted_ids:
        found = {thread["id"] for thread in selected}
        missing = sorted(wanted_ids - found)
        if missing:
            raise SystemExit(f"thread ids not found in index: {', '.join(missing)}")
    return selected


def create_bundle(args: argparse.Namespace) -> None:
    state_dir = resolve_state_dir(args.state_dir)
    index = load_index(state_dir)
    selected = select_threads(index, args.thread, args.project, args.limit)
    if not selected:
        raise SystemExit("no matching threads")
    project_label = args.project or selected[0].get("project_path") or "selected-threads"
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    output = Path(args.output).expanduser().resolve() if args.output else state_dir / "context-bundles" / f"{safe_slug(project_label)}-{timestamp}.md"
    output.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "# Codex Project Context Bundle",
        "",
        f"- created_at: {utc_now()}",
        f"- project_boundary: `{project_label}`",
        f"- thread_count: {len(selected)}",
        "",
        "Use this bundle as the context boundary for the current project. Do not assume unrelated local Codex conversations are in scope.",
        "",
    ]
    for idx, thread in enumerate(selected, start=1):
        source = Path(thread["source_path"])
        events = read_json_events(source)
        messages = extract_messages(events)
        lines.extend(
            [
                f"## {idx}. {thread['title']}",
                "",
                f"- thread_id: `{thread['id']}`",
                f"- project_path: `{thread.get('project_path') or 'unassigned'}`",
                f"- source_path: `{thread['source_path']}`",
                f"- modified_at: {thread['modified_at']}",
                "",
            ]
        )
        for message in messages[: args.messages_per_thread]:
            text = message["text"]
            if len(text) > args.max_message_chars:
                text = text[: args.max_message_chars].rstrip() + "\n...[truncated]"
            lines.extend([f"### {message['role']}", "", text, ""])
    output.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(json.dumps({"bundle": str(output), "threads": len(selected)}, ensure_ascii=False, indent=2))


def create_backup(state_dir: Path, selected: list[dict[str, Any]], scope: dict[str, Any]) -> Path:
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = state_dir / "backups" / timestamp
    files_dir = backup_dir / "sessions"
    files_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema_version": 1,
        "created_at": utc_now(),
        "scope": scope,
        "threads": [],
    }
    for thread in selected:
        source = Path(thread["source_path"]).resolve()
        if not source.exists():
            raise SystemExit(f"source file missing: {source}")
        dest_name = f"{safe_slug(thread['id'])}-{source.name}"
        dest = files_dir / dest_name
        shutil.copy2(source, dest)
        manifest["threads"].append(
            {
                "id": thread["id"],
                "title": thread["title"],
                "original_path": str(source),
                "backup_path": str(dest),
                "sha256": sha256_file(dest),
                "byte_size": dest.stat().st_size,
            }
        )
    (backup_dir / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return backup_dir


def archive_command(args: argparse.Namespace) -> None:
    state_dir = resolve_state_dir(args.state_dir)
    index = load_index(state_dir)
    selected = select_threads(index, args.thread, args.project, args.limit)
    if not selected:
        raise SystemExit("no matching threads")
    result = {
        "mode": "execute" if args.execute else "dry-run",
        "threads": len(selected),
        "files": [thread["source_path"] for thread in selected],
        "required_confirm": f"ARCHIVE {len(selected)} THREADS",
    }
    if not args.execute or args.dry_run:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return
    if args.confirm != result["required_confirm"]:
        raise SystemExit(f"confirmation mismatch. Required: {result['required_confirm']}")
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    archive_dir = state_dir / "archives" / timestamp
    files_dir = archive_dir / "sessions"
    files_dir.mkdir(parents=True, exist_ok=True)
    manifest = {
        "schema_version": 1,
        "kind": "archive",
        "created_at": utc_now(),
        "threads": [],
    }
    moved = []
    for thread in selected:
        source = Path(thread["source_path"]).resolve()
        if not source.exists():
            continue
        dest = files_dir / f"{safe_slug(thread['id'])}-{source.name}"
        shutil.move(str(source), str(dest))
        entry = {
            "id": thread["id"],
            "title": thread["title"],
            "original_path": str(source),
            "archive_path": str(dest),
            "sha256": sha256_file(dest),
            "byte_size": dest.stat().st_size,
        }
        manifest["threads"].append(entry)
        moved.append({"id": thread["id"], "from": str(source), "to": str(dest)})
    manifest_path = archive_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    result["archive"] = str(archive_dir)
    result["manifest"] = str(manifest_path)
    result["moved"] = moved
    print(json.dumps(result, ensure_ascii=False, indent=2))


def backup_command(args: argparse.Namespace) -> None:
    state_dir = resolve_state_dir(args.state_dir)
    index = load_index(state_dir)
    selected = select_threads(index, args.thread, args.project, args.limit)
    if not selected:
        raise SystemExit("no matching threads")
    backup_dir = create_backup(state_dir, selected, {"project": args.project, "thread_ids": args.thread})
    print(json.dumps({"backup": str(backup_dir), "threads": len(selected)}, ensure_ascii=False, indent=2))


def restore_command(args: argparse.Namespace) -> None:
    manifest_path = Path(args.manifest).expanduser().resolve()
    if not manifest_path.exists():
        raise SystemExit(f"manifest not found: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    entries = manifest.get("threads", [])
    plan = []
    for entry in entries:
        source_value = entry.get("backup_path") or entry.get("archive_path")
        original_value = entry.get("original_path")
        if not source_value or not original_value:
            continue
        source = Path(source_value).resolve()
        original = Path(original_value).resolve()
        target = original
        conflict = False
        if target.exists():
            conflict = True
            target = target.with_name(f"{target.stem}.restored-{dt.datetime.now().strftime('%Y%m%d-%H%M%S')}{target.suffix}")
        plan.append({"id": entry.get("id"), "from": str(source), "to": str(target), "conflict": conflict})
    result = {"mode": "execute" if args.execute else "dry-run", "manifest": str(manifest_path), "files": plan}
    if not args.execute or args.dry_run:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return
    restored = []
    for item in plan:
        source = Path(item["from"])
        target = Path(item["to"])
        if not source.exists():
            raise SystemExit(f"restore source missing: {source}")
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        restored.append(item)
    result["restored"] = restored
    print(json.dumps(result, ensure_ascii=False, indent=2))


def delete_command(args: argparse.Namespace) -> None:
    state_dir = resolve_state_dir(args.state_dir)
    index = load_index(state_dir)
    selected = select_threads(index, args.thread, args.project, args.limit)
    if not selected:
        raise SystemExit("no matching threads")
    result = {
        "mode": "execute" if args.execute else "dry-run",
        "permanent": bool(args.permanent),
        "threads": len(selected),
        "files": [thread["source_path"] for thread in selected],
        "required_confirm": f"DELETE {len(selected)} THREADS",
    }
    if not args.execute or args.dry_run:
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return
    if args.confirm != result["required_confirm"]:
        raise SystemExit(f"confirmation mismatch. Required: {result['required_confirm']}")
    backup_dir = None
    if not args.skip_backup:
        backup_dir = create_backup(state_dir, selected, {"delete": True, "permanent": bool(args.permanent)})
    trash_dir = state_dir / "trash" / dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    if not args.permanent:
        trash_dir.mkdir(parents=True, exist_ok=True)
    moved = []
    for thread in selected:
        source = Path(thread["source_path"]).resolve()
        if not source.exists():
            continue
        if args.permanent:
            source.unlink()
            moved.append({"id": thread["id"], "deleted": str(source)})
        else:
            dest = trash_dir / f"{safe_slug(thread['id'])}-{source.name}"
            shutil.move(str(source), str(dest))
            moved.append({"id": thread["id"], "from": str(source), "to": str(dest)})
    result["backup"] = str(backup_dir) if backup_dir else None
    result["trash"] = str(trash_dir) if not args.permanent else None
    result["moved"] = moved
    print(json.dumps(result, ensure_ascii=False, indent=2))


def sync_stage_command(args: argparse.Namespace) -> None:
    state_dir = resolve_state_dir(args.state_dir)
    if not (state_dir / "index.json").exists():
        raise SystemExit("index not found. Run scan first.")
    timestamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    staging_dir = state_dir / "sync" / "staging"
    manifests_dir = state_dir / "sync" / "manifests"
    staging_dir.mkdir(parents=True, exist_ok=True)
    manifests_dir.mkdir(parents=True, exist_ok=True)
    zip_path = staging_dir / f"codex-project-manager-{timestamp}.zip"
    included: list[str] = []
    candidates = [state_dir / "index.json", state_dir / "report.md"]
    candidates.extend((state_dir / "context-bundles").glob("*.md") if (state_dir / "context-bundles").exists() else [])
    if args.include_backups and (state_dir / "backups").exists():
        candidates.extend(path for path in (state_dir / "backups").rglob("*") if path.is_file())
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in candidates:
            if path.exists() and path.is_file():
                arcname = path.relative_to(state_dir)
                archive.write(path, arcname.as_posix())
                included.append(str(arcname))
    manifest = {
        "created_at": utc_now(),
        "package": str(zip_path),
        "sha256": sha256_file(zip_path),
        "include_backups": bool(args.include_backups),
        "files": included,
        "upload_note": "Upload this package with an explicit user-approved provider such as rclone, aliyunpan, WebDAV, or local-folder sync.",
    }
    manifest_path = manifests_dir / f"{zip_path.stem}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"package": str(zip_path), "manifest": str(manifest_path), "files": len(included)}, ensure_ascii=False, indent=2))


def list_projects_command(args: argparse.Namespace) -> None:
    index = load_index(resolve_state_dir(args.state_dir))
    rows = []
    for project in index.get("projects", []):
        rows.append(
            {
                "project_path": project.get("project_path") or "unassigned",
                "threads": project["thread_count"],
                "byte_size": project["byte_size"],
                "latest": project["latest_modified_at"],
            }
        )
    print(json.dumps(rows, ensure_ascii=False, indent=2))


def scan_command(args: argparse.Namespace) -> None:
    codex_home = resolve_codex_home(args.codex_home)
    state_dir = resolve_state_dir(args.state_dir)
    records = scan_sessions(codex_home)
    index_path = write_index(state_dir, codex_home, records)
    print(json.dumps({"index": str(index_path), "report": str(state_dir / "report.md"), "threads": len(records), "projects": len(group_projects(records))}, ensure_ascii=False, indent=2))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Manage local Codex project/session files")
    parser.add_argument("--state-dir", help="Manager state directory, default ~/.codex-project-manager")
    sub = parser.add_subparsers(dest="command", required=True)

    scan = sub.add_parser("scan", help="Scan Codex session files and write index/report")
    scan.add_argument("--codex-home", help="Codex home path, default CODEX_HOME or ~/.codex")
    scan.set_defaults(func=scan_command)

    list_projects = sub.add_parser("list-projects", help="Print indexed projects as JSON")
    list_projects.set_defaults(func=list_projects_command)

    bundle = sub.add_parser("bundle", help="Create a project context bundle")
    bundle.add_argument("--project", help="Project path to select")
    bundle.add_argument("--thread", action="append", default=[], help="Thread id to include; repeatable")
    bundle.add_argument("--limit", type=int, default=8, help="Limit recent project threads")
    bundle.add_argument("--messages-per-thread", type=int, default=8)
    bundle.add_argument("--max-message-chars", type=int, default=MAX_MESSAGE_CHARS)
    bundle.add_argument("--output", help="Output Markdown path")
    bundle.set_defaults(func=create_bundle)

    backup = sub.add_parser("backup", help="Backup selected session files")
    backup.add_argument("--project", help="Project path to select")
    backup.add_argument("--thread", action="append", default=[], help="Thread id to include; repeatable")
    backup.add_argument("--limit", type=int, help="Limit selected threads")
    backup.set_defaults(func=backup_command)

    archive = sub.add_parser("archive", help="Archive selected session files into manager storage")
    archive.add_argument("--project", help="Project path to select")
    archive.add_argument("--thread", action="append", default=[], help="Thread id to include; repeatable")
    archive.add_argument("--limit", type=int, help="Limit selected threads")
    archive.add_argument("--dry-run", action="store_true", help="Print impact only")
    archive.add_argument("--execute", action="store_true", help="Execute archive after confirmation")
    archive.add_argument("--confirm", default="", help='Exact phrase: "ARCHIVE N THREADS"')
    archive.set_defaults(func=archive_command)

    restore = sub.add_parser("restore", help="Restore files from a backup/archive manifest")
    restore.add_argument("--manifest", required=True, help="Path to manifest.json")
    restore.add_argument("--dry-run", action="store_true", help="Print restore plan only")
    restore.add_argument("--execute", action="store_true", help="Copy files back to original paths")
    restore.set_defaults(func=restore_command)

    delete = sub.add_parser("delete", help="Dry-run or execute safe deletion")
    delete.add_argument("--project", help="Project path to select")
    delete.add_argument("--thread", action="append", default=[], help="Thread id to include; repeatable")
    delete.add_argument("--limit", type=int, help="Limit selected threads")
    delete.add_argument("--dry-run", action="store_true", help="Print impact only")
    delete.add_argument("--execute", action="store_true", help="Execute deletion after confirmation")
    delete.add_argument("--confirm", default="", help='Exact phrase: "DELETE N THREADS"')
    delete.add_argument("--permanent", action="store_true", help="Permanently delete instead of moving to trash")
    delete.add_argument("--skip-backup", action="store_true", help="Skip backup only after explicit user approval")
    delete.set_defaults(func=delete_command)

    sync = sub.add_parser("sync-stage", help="Create a local zip package for cloud upload")
    sync.add_argument("--include-backups", action="store_true")
    sync.set_defaults(func=sync_stage_command)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
