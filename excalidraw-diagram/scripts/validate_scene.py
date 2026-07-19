#!/usr/bin/env python3
"""Validate Excalidraw structure, IDs, and binding references."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from icon_pipeline import bounding_box, read_json, validate_scene


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("diagram", type=Path)
    parser.add_argument("--aspect", help="expected content aspect ratio, such as 3:4")
    parser.add_argument("--tolerance", type=float, default=0.01)
    args = parser.parse_args()
    try:
        scene = read_json(args.diagram)
        errors = validate_scene(scene)
        min_x, min_y, max_x, max_y = bounding_box(scene.get("elements", []))
        width, height = max_x - min_x, max_y - min_y
        if args.aspect:
            left, right = args.aspect.split(":", maxsplit=1)
            expected = float(left) / float(right)
            actual = width / height if height else 0
            if abs(actual - expected) > args.tolerance:
                errors.append(
                    f"content aspect ratio is {actual:.4f}; expected {expected:.4f} ({args.aspect})"
                )
    except (OSError, ValueError, ZeroDivisionError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(
        f"OK: {args.diagram} | {len(scene['elements'])} elements | "
        f"{width:.0f}x{height:.0f} content bounds"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
