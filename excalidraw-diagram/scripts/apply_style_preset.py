#!/usr/bin/env python3
"""Apply a reusable style preset without flattening semantic colors."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from icon_pipeline import read_json, validate_scene, write_json


DEFAULT_PRESET = (
    Path(__file__).resolve().parent.parent
    / "assets"
    / "style-presets"
    / "handdrawn-whiteboard.json"
)


def apply_preset(scene: dict, preset: dict) -> None:
    defaults = preset.get("elementDefaults", {})
    scene.setdefault("appState", {})["viewBackgroundColor"] = preset.get(
        "canvas", {}
    ).get("background", "#f8f6f1")
    for element in scene.get("elements", []):
        if element.get("type") != "image" and "roughness" in defaults:
            element["roughness"] = defaults["roughness"]
        if element.get("type") == "text":
            if "fontFamily" in defaults:
                element["fontFamily"] = defaults["fontFamily"]
            if element.get("strokeColor") in {None, "#000000", "#1e1e1e"}:
                element["strokeColor"] = defaults.get("textColor", "#343a40")
        if element.get("strokeWidth", 0) <= 0:
            element["strokeWidth"] = defaults.get("strokeWidth", 1)
        element["opacity"] = 100


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("diagram", type=Path)
    parser.add_argument("--preset", type=Path, default=DEFAULT_PRESET)
    parser.add_argument("--output", "-o", type=Path)
    args = parser.parse_args()
    try:
        scene = read_json(args.diagram)
        preset = read_json(args.preset)
        apply_preset(scene, preset)
        errors = validate_scene(scene)
        if errors:
            raise ValueError("; ".join(errors))
        output = args.output or args.diagram
        write_json(output, scene)
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"Applied {preset.get('name', args.preset.stem)} to {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
