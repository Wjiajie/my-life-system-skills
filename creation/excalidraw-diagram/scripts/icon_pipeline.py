"""Shared helpers for native Excalidraw icon-library workflows."""

from __future__ import annotations

import copy
import json
import math
import os
import re
import tempfile
import uuid
from pathlib import Path
from typing import Any, Iterable


JsonObject = dict[str, Any]


def read_json(path: Path) -> JsonObject:
    with path.open("r", encoding="utf-8-sig") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    return data


def write_json(path: Path, data: JsonObject) -> None:
    """Write JSON atomically so a failed edit never truncates a diagram."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=path.parent
    )
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def slugify(value: str) -> str:
    slug = re.sub(r"[^\w.-]+", "-", value.strip().lower(), flags=re.UNICODE)
    slug = re.sub(r"-+", "-", slug).strip("-.")
    return slug or "icon"


def _element_points(element: JsonObject) -> Iterable[tuple[float, float]]:
    x = float(element.get("x", 0))
    y = float(element.get("y", 0))
    points = element.get("points")
    if isinstance(points, list) and points:
        for point in points:
            if isinstance(point, list) and len(point) >= 2:
                yield x + float(point[0]), y + float(point[1])
        return
    width = abs(float(element.get("width", 0)))
    height = abs(float(element.get("height", 0)))
    yield x, y
    yield x + width, y + height


def bounding_box(elements: list[JsonObject]) -> tuple[float, float, float, float]:
    points = [point for element in elements for point in _element_points(element)]
    if not points:
        return (0.0, 0.0, 0.0, 0.0)
    xs, ys = zip(*points)
    return (min(xs), min(ys), max(xs), max(ys))


def _new_id() -> str:
    return uuid.uuid4().hex[:16]


def _new_seed() -> int:
    return uuid.uuid4().int % 2_000_000_000 + 1


def _remap_reference(value: Any, id_map: dict[str, str]) -> Any:
    if isinstance(value, dict):
        remapped = {}
        for key, child in value.items():
            if key in {"elementId", "containerId", "frameId"} and isinstance(child, str):
                remapped[key] = id_map.get(child, child)
            elif key == "id" and isinstance(child, str) and child in id_map:
                remapped[key] = id_map[child]
            else:
                remapped[key] = _remap_reference(child, id_map)
        return remapped
    if isinstance(value, list):
        return [_remap_reference(child, id_map) for child in value]
    return value


def transform_elements(
    elements: list[JsonObject],
    target_x: float,
    target_y: float,
    *,
    width: float | None = None,
    height: float | None = None,
    roughness: int | None = None,
    stroke_color: str | None = None,
) -> list[JsonObject]:
    """Deep-copy, scale, place, and safely re-identify a library item."""
    if not elements:
        raise ValueError("Icon contains no elements")
    min_x, min_y, max_x, max_y = bounding_box(elements)
    source_width = max(max_x - min_x, 1.0)
    source_height = max(max_y - min_y, 1.0)
    scales = []
    if width is not None:
        if width <= 0:
            raise ValueError("width must be positive")
        scales.append(width / source_width)
    if height is not None:
        if height <= 0:
            raise ValueError("height must be positive")
        scales.append(height / source_height)
    scale = min(scales) if scales else 1.0
    if not math.isfinite(scale) or scale <= 0:
        raise ValueError("Computed icon scale is invalid")

    id_map = {
        str(element["id"]): _new_id()
        for element in elements
        if isinstance(element.get("id"), str)
    }
    group_map: dict[str, str] = {}
    for element in elements:
        for group_id in element.get("groupIds", []) or []:
            if isinstance(group_id, str):
                group_map.setdefault(group_id, _new_id())

    transformed: list[JsonObject] = []
    for source in elements:
        element = _remap_reference(copy.deepcopy(source), id_map)
        old_id = source.get("id")
        if isinstance(old_id, str):
            element["id"] = id_map[old_id]
        else:
            element["id"] = _new_id()
        element["x"] = target_x + (float(source.get("x", 0)) - min_x) * scale
        element["y"] = target_y + (float(source.get("y", 0)) - min_y) * scale
        if "width" in source:
            element["width"] = abs(float(source.get("width", 0))) * scale
        if "height" in source:
            element["height"] = abs(float(source.get("height", 0))) * scale
        if isinstance(source.get("points"), list):
            element["points"] = [
                [float(point[0]) * scale, float(point[1]) * scale]
                for point in source["points"]
            ]
        if element.get("type") == "text" and isinstance(source.get("fontSize"), (int, float)):
            element["fontSize"] = max(8, round(float(source["fontSize"]) * scale, 2))
        element["groupIds"] = [
            group_map.get(group_id, group_id)
            for group_id in (source.get("groupIds", []) or [])
        ]
        element["seed"] = _new_seed()
        element["versionNonce"] = _new_seed()
        element["version"] = 1
        element["updated"] = 1
        element.pop("index", None)
        if roughness is not None and element.get("type") != "image":
            element["roughness"] = roughness
        if stroke_color is not None and element.get("strokeColor") != "transparent":
            element["strokeColor"] = stroke_color
        transformed.append(element)
    return transformed


def catalog_paths(libraries_root: Path) -> list[Path]:
    if (libraries_root / "catalog.json").exists():
        return [libraries_root / "catalog.json"]
    return sorted(libraries_root.glob("*/catalog.json"))


def search_catalogs(
    libraries_root: Path, query: str, *, library: str | None = None
) -> list[JsonObject]:
    tokens = [token for token in re.split(r"[\s,;/|]+", query.casefold()) if token]
    results: list[JsonObject] = []
    for catalog_path in catalog_paths(libraries_root):
        catalog = read_json(catalog_path)
        library_name = str(catalog.get("library", catalog_path.parent.name))
        if library and library.casefold() not in {
            library_name.casefold(),
            catalog_path.parent.name.casefold(),
        }:
            continue
        for icon in catalog.get("icons", []):
            if not isinstance(icon, dict):
                continue
            name = str(icon.get("name", ""))
            slug = str(icon.get("slug", ""))
            keywords = [str(value) for value in icon.get("keywords", [])]
            haystack = " ".join([name, slug, *keywords]).casefold()
            score = 0
            if query.casefold() == name.casefold() or query.casefold() == slug.casefold():
                score += 100
            for token in tokens:
                if token == name.casefold() or token == slug.casefold():
                    score += 40
                elif name.casefold().startswith(token) or slug.casefold().startswith(token):
                    score += 20
                elif token in haystack:
                    score += 8
                else:
                    score -= 3
            if not tokens or score > 0:
                results.append(
                    {
                        **icon,
                        "library": library_name,
                        "libraryPath": str(catalog_path.parent),
                        "score": score,
                    }
                )
    return sorted(results, key=lambda item: (-int(item["score"]), item["library"], item["name"]))


def validate_scene(scene: JsonObject) -> list[str]:
    errors: list[str] = []
    if scene.get("type") != "excalidraw":
        errors.append("scene.type must be 'excalidraw'")
    elements = scene.get("elements")
    if not isinstance(elements, list) or not elements:
        errors.append("scene.elements must be a non-empty array")
        return errors
    ids = [element.get("id") for element in elements if isinstance(element, dict)]
    valid_ids = {value for value in ids if isinstance(value, str)}
    if len(valid_ids) != len(ids):
        errors.append("every element must have a string id")
    duplicates = sorted({value for value in valid_ids if ids.count(value) > 1})
    if duplicates:
        errors.append(f"duplicate element ids: {', '.join(duplicates)}")
    for element in elements:
        if not isinstance(element, dict):
            errors.append("all elements must be objects")
            continue
        for key in ("containerId", "frameId"):
            ref = element.get(key)
            if isinstance(ref, str) and ref not in valid_ids:
                errors.append(f"{element.get('id')}.{key} points to missing id {ref}")
        for key in ("startBinding", "endBinding"):
            binding = element.get(key)
            if isinstance(binding, dict):
                ref = binding.get("elementId")
                if isinstance(ref, str) and ref not in valid_ids:
                    errors.append(f"{element.get('id')}.{key} points to missing id {ref}")
        for bound in element.get("boundElements", []) or []:
            if isinstance(bound, dict):
                ref = bound.get("id")
                if isinstance(ref, str) and ref not in valid_ids:
                    errors.append(f"{element.get('id')}.boundElements points to missing id {ref}")
    return errors
