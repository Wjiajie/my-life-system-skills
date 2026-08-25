from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = SKILL_ROOT / "scripts"
sys.path.insert(0, str(SCRIPTS))

from apply_style_preset import apply_preset  # noqa: E402
from icon_pipeline import read_json, search_catalogs, validate_scene  # noqa: E402
from split_excalidraw_library import split_library  # noqa: E402


def rectangle(element_id: str, width: int = 900, height: int = 1200) -> dict:
    return {
        "id": element_id,
        "type": "rectangle",
        "x": 0,
        "y": 0,
        "width": width,
        "height": height,
        "strokeColor": "#1e1e1e",
        "backgroundColor": "#ffffff",
        "strokeWidth": 1,
        "roughness": 0,
        "opacity": 100,
        "groupIds": [],
        "seed": 1,
        "version": 1,
        "versionNonce": 2,
        "isDeleted": False,
        "boundElements": None,
    }


class IconPipelineTests(unittest.TestCase):
    def test_bundled_catalog_supports_multilingual_search(self) -> None:
        matches = search_catalogs(SKILL_ROOT / "libraries", "流程 pipeline")
        self.assertTrue(matches)
        self.assertEqual(matches[0]["slug"], "workflow")

    def test_splitter_indexes_bundled_library(self) -> None:
        source = SKILL_ROOT / "libraries" / "core-handdrawn" / "core-handdrawn.excalidrawlib"
        with tempfile.TemporaryDirectory() as directory:
            catalog = split_library(source, Path(directory))
            self.assertEqual(len(catalog["icons"]), 14)
            self.assertTrue((Path(directory) / "icons" / "document.json").exists())
            self.assertTrue((Path(directory) / "catalog.json").exists())

    def test_add_icon_cli_preserves_scene_integrity(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            scene_path = Path(directory) / "scene.excalidraw"
            scene_path.write_text(
                json.dumps(
                    {
                        "type": "excalidraw",
                        "version": 2,
                        "source": "test",
                        "elements": [rectangle("paper")],
                        "appState": {"viewBackgroundColor": "#ffffff"},
                        "files": {},
                    }
                ),
                encoding="utf-8",
            )
            completed = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPTS / "add_icon_to_diagram.py"),
                    str(scene_path),
                    "document",
                    "100",
                    "120",
                    "--width",
                    "96",
                    "--label",
                    "文档",
                ],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(completed.returncode, 0, completed.stderr)
            scene = read_json(scene_path)
            self.assertGreater(len(scene["elements"]), 2)
            self.assertEqual(validate_scene(scene), [])

    def test_style_preset_uses_handdrawn_cjk_font(self) -> None:
        scene = {
            "type": "excalidraw",
            "elements": [
                rectangle("paper"),
                {
                    **rectangle("title", 200, 40),
                    "type": "text",
                    "text": "手绘白板",
                    "originalText": "手绘白板",
                    "fontFamily": 3,
                },
            ],
            "appState": {},
        }
        preset = read_json(
            SKILL_ROOT / "assets" / "style-presets" / "handdrawn-whiteboard.json"
        )
        apply_preset(scene, preset)
        self.assertEqual(scene["elements"][1]["fontFamily"], 5)
        self.assertEqual(scene["elements"][0]["roughness"], 1)
        self.assertEqual(scene["appState"]["viewBackgroundColor"], "#f8f6f1")

    def test_validator_rejects_dangling_bindings(self) -> None:
        arrow = rectangle("arrow")
        arrow["type"] = "arrow"
        arrow["startBinding"] = {"elementId": "missing", "focus": 0, "gap": 2}
        errors = validate_scene({"type": "excalidraw", "elements": [arrow]})
        self.assertTrue(any("missing" in error for error in errors))

    def test_renderer_forwards_scene_export_padding(self) -> None:
        template = (SKILL_ROOT / "references" / "render_template.html").read_text(
            encoding="utf-8"
        )
        self.assertIn("exportPadding: appState.exportPadding ?? 10", template)


if __name__ == "__main__":
    unittest.main()
