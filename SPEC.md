# Design and Functional Specification — DISPERSE

## 1. Overview
**DISPERSE** is a single-page web application (**SPA**) for creating and editing **Diagrams as Code**, inspired by **Niolesk** and powered by the **Kroki** API (`https://kroki.io` by default, or a self-hosted Kroki backend) as its rendering engine.

### Core Principles
- **Technology**: HTML5, CSS3, and Vanilla JavaScript (ES6+), with no UI frameworks, relying only on lightweight libraries for code editing, zoom/pan, iconography, and compression. All source code, comments, documentation, and UI text are in **English** (`lang="en"`).
- **Zero-Text / Icon-First UI**: The interface contains no static text other than the `DISPERSE` brand title and footer credits (along with technical engine/format dropdown values and generated URLs/snippets). All actions and controls are represented using **vector icons (SVG)**.
- **Stateless URL Sharing**: Any diagram can be shared via a self-contained URL carrying the compressed and encoded source code in Kroki's standard format.

---

## 2. Color System (Tetradic Scheme in CSS `oklch`)

### 2.1. Base Color and Picker
- **Default preferred color**: `rgb(0, 128, 192)` (`#0080c0`).
- **Control**: A circular button in the header displays the current preferred color and opens the native system color picker (`<input type="color">`) when clicked.
- **Persistence**: Both the selected color and theme mode (light/dark) are persisted in `localStorage`.

### 2.2. Tetradic Harmony (30° Double Complementary)
From the user-selected preferred color, its **OKLCH** components (`L` lightness, `C` chroma, `H` hue angle in degrees) are computed via `sRGB → Oklab → OKLCH` conversion to define 4 harmonic hues:

| Role | Hue Angle ($H$) | Description |
| :--- | :--- | :--- |
| **Primary ($P$)** | $H_P = H_{\text{base}}$ | Brand color (`DISPERSE`), primary actions, focus rings, and active accents. |
| **Secondary ($S$)** | $H_S = (H_P + 30^\circ) \bmod 360^\circ$ | Supporting elements, secondary controls, and subtle highlights. |
| **Tertiary ($T$)** | $H_T = (H_P + 180^\circ) \bmod 360^\circ$ | Complementary contrast to primary (indicators, badges, snap feedback). |
| **Quaternary ($Q$)** | $H_Q = (H_S + 180^\circ) \bmod 360^\circ = (H_P + 210^\circ) \bmod 360^\circ$ | Complementary contrast to secondary (supporting accents). |

Additionally, the brand icon (`favicon.svg` and `#brand-logo`) dynamically updates its 4 rays and nodes in real time with the active `--color-primary`, `--color-secondary`, `--color-tertiary`, and `--color-quaternary` values.

### 2.3. Light and Dark Mode Adaptation
The system generates dynamic CSS custom properties (`--color-primary`, `--color-secondary`, `--color-tertiary`, `--color-quaternary`, along with surface, border, and text variants) by adjusting $L$ and $C$ according to the active theme:

- **Light Mode (`[data-theme="light"]`)**:
  - Main backgrounds: High lightness ($L \approx 0.96 - 0.99$) and low chroma ($C \approx 0.01 - 0.02$) subtly tinted with $H_P$ / $H_S$.
  - Accent colors ($P, S, T, Q$): Medium-low lightness ($L \approx 0.48 - 0.58$) and vivid chroma ($C \approx 0.14 - 0.18$) to ensure contrast against light surfaces.
  - Main text: $L \approx 0.20$, $C \approx 0.02$, $H = H_P$.
- **Dark Mode (`[data-theme="dark"]`)**:
  - Main backgrounds: Low lightness ($L \approx 0.15 - 0.22$) and low chroma ($C \approx 0.02 - 0.03$) tinted with $H_P$ / $H_S$.
  - Accent colors ($P, S, T, Q$): Medium-high lightness ($L \approx 0.68 - 0.78$) and balanced chroma ($C \approx 0.14 - 0.18$) to stand out against dark surfaces.
  - Main text: $L \approx 0.92$, $C \approx 0.02$, $H = H_P$.
  - **Diagram adaptation in Dark Mode**: `filter: invert(0.92) hue-rotate(180deg)` is applied to rendered SVG/PNG diagrams in dark mode so black strokes, arrows, and text on transparent backgrounds become bright and legible while preserving the original hue of colored nodes.

---

## 3. Typography & Font System
- **UI Typography**: **IBM Plex Sans** loaded via Google Fonts with system fallback (`"IBM Plex Sans", system-ui, sans-serif`), assigned to `--font-family`.
- **Code & Monospace Typography**: **IBM Plex Mono** loaded via Google Fonts with system fallback (`"IBM Plex Mono", monospace`), assigned to `--font-family-mono`. Applied across the Ace editor (`.ace_editor`), snippet output text fields (`input[type="text"]`), and error details (`.viewer-error-detail`).
- Preconnected to Google Fonts CDN (`fonts.googleapis.com` and `fonts.gstatic.com`) with `display=swap` to avoid cross-platform layout shifts and inconsistent system font rendering.

---

## 4. Interface Layout

The application occupies `100vw x 100dvh` (`100vh` fallback) with no global page scroll (`overflow: hidden`), structured into 3 horizontal bands and **responsive across all screen sizes**:

```
+-----------------------------------------------------------------------+
| DISPERSE  [ ↻ | Engine v | 📖 | Layout v | Theme v | Format v ] (☀/☾)(●) |  <- Header
+---------------------------+-------------------------------------------+
|                           |                                           |
|                           |                                           |
|        CODE EDITOR        |            VIEWER (SVG / PNG)             |
|         (~38.2%)          |                 (~61.8%)                  |  <- Main Area
|                  [+][-][=]|                                    [+][-] |
|                           |                                           |
+---------------------------+-------------------------------------------+
| [🖼] [🔗] [M↓] [</>]  https://kroki.io/...                        [📋] |  <- Publishing Footer
| [✏️] [🔗] [M↓] [</>]  https://.../disperse/#...                   [📋] |
| [💾] [📂] [💾] [📝] [⚡]  No local file — Open (Ctrl+O)...             |
+-----------------------------------------------------------------------+
```

### 4.1. Top Bar (Header)
1. **Left**:
   - Brand link (`#brand-link`) composed of the `favicon.svg` logo, the uppercase **`DISPERSE`** title in `--color-primary`, and a chain link icon (`link`), with caption `"Copy current page link (Alt+L)"`. Its `href` is always synchronized with the full current page URL (`window.location.href` including the diagram state). Clicking it (or pressing `Alt + L`) does not reload or reset the editor; instead, it automatically copies the current URL to the clipboard with visual confirmation (`✓`).
2. **Center (Unified Segmented Toolbar, in order)**:
   - Contained within a single pill-shaped segmented bar (`.header-center`, `34px` uniform height with vertical dividers):
     1. **Refresh Button (`#refresh-btn`)**: Refresh icon (`refresh-cw`) with caption `"Refresh preview (Ctrl+R)"`.
        - **Keyboard shortcut**: `Ctrl + R` (or `Cmd + R`), intercepting the browser event (`e.preventDefault()`) to refresh the diagram without reloading the page.
     2. **Kroki Engine Dropdown (`#engine-select`)**: Lists all 28 engines supported by Kroki (32 entries in total, with featured languages and 5 C4-PlantUML diagram types at the top, followed by a visual separator and the remaining engines in alphabetical order) with caption `"Diagram language"`. Switching engines updates:
        - The Kroki rendering endpoint (`c4plantuml-*` variants map to the `c4plantuml` Kroki endpoint).
        - The editor's syntax highlighting mode.
        - The **example code**: when the editor is empty or still displays the previous engine's stock template, switching engines loads the new engine's default example from `examples/{engine}.txt`; otherwise, user edits are preserved.
        - The documentation link (`#docs-btn`) `href` to point to the active language's official documentation.
     3. **Language Documentation Link (`#docs-btn`)**: Anchor with an open-book icon (`book-open`) and caption `"Language documentation"`, opening the selected language's official documentation in a new tab (`target="_blank"`).
     4. **Layout Engine Dropdown (`#layout-select`)**: Selectable layout engines for D2 (`dagre`, `elk`, `tala`), with caption `"Layout engine (D2)"`. Enabled only when `d2` is selected and disabled for all other engines.
     5. **Diagram Theme Dropdown (`#theme-select`)**: Selectable themes for D2 (`default`, `neutral-gray`, `flagship-terrastruct`, `cool-classics`, `mixed-berry-blue`, `grape-soda`, `aubergine`, `colorblind-clear`, `vanilla-nitro-cola`, `orange-creamsicle`, `shirley-temple`, `earth-tones`, `everglade-green`, `buttered-toast`, `dark-mauve`, `dark-flagship-terrastruct`, `terminal`, `terminal-grayscale`, `origami`, `c4`), with caption `"Diagram theme (D2)"`. Enabled only when `d2` is selected and disabled for all other engines.
     6. **Output Format Dropdown (`#format-select`)**: `svg` (default) and `png`, with caption `"Output format"`.
3. **Right (Visual Preferences)**:
   - **Light / Dark Mode Button (`#theme-btn`)**: Circular button with a sun/moon icon and caption `"Toggle light/dark theme (Alt+T)"`.
   - **Preferred Color Button (`#color-swatch`)**: Circular button **of the exact same diameter** as the theme button, filled with the current preferred color (`rgb(0, 128, 192)` by default) and caption `"Preferred theme color"`. Clicking it opens the native `<input type="color">` (which has `tabindex="-1"` so keyboard focus stays on `#color-swatch`).
4. **Captions / Tooltips (`[data-tooltip]`)**:
   - All icon buttons and controls across the header, splitter, editor/viewer toolbars, and publishing footer display instant hover/focus captions indicating their action and keyboard shortcut where applicable (e.g., `Refresh preview (Ctrl+R)`, `Download diagram (Alt+D)`, `Save local file (Ctrl+S)`).

### 4.2. Main Area (Editor + Preview)
- Occupies all available vertical space between header and footer (`flex: 1`).
- **Golden Ratio by default ($\varphi \approx 1.618$)**:
  - **Left Panel (Editor)**: $38.2\%$ of total width ($1 - 1/\varphi$) for text-first engines, and **collapsed ($0\%$) by default** when a graphical WYSIWYG engine (`excalidraw`) is active.
  - **Right Panel (Preview / WYSIWYG Editor)**: $61.8\%$ of total width ($1/\varphi$) for text-first engines, and **$100\%$ by default** when a graphical WYSIWYG engine is active.
- **Resizable Splitter (`#splitter`)**:
  - Draggable bar via mouse/touch (`pointerdown` / `pointermove` with `setPointerCapture`) to resize both panels freely across the full range (`0%` - `100%`), allowing complete collapse of the editor or preview panel.
  - **Automatic WYSIWYG Collapse & Restore**: Selecting a graphical WYSIWYG engine (`Excalidraw (Editor)`) or opening an `#excalidraw/...` URL automatically collapses the code editor panel to `0%` so the visual canvas occupies the entire workspace. Users can expand the code editor at any time (via dragging `#splitter`, double-clicking it, or pressing `Alt+2` / `Alt+Enter`) to inspect or edit the live synchronized code. Switching back to a text-based engine automatically restores the `38.2%` split.
  - **Magnetic Snap**: When dragging near the default golden ratio ($38.2\% \pm 1.6\%$), the splitter snaps into place and highlights with `--color-tertiary`.
  - Double-clicking the splitter also restores the golden ratio ($38.2\% / 61.8\%$).
  - **Quick-Split Buttons**: Three quick-action buttons inside the splitter grip allow instant layout adjustments via click or keyboard shortcuts: Maximize editor (`#split-max-editor`, `Alt+1`), Reset split (`#split-reset`, `Alt+2`), and Maximize preview (`#split-max-viewer`, `Alt+3`).

#### Left Panel: Rich Code Editor
- Automatically receives focus (`editor.focus()`) on application startup for text-first engines so users can begin typing immediately.
- Line numbers, syntax highlighting matched to the diagram language, auto-closing brackets/quotes, `Tab` indentation, and code folding.
- Editor theme synchronized with the `oklch` color system and light/dark mode.
- Debounced preview update (`500ms` after typing stops) in addition to manual refresh via `Ctrl + R` or the refresh button.
- Floating action bar for text zoom and editing mode:
  - Increase font size (`#editor-font-in`, `plus` icon, `Alt+Shift++`)
  - Decrease font size (`#editor-font-out`, `minus` icon, `Alt+Shift+-`)
  - Reset font size (`#editor-font-fit`, `equal` icon, `Alt+Shift+0`)
  - Toggle Vim keybindings mode (`#editor-vim-mode`, `Alt+V`, persisted in `localStorage` with an animated glider icon when active)

#### Right Panel: Diagram Viewer (SVG / PNG) & Embedded WYSIWYG Editor
- **Standard SVG / PNG Viewer (`#viewer`)**:
  - Full **Zoom** (mouse wheel, pinch gesture, `+` / `-` buttons) and **Pan** (canvas drag) support.
  - Works uniformly for both **SVG** and **PNG** outputs.
- **Embedded WYSIWYG Visual Editor (`#wysiwyg-container`)**:
  - Activated automatically when a graphical WYSIWYG engine (`Excalidraw (Editor)`) is selected or when a `.excalidraw` file is opened/dropped.
  - Lazy-loads `@excalidraw/excalidraw` (`https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js` with `window.EXCALIDRAW_ASSET_PATH = 'https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/'`) on demand without impacting initial page load for other languages.
  - **Bidirectional Real-Time Synchronization**:
    - **Canvas → Code Editor & URLs**: Drawing or modifying elements on the Excalidraw canvas serializes the canonical `.excalidraw` JSON (`serializeAsJSON`), updates the Ace code editor, recalculates the compressed URL hash (`#excalidraw/...`) and Kroki/Disperse sharing snippets (`https://kroki.io/excalidraw/svg/...`), and triggers local file auto-save when active.
    - **Code Editor / File → Canvas**: Editing the JSON in the Ace editor, loading a URL, or opening/dropping a `.excalidraw` file restores and updates the live Excalidraw scene (`updateScene`).
  - **Payload Size Guard & Disabled Library**: Disables the Excalidraw image tool (`UIOptions.tools.image: false`), blocks pasting binary/image elements (`onPaste`), strips binary `files` during serialization so Base64 images cannot bloat the JSON or exceed Kroki's GET URL length limits, and disables Excalidraw's Library button, sidebar, and `"Add to library"` context menu item.
  - **Theme & Native Controls**: Synchronizes natively with Disperse's light/dark mode (`Alt+T`) and hides Disperse's floating `.viewer-actions` toolbar (`#viewer-container.wysiwyg-active .viewer-actions { display: none }`) so Excalidraw's own built-in canvas controls and help UI are used without visual duplication (while global shortcuts such as `Alt+Enter` and `Alt+D` remain available).
- Floating action bar (icon-only):
  - Zoom In (`#zoom-in`, `Alt++`)
  - Zoom Out (`#zoom-out`, `Alt+-`)
  - Fit / Reset View (`#zoom-fit`, `Alt+0`)
  - Maximize / Restore Preview (`#maximize-preview`, toggling `maximize`/`minimize` icons, `Alt+Enter`): Collapses the editor panel to `0%` and fits the diagram to the full preview area, or restores the previous split percentage when clicked again.
  - Download file (`#download-btn`, `.svg` or `.png`, `Alt+D`)
- Visual loading spinner during requests.
- **Explicit rendering error display (`#viewer-error`)**: On syntax errors returned by Kroki (e.g., `HTTP 400`), invalid WYSIWYG JSON, or empty source code, it never fails silently. The previous diagram is cleared and a centered overlay card is displayed. The error border and alert icon are always rendered in **red** (`--color-error`, invariant to the user's color theme), while the inner `<pre>` error message block follows the active color scheme, uses a standard text cursor (`cursor: text`), and supports independent scrolling and text selection.

### 4.3. Bottom Bar (Publishing, Sharing Snippets & Local Files)
Compact panel for obtaining ready-to-publish links, snippets, and managing local files:
1. **Target types** (three rows identified by icons):
   - **Image (image icon)**: Points directly to the configured Kroki API base URL (`https://kroki.io` by default, or `{current_origin}/kroki` when deployed with the integrated self-hosted Kroki backend):
     `{kroki_base_url}/{engine}/{format}/{compressed_payload}`
   - **Editor (pencil icon)**: Points to this Disperse instance with state in the URL hash:
     `{current_origin}/#{engine}/{format}/{compressed_payload}`
   - **Local File (hard drive icon)**: Progressive local file workflow. Includes actions to Open (`Ctrl+O`), Save (`Ctrl+S`), Save As (`Ctrl+Shift+S`), and Toggle Auto-Save (`Alt+A`). It supports dragging and dropping files directly onto the window (via `#drop-overlay`).
2. **Snippet output formats** (selectable via icons):
   - **Direct URL** (`link` icon):
     - Image: `https://kroki.io/mermaid/svg/eNpL...`
     - Editor: `https://.../disperse/#mermaid/svg/eNpL...`
   - **Markdown** (`file-down` icon):
     - Image: `![](https://kroki.io/mermaid/svg/eNpL...)`
     - Editor (image followed by edit link): `![](https://kroki.io/mermaid/svg/eNpL...) [Edit in Disperse](https://.../disperse/#mermaid/svg/eNpL...)`
   - **HTML** (`code-2` icon):
     - Image: `<img src="https://kroki.io/mermaid/svg/eNpL..." />`
     - Editor (image followed by edit link): `<img src="https://kroki.io/mermaid/svg/eNpL..." /> <a href="https://.../disperse/#mermaid/svg/eNpL...">Edit in Disperse</a>`
3. **Copy action**:
   - Clipboard button next to each snippet with visual feedback (temporarily switching to a `✓` check icon), triggered via click or keyboard shortcuts (`Alt+I` for the image snippet, `Alt+E` for the editor snippet).
   - Read-only snippet and status text inputs (`#out-image-text`, `#out-editor-text`, `#out-file-text`) have `tabindex="-1"` to keep keyboard `Tab` navigation agile across interactive buttons.
4. **Resizable / Collapsible Export Section (`#export-splitter` & `#export-section`)**:
   - A horizontal draggable splitter (`#export-splitter`) between the main area and the footer allows resizing or collapsing the export rows (`#export-section`) downward.
   - Dragging upward is capped at the natural height of the export content, while dragging downward collapses only the export rows (`0px`), keeping the footer credits visible at the bottom.
   - Double-clicking `#export-splitter` restores the export section to its full height, and pressing `Alt+X` toggles between collapsed and restored states.
   - In reduced-size viewports (`<= 900px`), `#export-splitter` expands to `24px` and displays quick-action buttons inside its `.splitter-grip` (`#export-collapse` `▼` and `#export-restore` `▲`), matching `#splitter`.
   - Maximizing the preview (`Alt+Enter` / `#maximize-preview`) automatically collapses `#export-section` if it is expanded and restores its previous height when exiting maximized preview (unless manually adjusted in the meantime).
5. **Footer credits**:
   - Centered bottom credit line acknowledging the project, its license, and its dependencies: rendered with Lucide vector icons (`heart` tinted in `--color-tertiary` and horizontally flipped `copyright` icon representing copyleft) instead of native Unicode emojis/glyphs to avoid platform-specific rendering anomalies: `Made with <heart> in Betanzos · Copyleft <copyleft> (GPLv3) by sleepinfinity.dev · Disperse was built on the shoulders of giants: Kroki, Ace, Panzoom, Pako, Lucide, and inspired by Niolesk.`

### 4.4. Responsive Design
1. **Desktop & Wide Screens (`> 900px`)**:
   - Horizontal split (Editor left `38.2%` | Vertical splitter | Viewer right `61.8%`).
2. **Tablets & Narrow Windows (`<= 900px`)**:
   - Stacked vertical layout (Editor top `38.2%` height | Horizontal draggable splitter with quick-maximize/reset buttons | Viewer bottom `61.8%` height).
3. **Mobile (`<= 600px`)**:
   - Compact wrapped header and touch-friendly controls (`>= 36px`).

### 4.5. Keyboard Shortcuts & Focus Flow
All keyboard shortcuts are reflected in their corresponding control tooltips (`data-tooltip`) and `aria-label` attributes, and support both main keyboard keys and numeric keypad (`Numpad`) keys across international layouts:

| Shortcut | Action | Control |
| :--- | :--- | :--- |
| `Ctrl/Cmd + R` | Refresh diagram preview | `#refresh-btn` |
| `Ctrl/Cmd + O` | Open local file | `#file-open-btn` |
| `Ctrl/Cmd + S` | Save local file (or download source fallback) | `#file-save-btn` |
| `Ctrl/Cmd + Shift + S` | Save local file as... | `#file-save-as-btn` |
| `Alt + A` | Toggle local file auto-save | `#file-autosave-btn` |
| `Alt + T` | Toggle light/dark theme | `#theme-btn` |
| `Alt + V` | Toggle Vim mode in editor | `#editor-vim-mode` |
| `Alt + L` | Copy current page link | `#brand-link` |
| `Alt + 1` | Maximize editor panel | `#split-max-editor` |
| `Alt + 2` | Reset split to golden ratio ($38.2\%$) | `#split-reset` |
| `Alt + 3` | Maximize preview panel | `#split-max-viewer` |
| `Alt + +` | Zoom in diagram preview | `#zoom-in` |
| `Alt + -` | Zoom out diagram preview | `#zoom-out` |
| `Alt + 0` | Fit / Reset diagram view | `#zoom-fit` |
| `Alt + Enter` | Maximize / Restore diagram preview | `#maximize-preview` |
| `Alt + D` | Download rendered diagram | `#download-btn` |
| `Alt + Shift + +` | Increase editor font size | `#editor-font-in` |
| `Alt + Shift + -` | Decrease editor font size | `#editor-font-out` |
| `Alt + Shift + 0` | Reset editor font size | `#editor-font-fit` |
| `Alt + I` | Copy image snippet | `.copy-btn[data-input="out-image-text"]` |
| `Alt + E` | Copy editor snippet | `.copy-btn[data-input="out-editor-text"]` |
| `Alt + X` | Toggle export section | `#export-splitter` |

- **Focus & Tab Order**: On load, focus is placed directly inside the Ace code editor. Natural DOM order guides `Tab` navigation cleanly from the header toolbar through the editor, splitter, viewer actions, and footer buttons, skipping non-interactive read-only text fields and hidden inputs (`tabindex="-1"`).

---

## 5. Supported Kroki Engines

The engine dropdown covers all 28 engines from the public Kroki API (32 selectable entries in total), each mapped to its corresponding Ace Editor syntax mode, official documentation URL, and default template in `examples/{id}.txt`.

### 5.1. Featured Languages (Top of List)
Displayed at the top of `#engine-select` above a disabled separator (`──────────────`):
1. `d2` (`d2` — D2, **selected by default**)
2. `mermaid` (`mermaid` — Mermaid)
3. `dbml` (`dbml` — DBML / SQL Database Markup Language)
4. `excalidraw` (`Excalidraw (Editor)` — Embedded interactive Excalidraw WYSIWYG editor + JSON, `wysiwyg: true`)
5. `c4plantuml-context` (`c4plantuml (context)` — C4 System Context diagram via `c4plantuml` Kroki engine)
6. `c4plantuml-container` (`c4plantuml (container)` — C4 Container diagram via `c4plantuml` Kroki engine)
7. `c4plantuml-component` (`c4plantuml (component)` — C4 Component diagram via `c4plantuml` Kroki engine)
8. `c4plantuml-dynamic` (`c4plantuml (dynamic)` — C4 Dynamic diagram via `c4plantuml` Kroki engine)
9. `c4plantuml-deployment` (`c4plantuml (deployment)` — C4 Deployment diagram via `c4plantuml` Kroki engine)

### 5.2. Remaining Engines (Alphabetical Order)
Displayed below the separator:
10. `actdiag` (ActDiag)
11. `blockdiag` (BlockDiag)
12. `bpmn` (BPMN - XML)
13. `bytefield` (Bytefield - Clojure)
14. `ditaa` (Ditaa)
15. `erd` (Erd)
16. `graphviz` (GraphViz / DOT)
17. `nomnoml` (Nomnoml)
18. `nwdiag` (NwDiag)
19. `packetdiag` (PacketDiag)
20. `pikchr` (Pikchr)
21. `plantuml` (PlantUML)
22. `rackdiag` (RackDiag)
23. `seqdiag` (SeqDiag)
24. `structurizr` (Structurizr)
25. `svgbob` (Svgbob)
26. `symbolator` (Symbolator - VHDL/Verilog)
27. `tikz` (TikZ - LaTeX)
28. `umlet` (UMLet - XML)
29. `vega` (Vega - JSON)
30. `vegalite` (Vega-Lite - JSON)
31. `wavedrom` (WaveDrom - JSON)
32. `wireviz` (WireViz - YAML)

---

## 6. Encoding, Compression, and Kroki Communication

1. **Encoding Algorithm (Kroki Standard)**:
   - Encode editor text into UTF-8 (`TextEncoder`).
   - Compress using **Zlib Deflate** (level 9).
   - Convert the compressed buffer to **URL-safe Base64** (replacing `+` with `-` and `/` with `_`).
2. **Decoding (Loading from URL)**:
   - When opening Disperse with a `#engine/format/payload` hash, the URL-safe Base64 payload is decoded, inflated back to UTF-8, and loaded into the editor along with the specified engine and format.
3. **Rendering**:
   - Standard diagrams use `GET {kroki_base_url}/{engine}/{format}/{payload}` (where `{kroki_base_url}` defaults to `https://kroki.io` and can be configured at runtime via `window.DISPERSE_CONFIG.krokiBaseUrl`, resolving relative paths such as `/kroki` against `window.location.origin`).
   - If a syntax error occurs, the error body returned by Kroki is displayed in the `#viewer-error` overlay.

---

## 7. Technical Architecture and Libraries (Vanilla + CDN)

Clean file structure requiring no build step:
- `index.html` — Semantic structure and CDN library imports.
- `favicon.svg` — Vector brand icon and logo (a prism dispersing a beam into 4 tetradic graph nodes).
- `css/styles.css` — Tetradic `oklch` color system, golden-ratio responsive layout, and light/dark themes.
- `js/app.js` — Initialization, per-engine application state, global keyboard shortcuts (`Ctrl/Cmd` and `Alt`/`Alt+Shift`), magnetic splitter, local file workflow, and events.
- `js/theme.js` — `sRGB → Oklab → OKLCH` conversion, tetradic palette generation, dynamic brand icon coloring, and light/dark mode toggle.
- `js/kroki.js` — Engine catalog, documentation links, cached lazy-loading of `examples/{engine}.txt`, compression/decompression, and Kroki URL builder.
- `js/viewer.js` — Diagram viewer (SVG and PNG) with zoom, pan, error overlay, and file download.
- `js/wysiwyg.js` — Lazy-loaded embedded WYSIWYG visual editor (`@excalidraw/excalidraw`) with bidirectional Ace Editor / URL synchronization and client-side SVG/PNG export.
- `examples/*.txt` — Individual default example files for each of the 32 selectable engine/template entries (28 Kroki engines including 5 C4-PlantUML diagram types).
- `assets/screenshot.png` — Application screenshot referenced in `README.md`.

### External Libraries (via CDN)
- **Code Editor**: **Ace Editor** (`ace.js`, `keybinding-vim.min.js`).
- **Zoom & Pan**: **`@panzoom/panzoom`** (`panzoom.min.js`).
- **Compression**: **`pako`** (`pako.min.js`).
- **Iconography**: **`lucide`** (`lucide.min.js`).
- **WYSIWYG Visual Editor (Lazy-Loaded on Demand)**: **`@excalidraw/excalidraw`** (`https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js` with `react@18.3.1` and `react-dom@18.3.1`).

---

## 8. Deployment and Containerization

- **`Containerfile`**: Builds an OCI image based on `nginx:stable` (Debian), linked to the repository via `LABEL org.opencontainers.image.source`, copying only the required static assets (`index.html`, `favicon.svg`, `css/`, `js/`, and `examples/`). It configures Nginx to listen on port `8765` (`ENV PORT=8765`, `EXPOSE 8765 80`) and prints the server URL (`Starting server at http://localhost:8765 ...`) on startup.
  - **Runtime Backend, Engine Modes & Reverse-Proxy Configuration**: The entrypoint script (`/docker-entrypoint.d/40-disperse.sh`) also supports:
    - `PORT` (default: `8765`): Configures the container HTTP listening port alongside port `80` (no code changes required for port binding).
    - `KROKI_BASE_URL` (default: `https://kroki.io`): Injects the primary runtime Kroki base URL (`window.DISPERSE_CONFIG.krokiBaseUrl`) consumed by `js/kroki.js` without requiring a build step.
    - `KROKI_REMOTE_URL` (default: `https://kroki.io`): Injects the fallback public/third-party Kroki base URL (`window.DISPERSE_CONFIG.krokiRemoteUrl`) used by any companion engine configured in `remote` mode.
    - `ENGINE_MODE_MERMAID`, `ENGINE_MODE_BPMN`, `ENGINE_MODE_EXCALIDRAW`, `ENGINE_MODE_DIAGRAMSNET` (`local` | `remote` | `disabled`, also accepting `true`/`false` aliases via `ENABLE_<ENGINE>`): Configures per-engine routing and visibility in Disperse's UI selector (`#engine-select`), mapped 1:1 to the Helm chart's sidecar mode (`kroki.sidecars.<engine>.mode`).
    - `KROKI_DISABLED_ENGINES` (default: `""`, comma-separated list): Optional override list injected into `window.DISPERSE_CONFIG.disabledEngines` to disable any arbitrary engine IDs.
    - `KROKI_INTERNAL_UPSTREAM` (optional, e.g., `http://disperse-kroki:8000`): When set, configures an Nginx `location /kroki/` reverse-proxy block in `/etc/nginx/conf.d/default.conf` that strips the `/kroki/` prefix and forwards requests to the internal Kroki server.
- **Running the Container**:
  ```bash
  docker run --rm -p 8765:8765 ghcr.io/sleepinfinitydev/disperse:latest
  ```
- **`Taskfile.yml`**: Provides development and packaging tasks:
  - `task run`: Starts a lightweight local web server (`python3 -m http.server`) on port `8765` by default (configurable via `PORT`, e.g., `task run PORT=9000`).
  - `task build`: Builds the container image (`ghcr.io/sleepinfinitydev/disperse` by default, configurable via `IMAGE=...`) tagged with both the short Git commit hash (`git rev-parse --short HEAD`) and `latest`, auto-detecting `podman` or `docker`.
  - `task push`: Builds and pushes both tags (`:{{.GIT_HASH}}` and `:latest`) to the container registry.
- **GitHub Actions (`.github/workflows/oci-image.yml`)**: Automatically builds the OCI image from `Containerfile` and pushes both `:<git-short-hash>` and `:latest` tags to GitHub Container Registry (`ghcr.io/sleepinfinitydev/disperse`) on every push to `main` using `GITHUB_TOKEN` with minimal permissions (`contents: read`, `packages: write`).

---

## 8. Kubernetes & Helm Chart Specification (`charts/disperse`)

Disperse provides an official Helm v3 chart (`apiVersion: v2`, `type: application`) under `charts/disperse` designed around Kubernetes and Helm best practices while supporting flexible deployment topologies.

### 8.1. Architectural Goals & Requirements Alignment

1. **Dual Backend Operating Modes**:
   - **Mode A — Standalone Disperse with Public Kroki (`kroki.enabled: false`, default)**:
     - Deploys only the `disperse` `Deployment` (static SPA served by Nginx).
     - The browser communicates directly with `https://kroki.io` (or an external custom Kroki URL defined in `disperse.krokiBaseUrl`).
     - Minimal cluster footprint (single lightweight Pod).
   - **Mode B — Full Self-Hosted Stack (`kroki.enabled: true`)**:
     - Deploys a **second `Deployment`** (`<fullname>-kroki`) running the Kroki gateway server along with all required companion containers as **Pod sidecars** to support all 28 diagram engines in Disperse.
     - Isolates the lightweight static frontend (`disperse`) from the CPU/memory-intensive JVM + headless Chromium rendering stack (`kroki`), enabling independent scaling, resource quotas, rollouts, and node scheduling.
2. **Single Published Service & Unified Path Policy**:
   - Both Disperse and Kroki (when enabled) are published externally through a **single public-facing Kubernetes `Service`** (`<fullname>`) under a unified, collision-free HTTP path policy:
     - `/` — Serves the **Disperse** SPA (`index.html`, `favicon.svg`, `css/`, `js/`, `examples/`).
     - `/kroki/` — Proxies requests to the self-hosted **Kroki** backend (when `kroki.enabled: true`), rewriting `/kroki/{engine}/{format}/{payload}` to `/{engine}/{format}/{payload}`.
3. **External Traffic Exposure (Ingress & Gateway API)**:
   - First-class support for both standard Kubernetes **Ingress (`networking.k8s.io/v1`)** and **Gateway API (`gateway.networking.k8s.io/v1` `HTTPRoute`)**.
4. **Extensibility via `extraManifests`**:
   - Built-in `extraManifests` list rendered through Helm's `tpl` engine so operators can bundle arbitrary Kubernetes resources (e.g., `Gateway`, `Certificate`, `NetworkPolicy`, `ServiceMonitor`, `Middleware`, `BackendTrafficPolicy`) with full access to chart context and helpers.

---

### 8.2. Reconciling Kubernetes Best Practices with the Single-Service & Multi-Deployment Requirement

A core Kubernetes networking constraint is that a `v1/Service` operates at **Layer 4 (TCP)** using Pod label selectors (`spec.selector`):
- A `v1/Service` cannot natively perform Layer 7 HTTP path routing (`/` vs. `/kroki/`).
- Sharing a single `spec.selector` across two heterogeneous `Deployment`s (`disperse` and `kroki`) is a Kubernetes anti-pattern: `kube-proxy`, Service Meshes, and `kubectl port-forward svc/<name>` would indiscriminately select pods from either Deployment, causing failed connections.
- Furthermore, the upstream `yuzutech/kroki` server expects requests at the root path (`/{engine}/{format}/{payload}` and `/health`) and has no native context-path configuration. Relying on `Ingress` annotations for path rewriting (such as `nginx.ingress.kubernetes.io/rewrite-target`) would lock the chart into specific Ingress controllers and fail when using `kubectl port-forward`, `NodePort`, or `LoadBalancer` Services.

#### Solution: Disperse Nginx as Unified L7 Entrypoint + Internal Kroki Discovery Service

```
                           External Traffic
        (Ingress / Gateway API HTTPRoute / LoadBalancer / port-forward)
                                  │
                                  ▼
               ┌──────────────────────────────────────┐
               │   Public Service: <fullname> (:8765) │  <-- Single Published Service
               └──────────────────┬───────────────────┘
                                  │
                                  ▼
               ┌──────────────────────────────────────┐
               │        Deployment 1: <fullname>      │
               │     Container: disperse (Nginx)      │
               │                                      │
               │  • location /       -> Static SPA    │
               │  • location /kroki/ -> proxy_pass ───┼──────┐ (when kroki.enabled=true,
               └──────────────────────────────────────┘      │  strips /kroki/ prefix)
                                                             ▼
                                      ┌──────────────────────────────────────┐
                                      │ Internal Service: <fullname>-kroki   │
                                      │     (ClusterIP: 8000, internal)      │
                                      └──────────────────┬───────────────────┘
                                                         │
                                                         ▼
                                      ┌──────────────────────────────────────┐
                                      │    Deployment 2: <fullname>-kroki    │
                                      │  ┌────────────────────────────────┐  │
                                      │  │ Main: yuzutech/kroki (:8000)   │  │
                                      │  └───────┬────────┬────────┬──────┘  │
                                      │          │127.0.0.1 (Pod loopback)   │
                                      │          ▼        ▼        ▼         │
                                      │  ┌──────────┐┌────────┐┌──────────┐  │
                                      │  │ mermaid  ││  bpmn  ││excalidraw│  │
                                      │  │ (:8002)  ││(:8003) ││ (:8004)  │  │
                                      │  └──────────┘└────────┘└──────────┘  │
                                      └──────────────────────────────────────┘
```

This architecture satisfies all requirements and adheres strictly to Helm and Kubernetes best practices:
- **Single Published Service (`<fullname>`)**: External clients, Ingresses, Gateway API `HTTPRoute`s, and `kubectl port-forward svc/<fullname> 8765:8765` interact with **one** Service and port.
- **Controller-Agnostic Path Routing**: Because Disperse already runs on `nginx:stable`, configuring `location /kroki/` inside Disperse's Nginx handles prefix stripping (`rewrite ^/kroki/(.*)$ /$1 break;`) and reverse-proxying in a completely portable manner across any Ingress controller, Gateway API implementation, or L4 Service type.
- **Same-Origin Requests & Valid Shareable Snippets**: When `kroki.enabled: true`, `disperse.krokiBaseUrl` defaults to `/kroki`. The frontend resolves `/kroki` against `window.location.origin` (`${window.location.origin}/kroki/{engine}/{format}/{payload}`), eliminating CORS preflight overhead and ensuring that copied Markdown/HTML image snippets in the footer contain complete, valid absolute URLs.
- **Clean Label Isolation**:
  - `Deployment` 1 (`<fullname>`) uses selector `app.kubernetes.io/component: app`.
  - `Deployment` 2 (`<fullname>-kroki`) uses selector `app.kubernetes.io/component: kroki` and is backed by an internal-only `ClusterIP` Service (`<fullname>-kroki:8000`) used strictly as an in-cluster DNS upstream for Nginx.

---

### 8.3. Required Changes in Disperse Application & Container

To support the Helm chart's deployment modes without breaking standalone or local usage:

1. **Port Handling (No Changes Needed)**:
   - `Containerfile` already listens on both `80` and `${PORT:-8765}` (`EXPOSE 8765 80`). The Helm chart can target port `8765` (or any custom `PORT`) while exposing whatever `service.port` the operator prefers.
2. **Dynamic `krokiBaseUrl` in `js/kroki.js`**:
   - Replace the hardcoded `https://kroki.io` in `window.kroki.buildUrl()` with a dynamic resolver reading `window.DISPERSE_CONFIG?.krokiBaseUrl` (defaulting to `'https://kroki.io'`).
   - When `krokiBaseUrl` is a relative path (such as `'/kroki'`), resolve it against `window.location.origin` (`${window.location.origin}/kroki/...`) so both the live preview (`fetch`) and the shareable Markdown/HTML image snippets in the footer always produce valid absolute URLs.
3. **Dynamic Tri-State Engine Modes (`local` | `remote` | `disabled`) & Confidentiality Indicators in `js/kroki.js` / `js/app.js`**:
   - Support per-engine mode configuration in `window.DISPERSE_CONFIG.engineModes` (`{ mermaid, bpmn, excalidraw, diagramsnet }`), where each of the 4 companion engines can be set to:
     - **`disabled`**: Hidden/omitted from `#engine-select`.
     - **`local`**: Rendered via the primary self-hosted backend (`krokiBaseUrl`, e.g., `/kroki/{engine}/...`).
     - **`remote`**: Rendered directly via the external third-party backend (`krokiRemoteUrl`, defaulting to `https://kroki.io/{engine}/...`), bypassing the need to deploy the local Chromium sidecar container.
   - **Explicit UI Confidentiality Notice for `remote` Engines**:
     - Whenever Disperse uses a self-hosted primary backend (`krokiBaseUrl` is `/kroki` or a custom internal host) and an engine is configured in `remote` mode:
       1. Its `<option>` label in `#engine-select` explicitly displays an external indicator and target host: e.g., `mermaid 🌐 (kroki.io)`.
       2. When a `remote` engine is active, `#engine-select` displays a distinct visual warning state (using `--color-tertiary`) and updates its `data-tooltip` to `"Diagram language — ⚠️ External service (kroki.io, non-confidential)"` so users are unambiguously informed before typing sensitive architecture data.
       3. The Publishing Footer's Image URL (`#out-image-text`) explicitly shows `https://kroki.io/{engine}/...`, reinforcing that the diagram is served externally.
4. **Runtime Configuration & Nginx Reverse Proxy (`Containerfile` / `ConfigMap`)**:
   - Load an optional `js/config.js` (defining `window.DISPERSE_CONFIG`) generated at container startup from environment variables (`KROKI_BASE_URL`, `KROKI_REMOTE_URL`, `ENGINE_MODE_*`, `KROKI_DISABLED_ENGINES`) or mounted via the Helm chart's `ConfigMap`, alongside the Nginx `location /kroki/` reverse-proxy block when `kroki.enabled: true`.

---

### 8.4. Kroki Deployment, Sidecar Containers & Hybrid (`local` / `remote` / `disabled`) Modes

To render all **28 diagram engines** supported by Disperse (Section 4) plus optional `diagramsnet`, the `<fullname>-kroki` `Deployment` combines the core Kroki gateway container with up to **4 individually configurable companion engines**:

| Container / Engine | Helm Setting | Disperse Container Env Var | Supported Modes | Image (when `mode: local`) | Port |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`kroki` (25 core engines)** | `kroki.enabled` | `KROKI_INTERNAL_UPSTREAM` | `true` / `false` | `docker.io/yuzutech/kroki` | `8000` |
| **`mermaid`** | `kroki.sidecars.mermaid.mode` | `ENGINE_MODE_MERMAID` | `local` \| `remote` \| `disabled` | `docker.io/yuzutech/kroki-mermaid` | `8002` |
| **`bpmn`** | `kroki.sidecars.bpmn.mode` | `ENGINE_MODE_BPMN` | `local` \| `remote` \| `disabled` | `docker.io/yuzutech/kroki-bpmn` | `8003` |
| **`excalidraw`** | `kroki.sidecars.excalidraw.mode` | `ENGINE_MODE_EXCALIDRAW` | `local` \| `remote` \| `disabled` | `docker.io/yuzutech/kroki-excalidraw` | `8004` |
| **`diagramsnet`** | `kroki.sidecars.diagramsnet.mode` | `ENGINE_MODE_DIAGRAMSNET` | `local` \| `remote` \| `disabled` | `docker.io/yuzutech/kroki-diagramsnet` | `8005` |

#### Tri-State Mode Semantics (`local` vs. `remote` vs. `disabled`)
When `kroki.enabled: true`, each of the 4 Chromium-based engines can be independently configured:
- **`mode: "local"`**: Deploys the corresponding `yuzutech/kroki-<engine>` sidecar container inside the `<fullname>-kroki` Pod (communicating over `127.0.0.1`) and routes requests through the internal `/kroki/<engine>/...` endpoint. Guarantees **100% data privacy / on-premise confidentiality**, at the cost of the sidecar's Chromium RAM/CPU footprint.
- **`mode: "remote"`**: Does **not** deploy the sidecar container in Kubernetes (zero Chromium resource usage in-cluster). Instead, Disperse keeps the engine available in `#engine-select` with an explicit external/non-confidential label (`<engine> 🌐 (kroki.io)`) and routes its rendering requests directly from the user's browser to `kroki.remoteFallbackUrl` (`https://kroki.io` by default). Because the browser calls `https://kroki.io` directly (via CORS), the Kubernetes cluster itself does not even require outbound internet egress from Pods.
- **`mode: "disabled"`**: Does **not** deploy the sidecar container and removes the engine from Disperse's `#engine-select` dropdown. Ideal for air-gapped or strict-compliance environments that do not wish to allocate Chromium sidecar resources for that format.

#### Why the 4 Companion Sidecars Require Headless Chromium & Their Use Cases in Disperse

Each of these 4 companion containers embeds a **headless Chromium** browser controlled via Puppeteer / Chrome DevTools Protocol (CDP), which increases memory consumption (~150–400 MB RAM per sidecar). Because of this resource footprint and their distinct workflows, **each of the 4 sidecars has its own independent boolean flag (`kroki.sidecars.<name>.enabled`)**:

1. **`mermaid` (`kroki.sidecars.mermaid.enabled`)**:
   - **Why Chromium is needed**: `mermaid.js` was architected as a browser DOM library that relies on real browser layout APIs (`SVGElement.getBBox()`, `getComputedTextLength()`, CSS font metrics, and `<foreignObject>`) to measure text and node dimensions before routing edges. Even the official `mermaid-cli` (`mmdc`) runs Puppeteer + headless Chromium under the hood. Because Kroki must return a self-contained static SVG/PNG at `GET /mermaid/svg/<payload>` (usable inside external `<img src="...">` tags where JS execution is blocked), server-side rendering requires headless Chromium.
   - **Use case in Disperse**: Primary **Diagrams-as-Code** authoring language written directly by hand in the code editor.
2. **`bpmn` (`kroki.sidecars.bpmn.enabled`)**:
   - **Why Chromium is needed**: Renders OMG **BPMN 2.0** XML workflow files using `bpmn-js` (from Camunda / bpmn.io), which also depends on a real browser DOM and SVG `getBBox()` engine to render process diagrams into static SVG/PNG.
   - **Use case in Disperse**: Inspecting, tweaking labels/IDs, and publishing existing `.bpmn` XML files (typically exported from Camunda Modeler, bpmn.io, or enterprise workflow engines) into stateless shareable Kroki URLs and Markdown/HTML snippets.
3. **`excalidraw` (`kroki.sidecars.excalidraw.enabled`)**:
   - **Why Chromium is needed**: Renders `.excalidraw` JSON scene files using the official Excalidraw browser engine (HTML5 Canvas/SVG + Virgil hand-drawn font metrics) inside headless Chromium.
   - **Use case in Disperse**: Disperse's preview is a read-only SVG/PNG viewer, not an interactive drawing whiteboard, and users rarely write Excalidraw JSON coordinates from scratch. Its practical use case in Disperse is **opening or dragging-and-dropping an existing `.excalidraw` file** (created in `excalidraw.com`, VS Code, or Obsidian, or generated by an LLM), making quick JSON property edits (colors, text labels, `viewBackgroundColor`), and **generating a stateless Kroki image URL / Markdown snippet** to embed the diagram in documentation without managing static image files. Operators who only want pure text-based languages can set `kroki.sidecars.excalidraw.enabled: false` to save Chromium RAM.
4. **`diagramsnet` (`kroki.sidecars.diagramsnet.enabled`)**:
   - **Why Chromium is needed**: Renders `.drawio` / `mxGraphModel` XML files using the browser-based `diagrams.net` (`draw.io`) engine inside headless Chromium.
   - **Use case in Disperse**: Same workflow as Excalidraw/BPMN — `draw.io` XML is authored visually in `diagrams.net`, not typed by hand. Enabling this sidecar (`enabled: false` by default) allows importing `.drawio` XML files into Disperse to generate stateless shareable URLs, or using the `/kroki/` endpoint as a shared cluster-wide Kroki server for CI/CD documentation pipelines (e.g., Asciidoctor, MkDocs).

When `kroki.enabled: true`, disabling any sidecar (`kroki.sidecars.<name>.enabled: false`) both omits its container from the `<fullname>-kroki` Pod and adds `<name>` to Disperse's `disabledEngines` runtime config so the UI dropdown remains accurate.

#### Kubernetes-Specific Kroki Hardening & Best Practices
1. **Preventing the `KROKI_PORT` Collision**:
   - Kubernetes automatically injects `<SERVICE_NAME>_PORT=tcp://<ip>:<port>` environment variables into Pods when `enableServiceLinks` is true. If a Service is named `kroki`, Kubernetes injects `KROKI_PORT=tcp://...`, which crashes `yuzutech/kroki` (as it expects `KROKI_PORT` to be an integer).
   - The chart sets `enableServiceLinks: false` on the Kroki Pod spec and explicitly defines `KROKI_LISTEN=0.0.0.0:8000` (and `KROKI_PORT=8000`).
2. **Loopback Companion Wiring**:
   - Because sidecars share the Pod network namespace, `KROKI_MERMAID_HOST=127.0.0.1`, `KROKI_BPMN_HOST=127.0.0.1`, `KROKI_EXCALIDRAW_HOST=127.0.0.1`, and `KROKI_DIAGRAMSNET_HOST=127.0.0.1` work over localhost with zero extra Services or cluster DNS overhead.
3. **Non-Root & Read-Only Root Filesystem Compatibility**:
   - All `yuzutech/kroki*` images run as UID/GID `1001` (`kroki`).
   - The Pod mounts an `emptyDir` volume with isolated `subPath`s into `/tmp` and `/home/kroki` for each enabled container so CLI engines (D2, TikZ, GraphViz, PlantUML) and Chromium workers can write temporary files while keeping `readOnlyRootFilesystem: true`, `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, and `capabilities.drop: ["ALL"]`.
4. **URI & Payload Sizing**:
   - Complex diagrams (such as Excalidraw or large D2/Mermaid files) produce long Base64-encoded GET URLs. Both the Disperse Nginx proxy (`large_client_header_buffers 4 16k;`) and Kroki (`KROKI_MAX_URI_LENGTH=16384`) are pre-configured with sensible defaults to prevent `HTTP 414 Request-URI Too Long` errors.
   - **Important for External Traffic**: When exposing Disperse via Ingress or Gateway API, the external controller or proxy must also be configured to accept large request URIs. For example, when using `ingress-nginx`, the deployer should set the annotation `nginx.ingress.kubernetes.io/large-client-header-buffers: "4 16k"` (or larger) in `ingress.annotations`.

---

### 8.5. External Access: Ingress and Gateway API (`HTTPRoute`)

The chart provides native, mutually compatible templates for both Kubernetes Ingress and the modern Kubernetes Gateway API:

1. **Ingress (`templates/ingress.yaml`, `networking.k8s.io/v1`)**:
   - Enabled via `ingress.enabled: true` (`false` by default).
   - Supports `ingress.className`, `ingress.annotations` (e.g., `cert-manager.io/cluster-issuer`), `ingress.hosts` (with configurable `paths` and `pathType`, defaulting to `/` `Prefix` -> `<fullname>` Service), and `ingress.tls`.
2. **Gateway API (`templates/httproute.yaml`, `gateway.networking.k8s.io/v1`)**:
   - Enabled via `httpRoute.enabled: true` (`false` by default).
   - Follows standard Gateway API role separation by attaching an `HTTPRoute` to existing cluster `Gateway`s via `httpRoute.parentRefs` (supporting `name`, `namespace`, `sectionName`, `port`).
   - Supports `httpRoute.hostnames`, `httpRoute.annotations`, `httpRoute.labels`, and `httpRoute.rules` (defaulting to a `PathPrefix: /` match forwarding to `<fullname>` Service on port `8765`, while allowing custom `matches`, `filters`, `timeouts`, and `backendRefs`).
   - If a deployer wishes to provision a dedicated `Gateway`, `ReferenceGrant`, or controller-specific policy alongside the chart, it can be declared directly in `extraManifests`.

---

### 8.6. Extensibility via `extraManifests`

- Defined in `values.yaml` as `extraManifests: []` (`templates/extra-manifests.yaml`).
- Accepts an array of arbitrary Kubernetes manifest objects (YAML maps) or raw YAML strings.
- Every entry is rendered through Helm's `tpl` function (`{{ tpl (toYaml .) $ }}` or `{{ tpl . $ }}`), enabling dynamic interpolation of release values and chart template helpers (e.g., `{{ include "disperse.fullname" . }}`, `{{ .Release.Namespace }}`, `{{ include "disperse.labels" . | nindent 4 }}`).

---

### 8.7. Chart File Structure & Values Schema

```
charts/disperse/
├── Chart.yaml                  # Chart metadata (apiVersion: v2, type: application)
├── .helmignore                 # Ignored files when packaging
├── README.md                   # Chart documentation, architecture & configuration reference
├── values.yaml                 # Default configuration values
├── values.schema.json          # JSON Schema for strict values validation
└── templates/
    ├── NOTES.txt               # Post-install usage & URL instructions
    ├── _helpers.tpl            # Naming, labels, selectors, image & tpl helpers
    ├── serviceaccount.yaml     # Optional ServiceAccount (automountServiceAccountToken: false)
    ├── configmap.yaml          # Nginx reverse-proxy & runtime config for Disperse
    ├── deployment.yaml         # Disperse SPA + Nginx reverse-proxy Deployment
    ├── service.yaml            # Single published Service (<fullname>)
    ├── kroki-deployment.yaml   # Conditional Kroki + sidecars Deployment (if kroki.enabled)
    ├── kroki-service.yaml      # Conditional internal ClusterIP Service (<fullname>-kroki)
    ├── ingress.yaml            # Conditional Ingress (if ingress.enabled)
    ├── httproute.yaml          # Conditional Gateway API HTTPRoute (if httpRoute.enabled)
    ├── pdb.yaml                # Optional PodDisruptionBudget
    ├── extra-manifests.yaml    # Templated extra Kubernetes manifests (if extraManifests)
    └── tests/
        └── test-connection.yaml # Helm test hook verifying `/` and `/kroki/health`
```

#### Key `values.yaml` Structure Overview

```yaml
global:
  imageRegistry: ""
  imagePullSecrets: []

nameOverride: ""
fullnameOverride: ""
commonLabels: {}
commonAnnotations: {}

# Disperse Frontend & Unified Entrypoint
replicaCount: 1
image:
  registry: ghcr.io
  repository: sleepinfinitydev/disperse
  tag: "" # Defaults to .Chart.AppVersion
  pullPolicy: IfNotPresent

disperse:
  # Used when kroki.enabled is false. When kroki.enabled is true, defaults to "/kroki"
  krokiBaseUrl: "https://kroki.io"
  nginx:
    clientMaxBodySize: "2m"
    largeClientHeaderBuffers: "4 16k"
    proxyReadTimeout: "60s"

# Single Published Service
service:
  type: ClusterIP
  port: 8765
  annotations: {}

# Self-Hosted Kroki Backend (Second Deployment + Companion Sidecars)
kroki:
  enabled: false
  replicaCount: 1
  remoteFallbackUrl: "https://kroki.io" # Used by sidecars configured with mode: "remote"
  image:
    registry: docker.io
    repository: yuzutech/kroki
    tag: "0.33.0"
    pullPolicy: IfNotPresent
  safeMode: "SECURE"
  maxUriLength: 16384
  env: []
  resources: {}
  # Sidecar modes: "local" (deploy container in-cluster), "remote" (use remoteFallbackUrl with UI warning), or "disabled"
  sidecars:
    mermaid:
      mode: "local"
      image:
        registry: docker.io
        repository: yuzutech/kroki-mermaid
        tag: "0.33.0"
      port: 8002
      resources: {}
    bpmn:
      mode: "remote"
      image:
        registry: docker.io
        repository: yuzutech/kroki-bpmn
        tag: "0.33.0"
      port: 8003
      resources: {}
    excalidraw:
      mode: "remote"
      image:
        registry: docker.io
        repository: yuzutech/kroki-excalidraw
        tag: "0.33.0"
      port: 8004
      resources: {}
    diagramsnet:
      mode: "disabled"
      image:
        registry: docker.io
        repository: yuzutech/kroki-diagramsnet
        tag: "0.33.0"
      port: 8005
      resources: {}

# External Access — Kubernetes Ingress (networking.k8s.io/v1)
ingress:
  enabled: false
  className: ""
  annotations: {}
  hosts:
    - host: disperse.local
      paths:
        - path: /
          pathType: Prefix
  tls: []

# External Access — Kubernetes Gateway API (gateway.networking.k8s.io/v1)
httpRoute:
  enabled: false
  annotations: {}
  labels: {}
  parentRefs: []
    # - name: main-gateway
    #   namespace: gateway-system
    #   sectionName: https
  hostnames: []
    # - disperse.local
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /

# Extensibility — Arbitrary Kubernetes Manifests (rendered with `tpl`)
extraManifests: []
```

---

### 8.8. Phased Implementation Roadmap & Future WYSIWYG Experiment

Implementation of the runtime engine modes (`local` | `remote` | `disabled`) and the Helm chart will proceed incrementally across 5 phases, followed by the experimental interactive WYSIWYG track:

1. **Phase 1 — Core Stack, 25 Built-In Engines & Tri-State Mode Infrastructure (`local` | `remote` | `disabled`)**:
   - Implement runtime configuration in Disperse (`KROKI_BASE_URL`, `KROKI_REMOTE_URL`, `KROKI_INTERNAL_UPSTREAM`, `ENGINE_MODE_MERMAID`, `ENGINE_MODE_BPMN`, `ENGINE_MODE_EXCALIDRAW`, `ENGINE_MODE_DIAGRAMSNET`, `KROKI_DISABLED_ENGINES`) so any of the 4 companion engines can be configured as `disabled`, `remote` (pointing to `https://kroki.io` or a custom third-party URL with explicit `🌐 (kroki.io)` label and non-confidential warning tooltip in `#engine-select`), or `local`.
   - Build the base Helm chart (`charts/disperse`) supporting standalone mode (`kroki.enabled: false` -> `https://kroki.io`) and self-hosted mode (`kroki.enabled: true`) with the core `yuzutech/kroki` Deployment serving all 25 built-in engines, single `Service` + Nginx `/kroki/` reverse-proxy path policy, `Ingress`, `Gateway API (HTTPRoute)`, and `extraManifests`.
2. **Phase 2 — Mermaid Full Tri-State Support (`local` | `remote` | `disabled`)**:
   - Integrate the `yuzutech/kroki-mermaid` sidecar container (`:8002`) in `kroki-deployment.yaml` when `kroki.sidecars.mermaid.mode == "local"`, allowing deployers to switch Mermaid seamlessly between `local` (in-cluster sidecar), `remote` (`kroki.io` third-party fallback), and `disabled` (`ENGINE_MODE_MERMAID`).
3. **Phase 3 — BPMN Full Tri-State Support (`local` | `remote` | `disabled`)**:
   - Integrate the `yuzutech/kroki-bpmn` sidecar container (`:8003`) when `kroki.sidecars.bpmn.mode == "local"`, supporting `local` sidecar, `remote` third-party fallback, and `disabled` (`ENGINE_MODE_BPMN`).
4. **Phase 4 — Excalidraw Full Tri-State Support (`local` | `remote` | `disabled`)**:
   - Integrate the `yuzutech/kroki-excalidraw` sidecar container (`:8004`) when `kroki.sidecars.excalidraw.mode == "local"`, supporting `local` sidecar, `remote` third-party fallback, and `disabled` (`ENGINE_MODE_EXCALIDRAW`).
5. **Phase 5 — Diagrams.net Engine & Full Tri-State Support (`local` | `remote` | `disabled`)**:
   - Add `diagramsnet` (`mode: 'xml'`, `examples/diagramsnet.txt`) to Disperse's engine catalog and integrate the `yuzutech/kroki-diagramsnet` sidecar container (`:8005`) when `kroki.sidecars.diagramsnet.mode == "local"`, supporting `local` sidecar, `remote` third-party fallback, and `disabled` (`ENGINE_MODE_DIAGRAMSNET`).
6. **Future Experimental Track — Bidirectional WYSIWYG Embedded Editors (`local` | `remote` | `disabled`)**:
   - For the 3 coordinate-based visual formats (**Diagrams.net / Draw.io**, **Excalidraw**, and **BPMN**), support replacing or toggling the right-hand preview panel with an embedded interactive visual editor (`embed.diagrams.net` `postMessage` iframe, `@excalidraw/excalidraw` canvas, and `bpmn-js` modeler) synchronized bidirectionally in real time with the left-hand Ace Editor and the compressed stateless URL / Kroki snippets.
   - **Note on Mermaid**: Unlike Draw.io (`mxGraphModel` XML), Excalidraw (JSON scene), and BPMN (`<bpmndi:BPMNDiagram>` XML) which persist explicit `x`/`y` node coordinates in their source code, Mermaid is a declarative auto-layout text DSL (`dagre`/`elk`) that does not store manual canvas coordinates in its syntax; therefore, Mermaid remains a text-first engine rather than a freeform WYSIWYG canvas.
   - **Dual `remote` vs. `local` Deployment for Embedded Visual Editors**:
     - **`remote` editor mode**: Embeds the visual editor from public third-party hosts/CDNs (e.g., `https://embed.diagrams.net/?embed=1&proto=json`, ESM CDN for Excalidraw/`bpmn-js`) paired with `https://kroki.io` (or local Kroki) for stateless image URLs—requiring **zero extra editor containers** in the cluster while displaying the explicit external/non-confidential warning in the UI.
     - **`local` editor mode**: Supports self-hosted in-cluster deployments of the visual editors in the Helm chart (e.g., deploying the official `jgraph/drawio` container or serving local static bundles for Excalidraw and `bpmn-js` behind the same unified Service/path policy) so air-gapped and high-confidentiality environments get full WYSIWYG editing without external network dependencies.


