# Hand-drawn whiteboard and icon workflow

Use this reference when the user asks for a hand-drawn infographic, a concept-rich whiteboard, or native editable icons.

## Style contract

- Use `assets/style-presets/handdrawn-whiteboard.json` as the visual source of truth.
- For a 3:4 portrait export, design inside a `900 × 1200` paper rectangle. The rectangle makes the exported bounds deterministic.
- Use `fontFamily: 5` for Excalifont; current Excalidraw falls back to Xiaolai for Chinese, Japanese, and Korean text.
- Use `roughness: 1`, dark-gray thin strokes, solid low-saturation fills, and an off-white paper background.
- Use one icon family per diagram. Keep icon sizes within a small set such as 64, 80, and 112 pixels.
- Keep icons semantic: an icon must replace or reinforce a concept, not decorate unrelated text.
- Treat native icon search as mandatory for hand-drawn, CJK, social-media, and concept-rich whiteboards. Use at least one semantic hero icon on a cover and 1–3 semantic icons on each content page unless the page is intentionally typographic.

Apply the preset after assembling a scene:

```powershell
python scripts/apply_style_preset.py <diagram.excalidraw>
```

## Mandatory icon plan

Create this plan before generating scene JSON:

| Major concept | Search terms | Chosen library + slug | Placement | Skip reason |
|---------------|--------------|-----------------------|-----------|-------------|
| Example: progressive loading | `layers level 层级` | `Core Handdrawn:layers` | Between Level 1 and Level 2 | — |

Search every major concrete concept. If a semantic match exists, insert it before drawing a substitute. The skip-reason column is required only when a matching icon is deliberately not used because it conflicts with the visual argument, scale, or composition.

## Icon selection order

1. Translate each concept into two to four short synonyms, including Chinese and English when useful.
2. Search installed catalogs before drawing a new icon:

```powershell
python scripts/search_icons.py "文档 file paper"
python scripts/search_icons.py "pipeline 流程" --json
```

3. Choose the result whose metaphor and visual weight fit the surrounding composition.
4. Insert it as native editable elements:

```powershell
python scripts/add_icon_to_diagram.py <diagram.excalidraw> document 120 280 --width 88
python scripts/add_icon_to_diagram.py <diagram.excalidraw> workflow 130 500 --width 180 --label "工作流"
```

5. Use emoji only for familiar people or emotional markers. Use raster generation only for a unique illustration that cannot be expressed with native elements; raster images are not fully editable.
6. After insertion, confirm the cover has at least one semantic hero icon and each content page has 1–3 semantic icons. Do not add icons merely to reach the count; revise the concept mapping instead.

## Install another Excalidraw library

Place a license-compatible `.excalidrawlib` in its own folder under `libraries/`, then index it:

```powershell
python scripts/split_excalidraw_library.py libraries/<library-name> --force
```

The splitter creates `icons/*.json`, `catalog.json`, and `reference.md`. Preserve the upstream library file and its license information. Do not merge unverified or incompatible assets into the bundled core library.

## Quality gates

- The icon plan covers every major concrete concept and records any deliberate skip.
- A cover contains at least one semantic hero icon; each content page contains 1–3 semantic icons unless intentionally typographic.
- Search results came from a known local library and the license is recorded.
- All inserted elements have unique IDs; bindings and container references resolve.
- Icon family, scale, stroke weight, and roughness are consistent.
- Text is readable at final export size and uses `fontFamily: 5` for the hand-drawn CJK style.
- The content bounds match the requested ratio.
- Run structural validation, then render, view, and fix:

```powershell
python scripts/validate_scene.py <diagram.excalidraw> --aspect 3:4
cd references
uv run python render_excalidraw.py <diagram.excalidraw>
```
