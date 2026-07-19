#!/usr/bin/env python3
"""Insert a native, editable library icon into an Excalidraw scene."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from icon_pipeline import (
    bounding_box,
    read_json,
    search_catalogs,
    transform_elements,
    validate_scene,
    write_json,
)


DEFAULT_ROOT = Path(__file__).resolve().parent.parent / "libraries"


def make_label(text: str, x: float, y: float, width: float) -> dict:
    return {
        "id": __import__("uuid").uuid4().hex[:16],
        "type": "text",
        "x": x,
        "y": y,
        "width": width,
        "height": 25,
        "angle": 0,
        "strokeColor": "#343a40",
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "strokeStyle": "solid",
        "roughness": 1,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": None,
        "seed": 123456789,
        "version": 1,
        "versionNonce": 987654321,
        "isDeleted": False,
        "boundElements": None,
        "updated": 1,
        "link": None,
        "locked": False,
        "text": text,
        "fontSize": 20,
        "fontFamily": 5,
        "textAlign": "center",
        "verticalAlign": "top",
        "containerId": None,
        "originalText": text,
        "autoResize": False,
        "lineHeight": 1.25,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("diagram", type=Path)
    parser.add_argument("icon", help="icon name, slug, or semantic query")
    parser.add_argument("x", type=float)
    parser.add_argument("y", type=float)
    parser.add_argument("--root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--library")
    parser.add_argument("--width", type=float)
    parser.add_argument("--height", type=float)
    parser.add_argument("--label")
    parser.add_argument("--roughness", type=int, choices=(0, 1, 2), default=1)
    parser.add_argument("--stroke-color")
    parser.add_argument("--output", "-o", type=Path)
    args = parser.parse_args()
    try:
        matches = search_catalogs(args.root, args.icon, library=args.library)
        if not matches:
            raise ValueError(f"No icon matched {args.icon!r}")
        match = matches[0]
        icon_path = Path(match["libraryPath"]) / str(match["file"])
        icon = read_json(icon_path)
        transformed = transform_elements(
            icon.get("elements", []),
            args.x,
            args.y,
            width=args.width,
            height=args.height,
            roughness=args.roughness,
            stroke_color=args.stroke_color,
        )
        scene = read_json(args.diagram)
        scene.setdefault("elements", []).extend(transformed)
        if args.label:
            min_x, _, max_x, max_y = bounding_box(transformed)
            scene["elements"].append(make_label(args.label, min_x, max_y + 12, max_x - min_x))
        errors = validate_scene(scene)
        if errors:
            raise ValueError("; ".join(errors))
        output = args.output or args.diagram
        write_json(output, scene)
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"Added {match['library']}:{match['slug']} to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
