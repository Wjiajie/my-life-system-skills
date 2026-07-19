#!/usr/bin/env python3
"""Search all installed native Excalidraw icon catalogs."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from icon_pipeline import search_catalogs


DEFAULT_ROOT = Path(__file__).resolve().parent.parent / "libraries"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query", nargs="?", default="", help="concept, synonym, or icon name")
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT, help="libraries root")
    parser.add_argument("--library", help="restrict results to one library")
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args()
    if not args.root.exists():
        print(f"ERROR: libraries root not found: {args.root}", file=sys.stderr)
        return 1
    results = search_catalogs(args.root, args.query, library=args.library)[: max(args.limit, 0)]
    if args.as_json:
        print(json.dumps(results, ensure_ascii=False, indent=2))
    elif not results:
        print("No matching icons.")
    else:
        for result in results:
            keywords = ", ".join(str(value) for value in result.get("keywords", []))
            print(f"{result['library']}:{result['slug']}\t{result['name']}\t{keywords}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
