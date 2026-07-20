---
name: excalidraw-diagram
description: Create editable Excalidraw diagrams that make visual arguments, including technical architecture, workflows, concept maps, and hand-drawn infographic whiteboards. For hand-drawn, CJK, social-media, or concept-rich whiteboards, search installed native icon libraries and insert semantic editable icons before drawing common metaphors by hand. Use when the user asks to visualize a process, system, comparison, concept, or explanation as an Excalidraw file or rendered image.
---

# Excalidraw Diagram Creator

Generate `.excalidraw` JSON files that **argue visually**, not just display information.

**Setup:** If the user asks you to set up this skill (renderer, dependencies, etc.), see `README.md` for instructions.

## Customization

**All colors and brand-specific styles live in one file:** `references/color-palette.md`. Read it before generating any diagram and use it as the single source of truth for all color choices — shape fills, strokes, text colors, evidence artifact backgrounds, everything.

To make this skill produce diagrams in your own brand style, edit `color-palette.md`. Everything else in this file is universal design methodology and Excalidraw best practices.

---

## Core Philosophy

**Diagrams should ARGUE, not DISPLAY.**

A diagram isn't formatted text. It's a visual argument that shows relationships, causality, and flow that words alone can't express. The shape should BE the meaning.

**The Isomorphism Test**: If you removed all text, would the structure alone communicate the concept? If not, redesign.

**The Education Test**: Could someone learn something concrete from this diagram, or does it just label boxes? A good diagram teaches—it shows actual formats, real event names, concrete examples.

---

## Depth Assessment (Do This First)

Before designing, determine what level of detail this diagram needs:

### Simple/Conceptual Diagrams
Use abstract shapes when:
- Explaining a mental model or philosophy
- The audience doesn't need technical specifics
- The concept IS the abstraction (e.g., "separation of concerns")

### Comprehensive/Technical Diagrams
Use concrete examples when:
- Diagramming a real system, protocol, or architecture
- The diagram will be used to teach or explain (e.g., YouTube video)
- The audience needs to understand what things actually look like
- You're showing how multiple technologies integrate

**For technical diagrams, you MUST include evidence artifacts** (see below).

---

## Research Mandate (For Technical Diagrams)

**Before drawing anything technical, research the actual specifications.**

If you're diagramming a protocol, API, or framework:
1. Look up the actual JSON/data formats
2. Find the real event names, method names, or API endpoints
3. Understand how the pieces actually connect
4. Use real terminology, not generic placeholders

Bad: "Protocol" → "Frontend"
Good: "AG-UI streams events (RUN_STARTED, STATE_DELTA, A2UI_UPDATE)" → "CopilotKit renders via createA2UIMessageRenderer()"

**Research makes diagrams accurate AND educational.**

---

## Evidence Artifacts

Evidence artifacts are concrete examples that prove your diagram is accurate and help viewers learn. Include them in technical diagrams.

**Types of evidence artifacts** (choose what's relevant to your diagram):

| Artifact Type | When to Use | How to Render |
|---------------|-------------|---------------|
| **Code snippets** | APIs, integrations, implementation details | Dark rectangle + syntax-colored text (see color palette for evidence artifact colors) |
| **Data/JSON examples** | Data formats, schemas, payloads | Dark rectangle + colored text (see color palette) |
| **Event/step sequences** | Protocols, workflows, lifecycles | Timeline pattern (line + dots + labels) |
| **UI mockups** | Showing actual output/results | Nested rectangles mimicking real UI |
| **Real input content** | Showing what goes IN to a system | Rectangle with sample content visible |
| **API/method names** | Real function calls, endpoints | Use actual names from docs, not placeholders |

**Example**: For a diagram about a streaming protocol, you might show:
- The actual event names from the spec (not just "Event 1", "Event 2")
- A code snippet showing how to connect
- What the streamed data actually looks like

**Example**: For a diagram about a data transformation pipeline:
- Show sample input data (actual format, not "Input")
- Show sample output data (actual format, not "Output")
- Show intermediate states if relevant

The key principle: **show what things actually look like**, not just what they're called.

---

## Multi-Zoom Architecture

Comprehensive diagrams operate at multiple zoom levels simultaneously. Think of it like a map that shows both the country borders AND the street names.

### Level 1: Summary Flow
A simplified overview showing the full pipeline or process at a glance. Often placed at the top or bottom of the diagram.

*Example*: `Input → Processing → Output` or `Client → Server → Database`

### Level 2: Section Boundaries
Labeled regions that group related components. These create visual "rooms" that help viewers understand what belongs together.

*Example*: Grouping by responsibility (Backend / Frontend), by phase (Setup / Execution / Cleanup), or by team (User / System / External)

### Level 3: Detail Inside Sections
Evidence artifacts, code snippets, and concrete examples within each section. This is where the educational value lives.

*Example*: Inside a "Backend" section, you might show the actual API response format, not just a box labeled "API Response"

**For comprehensive diagrams, aim to include all three levels.** The summary gives context, the sections organize, and the details teach.

### Bad vs Good

| Bad (Displaying) | Good (Arguing) |
|------------------|----------------|
| 5 equal boxes with labels | Each concept has a shape that mirrors its behavior |
| Card grid layout | Visual structure matches conceptual structure |
| Icons decorating text | Shapes that ARE the meaning |
| Same container for everything | Distinct visual vocabulary per concept |
| Everything in a box | Free-floating text with selective containers |

### Simple vs Comprehensive (Know Which You Need)

| Simple Diagram | Comprehensive Diagram |
|----------------|----------------------|
| Generic labels: "Input" → "Process" → "Output" | Specific: shows what the input/output actually looks like |
| Named boxes: "API", "Database", "Client" | Named boxes + examples of actual requests/responses |
| "Events" or "Messages" label | Timeline with real event/message names from the spec |
| "UI" or "Dashboard" rectangle | Mockup showing actual UI elements and content |
| ~30 seconds to explain | ~2-3 minutes of teaching content |
| Viewer learns the structure | Viewer learns the structure AND the details |

**Simple diagrams** are fine for abstract concepts, quick overviews, or when the audience already knows the details. **Comprehensive diagrams** are needed for technical architectures, tutorials, educational content, or when you want the diagram itself to teach.

---

## Container vs. Free-Floating Text

**Not every piece of text needs a shape around it.** Default to free-floating text. Add containers only when they serve a purpose.

| Use a Container When... | Use Free-Floating Text When... |
|------------------------|-------------------------------|
| It's the focal point of a section | It's a label or description |
| It needs visual grouping with other elements | It's supporting detail or metadata |
| Arrows need to connect to it | It describes something nearby |
| The shape itself carries meaning (decision diamond, etc.) | Typography alone creates sufficient hierarchy |
| It represents a distinct "thing" in the system | It's a section title, subtitle, or annotation |

**Typography as hierarchy**: Use font size, weight, and color to create visual hierarchy without boxes. A 28px title doesn't need a rectangle around it.

**The container test**: For each boxed element, ask "Would this work as free-floating text?" If yes, remove the container.

---

## Design Process (Do This BEFORE Generating JSON)

### Step 0: Assess Depth Required
Before anything else, determine if this needs to be:
- **Simple/Conceptual**: Abstract shapes, labels, relationships (mental models, philosophies)
- **Comprehensive/Technical**: Concrete examples, code snippets, real data (systems, architectures, tutorials)

**If comprehensive**: Do research first. Look up actual specs, formats, event names, APIs.

### Step 1: Understand Deeply
Read the content. For each concept, ask:
- What does this concept **DO**? (not what IS it)
- What relationships exist between concepts?
- What's the core transformation or flow?
- **What would someone need to SEE to understand this?** (not just read about)

### Step 2: Map Concepts to Patterns
For each concept, find the visual pattern that mirrors its behavior:

| If the concept... | Use this pattern |
|-------------------|------------------|
| Spawns multiple outputs | **Fan-out** (radial arrows from center) |
| Combines inputs into one | **Convergence** (funnel, arrows merging) |
| Has hierarchy/nesting | **Tree** (lines + free-floating text) |
| Is a sequence of steps | **Timeline** (line + dots + free-floating labels) |
| Loops or improves continuously | **Spiral/Cycle** (arrow returning to start) |
| Is an abstract state or context | **Cloud** (overlapping ellipses) |
| Transforms input to output | **Assembly line** (before → process → after) |
| Compares two things | **Side-by-side** (parallel with contrast) |
| Separates into phases | **Gap/Break** (visual separation between sections) |

### Step 3: Ensure Variety
For multi-concept diagrams: **each major concept must use a different visual pattern**. No uniform cards or grids.

### Step 4: Sketch the Flow
Before JSON, mentally trace how the eye moves through the diagram. There should be a clear visual story.

### Step 5: Generate JSON
Only now create the Excalidraw elements. **See below for how to handle large diagrams.**

For hand-drawn CJK, social-media, or concept-rich whiteboards, icon planning is **mandatory**. Before generating JSON, read `references/handdrawn-icon-workflow.md`, map each major concept to icon search terms, search the installed catalogs, and insert a native editable icon whenever a semantic match exists. Do not redraw a common metaphor already available in the library. A cover needs at least one semantic hero icon; each content page should use 1–3 semantic icons. Use an icon-free composition only when it is intentionally typographic and record the reason.

### Step 6: Render & Validate (MANDATORY)
After generating the JSON, you MUST run the render-view-fix loop until the diagram looks right. This is not optional — see the **Render & Validate** section below for the full process.

---

## Large / Comprehensive Diagram Strategy

**For comprehensive or technical diagrams, you MUST build the JSON one section at a time.** Do NOT attempt to generate the entire file in a single pass. This is a hard constraint — Claude Code has a ~32,000 token output limit per response, and a comprehensive diagram easily exceeds that in one shot. Even if it didn't, generating everything at once leads to worse quality. Section-by-section is better in every way.

### The Section-by-Section Workflow

**Phase 1: Build each section**

1. **Create the base file** with the JSON wrapper (`type`, `version`, `appState`, `files`) and the first section of elements.
2. **Add one section per edit.** Each section gets its own dedicated pass — take your time with it. Think carefully about the layout, spacing, and how this section connects to what's already there.
3. **Use descriptive string IDs** (e.g., `"trigger_rect"`, `"arrow_fan_left"`) so cross-section references are readable.
4. **Namespace seeds by section** (e.g., section 1 uses 100xxx, section 2 uses 200xxx) to avoid collisions.
5. **Update cross-section bindings** as you go. When a new section's element needs to bind to an element from a previous section (e.g., an arrow connecting sections), edit the earlier element's `boundElements` array at the same time.

**Phase 2: Review the whole**

After all sections are in place, read through the complete JSON and check:
- Are cross-section arrows bound correctly on both ends?
- Is the overall spacing balanced, or are some sections cramped while others have too much whitespace?
- Do IDs and bindings all reference elements that actually exist?

Fix any alignment or binding issues before rendering.

**Phase 3: Render & validate**

Now run the render-view-fix loop from the Render & Validate section. This is where you'll catch visual issues that aren't obvious from JSON — overlaps, clipping, imbalanced composition.

### Section Boundaries

Plan your sections around natural visual groupings from the diagram plan. A typical large diagram might split into:

- **Section 1**: Entry point / trigger
- **Section 2**: First decision or routing
- **Section 3**: Main content (hero section — may be the largest single section)
- **Section 4-N**: Remaining phases, outputs, etc.

Each section should be independently understandable: its elements, internal arrows, and any cross-references to adjacent sections.

### What NOT to Do

- **Don't generate the entire diagram in one response.** You will hit the output token limit and produce truncated, broken JSON. Even if the diagram is small enough to fit, splitting into sections produces better results.
- **Don't use a coding agent** to generate the JSON. The agent won't have sufficient context about the skill's rules, and the coordination overhead negates any benefit.
- **Don't write a Python generator for the whole diagram.** Hand-craft the visual argument section by section. The bundled deterministic scripts are allowed only for library splitting, icon search/insertion, style normalization, validation, rendering, and upload.

---

## Visual Pattern Library

### Fan-Out (One-to-Many)
Central element with arrows radiating to multiple targets. Use for: sources, PRDs, root causes, central hubs.
```
        ○
       ↗
  □ → ○
       ↘
        ○
```

### Convergence (Many-to-One)
Multiple inputs merging through arrows to single output. Use for: aggregation, funnels, synthesis.
```
  ○ ↘
  ○ → □
  ○ ↗
```

### Tree (Hierarchy)
Parent-child branching with connecting lines and free-floating text (no boxes needed). Use for: file systems, org charts, taxonomies.
```
  label
  ├── label
  │   ├── label
  │   └── label
  └── label
```
Use `line` elements for the trunk and branches, free-floating text for labels.

### Spiral/Cycle (Continuous Loop)
Elements in sequence with arrow returning to start. Use for: feedback loops, iterative processes, evolution.
```
  □ → □
  ↑     ↓
  □ ← □
```

### Cloud (Abstract State)
Overlapping ellipses with varied sizes. Use for: context, memory, conversations, mental states.

### Assembly Line (Transformation)
Input → Process Box → Output with clear before/after. Use for: transformations, processing, conversion.
```
  ○○○ → [PROCESS] → □□□
  chaos              order
```

### Side-by-Side (Comparison)
Two parallel structures with visual contrast. Use for: before/after, options, trade-offs.

### Gap/Break (Separation)
Visual whitespace or barrier between sections. Use for: phase changes, context resets, boundaries.

### Lines as Structure
Use lines (type: `line`, not arrows) as primary structural elements instead of boxes:
- **Timelines**: Vertical or horizontal line with small dots (10-20px ellipses) at intervals, free-floating labels beside each dot
- **Tree structures**: Vertical trunk line + horizontal branch lines, with free-floating text labels (no boxes needed)
- **Dividers**: Thin dashed lines to separate sections
- **Flow spines**: A central line that elements relate to, rather than connecting boxes

```
Timeline:           Tree:
  ●─── Label 1        │
  │                   ├── item
  ●─── Label 2        │   ├── sub
  │                   │   └── sub
  ●─── Label 3        └── item
```

Lines + free-floating text often creates a cleaner result than boxes + contained text.

---

## Shape Meaning

Choose shape based on what it represents—or use no shape at all:

| Concept Type | Shape | Why |
|--------------|-------|-----|
| Labels, descriptions, details | **none** (free-floating text) | Typography creates hierarchy |
| Section titles, annotations | **none** (free-floating text) | Font size/weight is enough |
| Markers on a timeline | small `ellipse` (10-20px) | Visual anchor, not container |
| Start, trigger, input | `ellipse` | Soft, origin-like |
| End, output, result | `ellipse` | Completion, destination |
| Decision, condition | `diamond` | Classic decision symbol |
| Process, action, step | `rectangle` | Contained action |
| Abstract state, context | overlapping `ellipse` | Fuzzy, cloud-like |
| Hierarchy node | lines + text (no boxes) | Structure through lines |

**Rule**: Default to no container. Add shapes only when they carry meaning. Aim for <30% of text elements to be inside containers.

---

## Color as Meaning

Colors encode information, not decoration. Every color choice should come from `references/color-palette.md` — the semantic shape colors, text hierarchy colors, and evidence artifact colors are all defined there.

**Key principles:**
- Each semantic purpose (start, end, decision, AI, error, etc.) has a specific fill/stroke pair
- Free-floating text uses color for hierarchy (titles, subtitles, details — each at a different level)
- Evidence artifacts (code snippets, JSON examples) use their own dark background + colored text scheme
- Always pair a darker stroke with a lighter fill for contrast

**Do not invent new colors.** If a concept doesn't fit an existing semantic category, use Primary/Neutral or Secondary.

---

## Modern Aesthetics

For clean, professional diagrams:

### Roughness
- `roughness: 0` — Clean, crisp edges. Use for modern/technical diagrams.
- `roughness: 1` — Hand-drawn, organic feel. Use for brainstorming/informal diagrams.

**Default to 0** for most professional use cases.

### Stroke Width
- `strokeWidth: 1` — Thin, elegant. Good for lines, dividers, subtle connections.
- `strokeWidth: 2` — Standard. Good for shapes and primary arrows.
- `strokeWidth: 3` — Bold. Use sparingly for emphasis (main flow line, key connections).

### Opacity
**Always use `opacity: 100` for all elements.** Use color, size, and stroke width to create hierarchy instead of transparency.

### Small Markers Instead of Shapes
Instead of full shapes, use small dots (10-20px ellipses) as:
- Timeline markers
- Bullet points
- Connection nodes
- Visual anchors for free-floating text

---

## Layout Principles

### Hierarchy Through Scale
- **Hero**: 300×150 - visual anchor, most important
- **Primary**: 180×90
- **Secondary**: 120×60
- **Small**: 60×40

### Whitespace = Importance
The most important element has the most empty space around it (200px+).

### Flow Direction
Guide the eye: typically left→right or top→bottom for sequences, radial for hub-and-spoke.

### Connections Required
Position alone doesn't show relationships. If A relates to B, there must be an arrow.

---

## Text Rules

**CRITICAL**: The JSON `text` property contains ONLY readable words.

```json
{
  "id": "myElement1",
  "text": "Start",
  "originalText": "Start"
}
```

Settings: `fontSize: 16`, `textAlign: "center"`, `verticalAlign: "middle"`. Use `fontFamily: 5` for hand-drawn or CJK whiteboards; use `fontFamily: 3` for clean technical diagrams.

## Native Icon Libraries

For hand-drawn, CJK, social-media, and concept-rich whiteboards, native icon search and insertion are required—not optional decoration. Icons must replace or reinforce major concepts, remain editable, and inherit the scene's hand-drawn treatment.

Before drawing:
1. Create a compact icon plan: `concept → search terms → chosen slug → placement`.
2. Search the installed catalogs for every major concrete concept.
3. Insert the matching native icon before hand-drawing a substitute.
4. If no icon is used for a major concept, record why the available matches were unsuitable.

Coverage target: at least one semantic hero icon on a cover and 1–3 semantic icons on each content page. More icons are not automatically better; every icon must carry meaning.

```powershell
python scripts/search_icons.py "search 检索"
python scripts/add_icon_to_diagram.py <diagram.excalidraw> search 120 260 --width 80
python scripts/apply_style_preset.py <diagram.excalidraw>
python scripts/validate_scene.py <diagram.excalidraw> --aspect 3:4
```

Read `references/handdrawn-icon-workflow.md` for semantic search, installing `.excalidrawlib` assets, the 3:4 composition contract, and icon QA. The bundled `libraries/core-handdrawn/` catalog is the offline starter set; add licensed libraries in separate folders rather than mixing families.

---

## JSON Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [...],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": 20
  },
  "files": {}
}
```

## Element Templates

See `references/element-templates.md` for copy-paste JSON templates for each element type (text, line, dot, rectangle, arrow). Pull colors from `references/color-palette.md` based on each element's semantic purpose.

---

## Render & Validate (MANDATORY)

You cannot judge a diagram from JSON alone. After generating or editing the Excalidraw JSON, you MUST render it to PNG, view the image, and fix what you see — in a loop until it's right. This is a core part of the workflow, not a final check.

### How to Render

```bash
cd C:\Users\jiaji\Documents\github-project\my-life-system-skills\excalidraw-diagram\references && uv run python render_excalidraw.py <path-to-file.excalidraw>
```

This outputs a PNG next to the `.excalidraw` file. Then use the **Read tool** on the PNG to actually view it.

### The Loop

After generating the initial JSON, run this cycle:

**1. Render & View** — Run the render script, then Read the PNG.

**2. Audit against your original vision** — Before looking for bugs, compare the rendered result to what you designed in Steps 1-4. Ask:
- Does the visual structure match the conceptual structure you planned?
- Does each section use the pattern you intended (fan-out, convergence, timeline, etc.)?
- Does the eye flow through the diagram in the order you designed?
- Is the visual hierarchy correct — hero elements dominant, supporting elements smaller?
- For technical diagrams: are the evidence artifacts (code snippets, data examples) readable and properly placed?

**3. Check for visual defects:**
- Text clipped by or overflowing its container
- Text or shapes overlapping other elements
- Arrows crossing through elements instead of routing around them
- Arrows landing on the wrong element or pointing into empty space
- Labels floating ambiguously (not clearly anchored to what they describe)
- Uneven spacing between elements that should be evenly spaced
- Sections with too much whitespace next to sections that are too cramped
- Text too small to read at the rendered size
- Overall composition feels lopsided or unbalanced

**4. Fix** — Edit the JSON to address everything you found. Common fixes:
- Widen containers when text is clipped
- Adjust `x`/`y` coordinates to fix spacing and alignment
- Add intermediate waypoints to arrow `points` arrays to route around elements
- Reposition labels closer to the element they describe
- Resize elements to rebalance visual weight across sections

**5. Re-render & re-view** — Run the render script again and Read the new PNG.

**6. Repeat** — Keep cycling until the diagram passes both the vision check (Step 2) and the defect check (Step 3). Typically takes 2-4 iterations. Don't stop after one pass just because there are no critical bugs — if the composition could be better, improve it.

### When to Stop

The loop is done when:
- The rendered diagram matches the conceptual design from your planning steps
- No text is clipped, overlapping, or unreadable
- Arrows route cleanly and connect to the right elements
- Spacing is consistent and the composition is balanced
- You'd be comfortable showing it to someone without caveats

### First-Time Setup
If the render script hasn't been set up yet:
```bash
cd C:\Users\jiaji\Documents\github-project\my-life-system-skills\excalidraw-diagram\references
uv sync
uv run playwright install chromium
```

### Optional: Upload for a Shareable Link

When the user asks for a public Excalidraw link, upload the validated `.excalidraw` file after the render-view-fix loop succeeds:

```bash
cd C:\Users\jiaji\Documents\github-project\my-life-system-skills\excalidraw-diagram
uv run --project references python scripts/upload.py <path-to-file.excalidraw>
```

The upload is encrypted client-side before it is sent to Excalidraw's public JSON endpoint. Return the printed `https://excalidraw.com/#json=...` URL to the user.

### Post-Render: Auto-Open with Loaded File (MANDATORY)

After the render-view-fix loop is complete and the diagram passes validation, **automatically open the file in Excalidraw so the user can see the final result**. Do not ask — just open. Trying only the bare excalidraw.com URL is NOT acceptable; the file must be loaded.

Walk the modes below in order; use the first one that succeeds.

#### Mode 0: Local Excalidraw Repo (preferred — editable, hot-reload, no network)

If the user has the `excalidraw` monorepo cloned locally, use it. Detection:

```powershell
$repo = $env:EXCALIDRAW_REPO
if (-not $repo) { $repo = "C:\Users\jiaji\Documents\github-project\excalidraw" }
$appDir = Join-Path $repo "excalidraw-app"
if (Test-Path $appDir) {
  # repo detected
}
```

Why this is best:
- Excalidraw supports a hash route `#url=<encoded-url>` that auto-fetches + parses any `.excalidraw` file. See `excalidraw-app/App.tsx` (~line 224–319) — `externalUrlMatch` handles it.
- The full Excalidraw UI works (toolbar, library, save/export, theme).
- Edits can be saved back to the file. The user can keep editing in a real Excalidraw window.
- No CDN, no Python http-server, no Electron app — just `vite` and a browser tab.

Steps:

1. **Copy the .excalidraw file into the repo's `public/` directory** so Vite will serve it at a stable URL:

```powershell
$src = "<absolute-path-to-.excalidraw-file>"
$dst = Join-Path $repo "public" (Split-Path $src -Leaf)
Copy-Item -Path $src -Destination $dst -Force
```

2. **Start (or reuse) the Vite dev server** on port 3000 in a hidden window:

```powershell
$port = 3000
$running = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $running) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "npx"
  $psi.Arguments = "vite --port $port --no-open"
  $psi.WorkingDirectory = $appDir
  $psi.UseShellExecute = $true
  $psi.WindowStyle = "Hidden"
  [System.Diagnostics.Process]::Start($psi) | Out-Null

  # wait for vite to listen
  for ($i=1; $i -le 60; $i++) {
    Start-Sleep -Seconds 1
    if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) { break }
  }
}
```

Cold start usually takes 3-5 s (with `node_modules` already installed). Yarn workspaces are recommended; if `vite` isn't on PATH, use `npx` (as above) or run from `$appDir`.

3. **Open the browser with the hash route** — the URL fragment tells Excalidraw to fetch the file and load it on startup. Excalidraw strips the hash once consumed.

```powershell
$fileName = Split-Path $src -Leaf
$url = "http://localhost:$port/#url=/$fileName"
Start-Process $url
```

4. **Tell the user the controls**:
   - The diagram is now editable. Use the toolbar to modify.
   - To save back, use Excalidraw's `Ctrl+S` / Export — the file in `public/` is the live copy. If the user wants to keep their edits in the original location, copy the saved file back to the original `<src>`.
   - Vite stays running in the background; no need to restart for the next diagram (just re-open with a new `#url=`).

If `$repo` is not set and the default path doesn't exist, fall through to Mode 1.

#### Mode 1: Excalidraw Desktop App (instant, but read-mostly)

Detect in this order:

```powershell
$excalidraw = (Get-Command excalidraw -ErrorAction SilentlyContinue).Source
if (-not $excalidraw) {
  $excalidraw = @(
    "$env:LOCALAPPDATA\Programs\excalidraw\Excalidraw.exe",
    "$env:LOCALAPPDATA\excalidraw\Excalidraw.exe",
    "${env:ProgramFiles}\Excalidraw\Excalidraw.exe"
  ) | Where-Object { Test-Path $_ } | Select-Object -First 1
}
```

If found, open with the file:
```powershell
Start-Process $excalidraw -ArgumentList "`"<absolute-path-to-.excalidraw-file>`""
```

If not found, offer to install (the user can decline):
```powershell
winget install --id Excalidraw.Excalidraw -e --accept-source-agreements --accept-package-agreements
```

If the user accepts and the install succeeds, re-run the detection block above and proceed.

#### Mode 2: Local Launcher HTML + HTTP Server (fallback, no install)

If neither the repo nor the desktop app is available, write a `launcher.html` next to the .excalidraw file that auto-fetches and renders it via the Excalidraw CDN, then serve it on a local port and open the browser.

**Step 1: write launcher.html** (one-line substitute the filename)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Excalidraw Launcher</title>
  <style>html,body,#app{height:100%;margin:0;padding:0;font-family:system-ui}</style>
</head>
<body>
  <div id="app"></div>
  <div id="loading">Loading Excalidraw…</div>
  <div id="err"></div>
  <script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18",
      "react-dom": "https://esm.sh/react-dom@18",
      "react-dom/client": "https://esm.sh/react-dom@18/client",
      "react/jsx-runtime": "https://esm.sh/react@18/jsx-runtime"
    }
  }
  </script>
  <script type="module">
    import { Excalidraw } from "https://esm.sh/@excalidraw/excalidraw@0.18.0?external=react,react-dom";
    import React from "https://esm.sh/react@18";
    import ReactDOM from "https://esm.sh/react-dom@18";

    const params = new URLSearchParams(location.search);
    const file = params.get("file") || "diagram.excalidraw";

    try {
      const r = await fetch(file);
      if (!r.ok) throw new Error(`HTTP ${r.status} for ${file}`);
      const initialData = await r.json();

      initialData.appState = {
        ...(initialData.appState || {}),
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 0.8 },
      };

      document.getElementById("loading").remove();

      let excalidrawAPI = null;
      const onAPIAvailable = (api) => {
        excalidrawAPI = api;
        const fit = () => {
          if (!excalidrawAPI) return;
          const els = excalidrawAPI.getSceneElements();
          if (els && els.length) {
            excalidrawAPI.scrollToContent(els, {
              fitToViewport: true,
              viewportZoomFactor: 0.85,
            });
          }
        };
        setTimeout(fit, 100);
        setTimeout(fit, 600);
        setTimeout(fit, 1500);
      };

      ReactDOM.createRoot(document.getElementById("app")).render(
        React.createElement(Excalidraw, {
          initialData,
          autoFocus: true,
          excalidrawAPI: onAPIAvailable,
        })
      );
    } catch (e) {
      document.getElementById("loading").remove();
      document.getElementById("err").textContent =
        "Excalidraw load failed: " + e.message +
        "\n\nMake sure the local server is still running and the .excalidraw file exists in the same directory as this HTML.";
      console.error(e);
    }
  </script>
</body>
</html>
```

**Step 2: start a hidden HTTP server in the .excalidraw's directory**

```powershell
$filePath = "<absolute-path-to-.excalidraw-file>"
$dir = Split-Path $filePath -Parent
$port = 8765

# pick the first python available: python / py
$python = $null
if (Get-Command python -ErrorAction SilentlyContinue) { $python = (Get-Command python).Source }
elseif (Get-Command py -ErrorAction SilentlyContinue) { $python = (Get-Command py).Source }

if ($python) {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $python
  $psi.Arguments = "-m http.server $port"
  $psi.WorkingDirectory = $dir
  $psi.UseShellExecute = $true
  $psi.WindowStyle = "Hidden"
  [System.Diagnostics.Process]::Start($psi) | Out-Null
} else {
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = "npx"
  $psi.Arguments = "-y http-server -p $port -c-1"
  $psi.WorkingDirectory = $dir
  $psi.UseShellExecute = $true
  $psi.WindowStyle = "Hidden"
  [System.Diagnostics.Process]::Start($psi) | Out-Null
}

Start-Sleep -Seconds 2
```

**Step 3: open the browser**

```powershell
$fileName = Split-Path $filePath -Leaf
$url = "http://localhost:$port/launcher.html?file=$([uri]::EscapeDataString($fileName))"
Start-Process $url
```

If the user generates a new diagram, the launcher.html is reusable (the URL is stable); the server stays up across the session.

#### Mode 3: excalidraw.com (last resort — only if both Python and Node.js are missing)

Open `https://excalidraw.com/` and **explicitly tell the user** to drag the .excalidraw file into the page. This is suboptimal and should only be used when all other modes are unavailable.

#### Why this order

- **Mode 0** is the richest: real Excalidraw UI, editable, saveable, hot-reload, no network needed once Vite is up. Best for iterating on diagrams.
- **Mode 1** opens a real desktop window, no server, no browser tab — fast but read-mostly.
- **Mode 2** works without any install or repo, but adds a CDN dependency (esm.sh) and a hidden server.
- **Mode 3** is a degraded experience (manual drag). Only fall back if absolutely necessary.

If the user has installed the desktop app or pointed `EXCALIDRAW_REPO` at a valid path, the next invocation will automatically pick the better mode.


---

## Quality Checklist

### Depth & Evidence (Check First for Technical Diagrams)
1. **Research done**: Did you look up actual specs, formats, event names?
2. **Evidence artifacts**: Are there code snippets, JSON examples, or real data?
3. **Multi-zoom**: Does it have summary flow + section boundaries + detail?
4. **Concrete over abstract**: Real content shown, not just labeled boxes?
5. **Educational value**: Could someone learn something concrete from this?

### Conceptual
6. **Isomorphism**: Does each visual structure mirror its concept's behavior?
7. **Argument**: Does the diagram SHOW something text alone couldn't?
8. **Variety**: Does each major concept use a different visual pattern?
9. **No uniform containers**: Avoided card grids and equal boxes?

### Native Icon Coverage (Mandatory for Hand-Drawn / Social Whiteboards)
- **Icon plan completed**: Did every major concrete concept get search terms and a placement decision before JSON generation?
- **Catalog searched**: Were installed native libraries searched before drawing common metaphors by hand?
- **Coverage met**: Does the cover have at least one semantic hero icon, and each content page 1–3 semantic icons?
- **Semantic, not decorative**: Does each icon replace or reinforce meaning rather than merely fill whitespace?
- **Consistent family**: Do icons share a library family, scale set, stroke weight, and roughness?
- **Skip reason recorded**: If a suitable match was not used, is the reason explicit?

### Container Discipline
10. **Minimal containers**: Could any boxed element work as free-floating text instead?
11. **Lines as structure**: Are tree/timeline patterns using lines + text rather than boxes?
12. **Typography hierarchy**: Are font size and color creating visual hierarchy (reducing need for boxes)?

### Structural
13. **Connections**: Every relationship has an arrow or line
14. **Flow**: Clear visual path for the eye to follow
15. **Hierarchy**: Important elements are larger/more isolated

### Technical
16. **Text clean**: `text` contains only readable words
17. **Font**: `fontFamily: 5` for hand-drawn/CJK whiteboards; `fontFamily: 3` for clean technical diagrams
18. **Roughness**: `roughness: 1` for hand-drawn whiteboards; `roughness: 0` for clean/modern diagrams
19. **Opacity**: `opacity: 100` for all elements (no transparency)
20. **Container ratio**: <30% of text elements should be inside containers

### Visual Validation (Render Required)
21. **Rendered to PNG**: Diagram has been rendered and visually inspected
22. **No text overflow**: All text fits within its container
23. **No overlapping elements**: Shapes and text don't overlap unintentionally
24. **Even spacing**: Similar elements have consistent spacing
25. **Arrows land correctly**: Arrows connect to intended elements without crossing others
26. **Readable at export size**: Text is legible in the rendered PNG
27. **Balanced composition**: No large empty voids or overcrowded regions
