#!/usr/bin/env python3
"""Memory persistence manager for the self-evolving agent.

Manages MEMORY.md (long-term knowledge) and daily notes with:
- Semantic dedup before writing
- Automatic compaction when file grows too large
- Session summary flushing

Usage:
    # Write to memory
    python memory_manager.py write --content "Important fact learned" --memory-dir ./context

    # Read memory
    python memory_manager.py read --memory-dir ./context

    # Compact memory
    python memory_manager.py compact --memory-dir ./context

    # Flush session note
    python memory_manager.py flush --session-id abc123 --summary "Did X, Y, Z" --memory-dir ./context

Or as a library:
    from memory_manager import MemoryManager
    mgr = MemoryManager("./context")
    mgr.write("Important fact")
    content = mgr.read()
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path


# Default thresholds
MAX_MEMORY_BYTES = 50_000      # ~50KB triggers compaction
MAX_PROMPT_CHARS = 8_000       # max chars sent to LLM for dedup check


class MemoryManager:
    """Manages MEMORY.md and daily notes for cross-session persistence.

    Directory structure:
        {memory_dir}/
        ├── MEMORY.md                    ← cross-session stable knowledge
        └── {YYYY-MM-DD}/
            └── daily_note.md            ← today's execution summaries
    """

    def __init__(self, memory_dir: str, max_memory_bytes: int = MAX_MEMORY_BYTES):
        self.memory_dir = Path(memory_dir)
        self.memory_path = self.memory_dir / "MEMORY.md"
        self.max_memory_bytes = max_memory_bytes
        self.memory_dir.mkdir(parents=True, exist_ok=True)

    # ── Read ──────────────────────────────────────────

    def read(self) -> str:
        """Read full MEMORY.md content."""
        if not self.memory_path.exists():
            return ""
        return self.memory_path.read_text(encoding="utf-8")

    def get_context_section(self, recent_days: int = 3) -> str:
        """Build context section for system prompt injection.

        Includes MEMORY.md + recent daily notes references.
        """
        parts = []

        # Long-term memory
        if self.memory_path.exists():
            content = self.memory_path.read_text(encoding="utf-8").strip()
            if content:
                if len(content) > MAX_PROMPT_CHARS:
                    content = content[:MAX_PROMPT_CHARS] + "\n...[memory truncated]"
                parts.append(f"## Long-term Memory\n{content}")

        # Recent daily notes (references only)
        today = datetime.now().date()
        notes = []
        for i in range(recent_days):
            from datetime import timedelta
            date = today - timedelta(days=i)
            path = self.memory_dir / str(date) / "daily_note.md"
            if path.exists() and path.stat().st_size > 0:
                notes.append(f"- {date}: `{path}` ({path.stat().st_size // 1024}KB)")

        if notes:
            parts.append(
                "## Recent Daily Notes (use filesystem to read if needed)\n"
                + "\n".join(notes)
            )

        return "\n\n".join(parts)

    # ── Write ─────────────────────────────────────────

    def write(self, content: str, dedup: bool = True) -> dict:
        """Append content to MEMORY.md.

        Args:
            content: Text to append
            dedup: If True, check for exact substring duplication first

        Returns:
            dict with: written (bool), reason (str), dedup_prompt (str|None)
        """
        content = content.strip()
        if not content:
            return {"written": False, "reason": "empty content", "dedup_prompt": None}

        existing = self.read()

        # Fast substring dedup
        if dedup and content in existing:
            return {"written": False, "reason": "exact substring duplicate", "dedup_prompt": None}

        # Build LLM dedup prompt for the caller to evaluate
        dedup_prompt = None
        if dedup and existing.strip():
            truncated_existing = existing[-MAX_PROMPT_CHARS:] if len(existing) > MAX_PROMPT_CHARS else existing
            dedup_prompt = (
                "You are a deduplication checker. Given existing memory content and a new entry, "
                "determine if the new entry is semantically redundant (already covered by existing content). "
                "Respond with ONLY 'YES' if redundant, or 'NO' if it contains new information.\n\n"
                f"## Existing Memory:\n{truncated_existing}\n\n"
                f"## New Entry:\n{content}\n\n"
                "Is the new entry semantically redundant with existing memory?"
            )

        # Write to file
        self.memory_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.memory_path, "a", encoding="utf-8") as f:
            f.write(f"\n{content}\n")

        return {
            "written": True,
            "reason": "appended to MEMORY.md",
            "dedup_prompt": dedup_prompt,
            "needs_compaction": self.needs_compaction(),
        }

    # ── Compaction ────────────────────────────────────

    def needs_compaction(self) -> bool:
        """Check if MEMORY.md exceeds size threshold."""
        if not self.memory_path.exists():
            return False
        return self.memory_path.stat().st_size > self.max_memory_bytes

    def get_compaction_prompt(self) -> dict:
        """Build LLM compaction prompt for the caller to evaluate.

        Returns:
            dict with: needs_compaction (bool), prompt (str|None), current_size (int)
        """
        if not self.needs_compaction():
            return {"needs_compaction": False, "prompt": None, "current_size": 0}

        existing = self.read()
        prompt = (
            "You are a memory compactor. Given a collection of long-term memory entries, "
            "merge and deduplicate them into a concise, well-organized summary. "
            "Preserve all unique facts, preferences, and decisions. "
            "Remove redundancy. Use bullet points grouped by topic. "
            "Keep the result in the same language as the input.\n\n"
            f"## Memory to compact:\n{existing}"
        )

        return {
            "needs_compaction": True,
            "prompt": prompt,
            "current_size": len(existing.encode("utf-8")),
        }

    def replace_memory(self, new_content: str) -> dict:
        """Replace MEMORY.md with compacted content.

        Call this after LLM generates compacted version.
        """
        self.memory_path.parent.mkdir(parents=True, exist_ok=True)
        self.memory_path.write_text(new_content, encoding="utf-8")
        return {
            "replaced": True,
            "new_size": len(new_content.encode("utf-8")),
        }

    # ── Daily Notes ───────────────────────────────────

    def flush_session(self, session_id: str, summary: str) -> dict:
        """Write session summary to today's daily note.

        Args:
            session_id: Session identifier
            summary: Execution summary text
        """
        today = datetime.now()
        date_dir = self.memory_dir / str(today.date())
        date_dir.mkdir(parents=True, exist_ok=True)
        daily_path = date_dir / "daily_note.md"

        with open(daily_path, "a", encoding="utf-8") as f:
            f.write(
                f"\n### Session {session_id} ({today:%H:%M})\n"
                f"{summary}\n"
            )

        return {
            "written": True,
            "path": str(daily_path),
        }

    def cleanup_old_notes(self, max_age_days: int = 30) -> dict:
        """Remove daily notes older than max_age_days."""
        from datetime import timedelta
        today = datetime.now().date()
        cutoff = today - timedelta(days=max_age_days)
        removed = 0

        if not self.memory_dir.exists():
            return {"removed": 0}

        import shutil
        for child in self.memory_dir.iterdir():
            if not child.is_dir():
                continue
            try:
                dir_date = datetime.strptime(child.name, "%Y-%m-%d").date()
                if dir_date < cutoff:
                    shutil.rmtree(child)
                    removed += 1
            except ValueError:
                continue

        return {"removed": removed}


def main():
    parser = argparse.ArgumentParser(description="Self-evolving agent memory manager")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Read
    read_parser = subparsers.add_parser("read", help="Read MEMORY.md")
    read_parser.add_argument("--memory-dir", default="./context", help="Memory directory")

    # Write
    write_parser = subparsers.add_parser("write", help="Write to MEMORY.md")
    write_parser.add_argument("--content", required=True, help="Content to write")
    write_parser.add_argument("--memory-dir", default="./context", help="Memory directory")
    write_parser.add_argument("--no-dedup", action="store_true", help="Skip dedup check")

    # Compact
    compact_parser = subparsers.add_parser("compact", help="Get compaction prompt")
    compact_parser.add_argument("--memory-dir", default="./context", help="Memory directory")

    # Flush session
    flush_parser = subparsers.add_parser("flush", help="Flush session summary")
    flush_parser.add_argument("--session-id", required=True, help="Session ID")
    flush_parser.add_argument("--summary", required=True, help="Session summary")
    flush_parser.add_argument("--memory-dir", default="./context", help="Memory directory")

    # Context
    ctx_parser = subparsers.add_parser("context", help="Get context section for prompt")
    ctx_parser.add_argument("--memory-dir", default="./context", help="Memory directory")
    ctx_parser.add_argument("--days", type=int, default=3, help="Recent days to include")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    mgr = MemoryManager(args.memory_dir)

    if args.command == "read":
        content = mgr.read()
        print(content if content else "(empty)")

    elif args.command == "write":
        result = mgr.write(args.content, dedup=not args.no_dedup)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "compact":
        result = mgr.get_compaction_prompt()
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "flush":
        result = mgr.flush_session(args.session_id, args.summary)
        print(json.dumps(result, indent=2, ensure_ascii=False))

    elif args.command == "context":
        section = mgr.get_context_section(recent_days=args.days)
        print(section if section else "(no context)")


if __name__ == "__main__":
    main()
