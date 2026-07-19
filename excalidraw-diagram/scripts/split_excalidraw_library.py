#!/usr/bin/env python3
"""Split an Excalidraw library into searchable, reusable native icon assets."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from icon_pipeline import bounding_box, read_json, slugify, write_json


def resolve_library_file(value: Path) -> Path:
    if value.is_file():
        return value
    matches = sorted(value.glob("*.excalidrawlib")) if value.is_dir() else []
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one .excalidrawlib in {value}; found {len(matches)}")
    return matches[0]


def split_library(library_path: Path, output_dir: Path, *, force: bool = False) -> dict:
    data = read_json(library_path)
    items = data.get("libraryItems")
    if not isinstance(items, list) or not items:
        raise ValueError("Library must contain a non-empty libraryItems array")
    icons_dir = output_dir / "icons"
    icons_dir.mkdir(parents=True, exist_ok=True)
    icons: list[dict] = []
    used_slugs: set[str] = set()
    for position, item in enumerate(items, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"libraryItems[{position - 1}] is not an object")
        elements = item.get("elements")
        if not isinstance(elements, list) or not elements:
            raise ValueError(f"libraryItems[{position - 1}] has no elements")
        name = str(item.get("name") or f"Icon {position}")
        base_slug = slugify(name)
        slug = base_slug
        suffix = 2
        while slug in used_slugs:
            slug = f"{base_slug}-{suffix}"
            suffix += 1
        used_slugs.add(slug)
        icon_path = icons_dir / f"{slug}.json"
        if icon_path.exists() and not force:
            raise FileExistsError(f"Refusing to overwrite {icon_path}; pass --force")
        icon_data = {
            "name": name,
            "slug": slug,
            "keywords": item.get("keywords", []),
            "description": item.get("description", ""),
            "sourceLibrary": library_path.name,
            "elements": elements,
        }
        write_json(icon_path, icon_data)
        min_x, min_y, max_x, max_y = bounding_box(elements)
        icons.append(
            {
                "name": name,
                "slug": slug,
                "file": f"icons/{slug}.json",
                "keywords": icon_data["keywords"],
                "description": icon_data["description"],
                "elementCount": len(elements),
                "width": round(max_x - min_x, 2),
                "height": round(max_y - min_y, 2),
            }
        )
    catalog = {
        "version": 1,
        "library": str(data.get("name") or library_path.stem),
        "source": library_path.name,
        "license": data.get("license"),
        "icons": sorted(icons, key=lambda icon: icon["name"].casefold()),
    }
    write_json(output_dir / "catalog.json", catalog)
    reference_lines = [
        f"# {catalog['library']} icon reference",
        "",
        f"Source: `{library_path.name}` · Icons: {len(icons)}",
        "",
        "| Name | Keywords | Asset |",
        "|---|---|---|",
    ]
    for icon in catalog["icons"]:
        keywords = ", ".join(str(value) for value in icon["keywords"])
        reference_lines.append(f"| {icon['name']} | {keywords} | `{icon['file']}` |")
    (output_dir / "reference.md").write_text("\n".join(reference_lines) + "\n", encoding="utf-8")
    return catalog


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("library", type=Path, help=".excalidrawlib file or directory containing one")
    parser.add_argument("--output", "-o", type=Path, help="output library directory")
    parser.add_argument("--force", action="store_true", help="overwrite icon files with matching slugs")
    args = parser.parse_args()
    try:
        library_path = resolve_library_file(args.library)
        output = args.output or library_path.parent
        catalog = split_library(library_path, output, force=args.force)
    except (OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    print(f"Indexed {len(catalog['icons'])} icons in {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
