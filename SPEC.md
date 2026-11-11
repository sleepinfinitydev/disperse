# Design and Functional Specification — DISPERSE

## 1. Overview
**DISPERSE** is a single-page web application (**SPA**) for creating and editing **Diagrams as Code**, inspired by **Niolesk** and powered by the public **Kroki** API (`https://kroki.io`) as its rendering engine.

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

## 3. Interface Layout

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

### 3.1. Top Bar (Header)
1. **Left**:
   - Brand link (`#brand-link`) composed of the `favicon.svg` logo, the uppercase **`DISPERSE`** title in `--color-primary`, and a chain link icon (`link`), with caption `"Copy current page link (Alt+L)"`. Its `href` is always synchronized with the full current page URL (`window.location.href` including the diagram state). Clicking it (or pressing `Alt + L`) does not reload or reset the editor; instead, it automatically copies the current URL to the clipboard with visual confirmation (`✓`).
2. **Center (Unified Segmented Toolbar, in order)**:
   - Contained within a single pill-shaped segmented bar (`.header-center`, `34px` uniform height with vertical dividers):
     1. **Refresh Button (`#refresh-btn`)**: Refresh icon (`refresh-cw`) with caption `"Refresh preview (Ctrl+R)"`.
        - **Keyboard shortcut**: `Ctrl + R` (or `Cmd + R`), intercepting the browser event (`e.preventDefault()`) to refresh the diagram without reloading the page.
     2. **Kroki Engine Dropdown (`#engine-select`)**: Lists all 28 engines supported by Kroki with caption `"Diagram language"`. Switching engines updates:
        - The Kroki rendering endpoint.
        - The editor's syntax highlighting mode.
        - The **per-engine code state**: the application preserves source code independently for each engine (`codeByEngine`), loading each engine's default example from `examples/{engine}.txt` on first use and retaining user edits when switching back and forth between languages.
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

### 3.2. Main Area (Editor + Preview)
- Occupies all available vertical space between header and footer (`flex: 1`).
- **Golden Ratio by default ($\varphi \approx 1.618$)**:
  - **Left Panel (Editor)**: $38.2\%$ of total width ($1 - 1/\varphi$).
  - **Right Panel (Preview)**: $61.8\%$ of total width ($1/\varphi$).
- **Resizable Splitter (`#splitter`)**:
  - Draggable bar via mouse/touch (`pointerdown` / `pointermove` with `setPointerCapture`) to resize both panels freely across the full range (`0%` - `100%`), allowing complete collapse of the editor or preview panel.
  - **Magnetic Snap**: When dragging near the default golden ratio ($38.2\% \pm 1.6\%$), the splitter snaps into place and highlights with `--color-tertiary`.
  - Double-clicking the splitter also restores the golden ratio ($38.2\% / 61.8\%$).
  - **Quick-Split Buttons**: Three quick-action buttons inside the splitter grip allow instant layout adjustments via click or keyboard shortcuts: Maximize editor (`#split-max-editor`, `Alt+1`), Reset split (`#split-reset`, `Alt+2`), and Maximize preview (`#split-max-viewer`, `Alt+3`).

#### Left Panel: Rich Code Editor
- Automatically receives focus (`editor.focus()`) on application startup so users can begin typing immediately.
- Line numbers, syntax highlighting matched to the diagram language, auto-closing brackets/quotes, `Tab` indentation, and code folding.
- Editor theme synchronized with the `oklch` color system and light/dark mode.
- Debounced preview update (`500ms` after typing stops) in addition to manual refresh via `Ctrl + R` or the refresh button.
- Floating action bar for text zoom and editing mode:
  - Increase font size (`#editor-font-in`, `plus` icon, `Alt+Shift++`)
  - Decrease font size (`#editor-font-out`, `minus` icon, `Alt+Shift+-`)
  - Reset font size (`#editor-font-fit`, `equal` icon, `Alt+Shift+0`)
  - Toggle Vim keybindings mode (`#editor-vim-mode`, `Alt+V`, persisted in `localStorage` with an animated glider icon when active)

#### Right Panel: Diagram Viewer (SVG / PNG)
- Full **Zoom** (mouse wheel, pinch gesture, `+` / `-` buttons) and **Pan** (canvas drag) support.
- Works uniformly for both **SVG** and **PNG** outputs.
- Floating action bar (icon-only):
  - Zoom In (`#zoom-in`, `Alt++`)
  - Zoom Out (`#zoom-out`, `Alt+-`)
  - Fit / Reset View (`#zoom-fit`, `Alt+0`)
  - Maximize / Restore Preview (`#maximize-preview`, toggling `maximize`/`minimize` icons, `Alt+Enter`): Collapses the editor panel to `0%` and fits the diagram to the full preview area, or restores the previous split percentage when clicked again.
  - Download file (`#download-btn`, `.svg` or `.png`, `Alt+D`)
- Visual loading spinner during requests.
- **Explicit rendering error display (`#viewer-error`)**: On syntax errors returned by Kroki (e.g., `HTTP 400`) or empty source code, it never fails silently. The previous diagram is cleared and a centered overlay card is displayed. The error border and alert icon are always rendered in **red** (`--color-error`, invariant to the user's color theme), while the inner `<pre>` error message block follows the active color scheme, uses a standard text cursor (`cursor: text`), and supports independent scrolling and text selection.

### 3.3. Bottom Bar (Publishing, Sharing Snippets & Local Files)
Compact panel for obtaining ready-to-publish links, snippets, and managing local files:
1. **Target types** (three rows identified by icons):
   - **Image (image icon)**: Points directly to the public Kroki API:
     `https://kroki.io/{engine}/{format}/{compressed_payload}`
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
4. **Collapsible Export Section**:
   - The three rows (Image, Editor, Local File) are grouped into a collapsible container (`#export-section`).
   - A toggle button (`#toggle-export-btn`) anchored to the top-left of the footer allows collapsing/expanding the section. It automatically adapts to a small square when collapsed and stays alongside the footer credits.
   - Expanding the preview to fullscreen (`Alt+Enter`) automatically collapses the export section if it is expanded, keeping the user interface clean and maximizing the viewport.
5. **Footer credits**:
   - Centered bottom credit line acknowledging the project, its license, and its dependencies: `Made with ❤️ in Betanzos · Copyleft 🄯 (GPLv3) by sleepinfinity.dev · Disperse was built on the shoulders of giants: Kroki, Ace, Panzoom, Pako, Lucide, and inspired by Niolesk.`

### 3.4. Responsive Design
1. **Desktop & Wide Screens (`> 900px`)**:
   - Horizontal split (Editor left `38.2%` | Vertical splitter | Viewer right `61.8%`).
2. **Tablets & Narrow Windows (`<= 900px`)**:
   - Stacked vertical layout (Editor top `38.2%` height | Horizontal draggable splitter with quick-maximize/reset buttons | Viewer bottom `61.8%` height).
3. **Mobile (`<= 600px`)**:
   - Compact wrapped header and touch-friendly controls (`>= 36px`).

### 3.5. Keyboard Shortcuts & Focus Flow
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

- **Focus & Tab Order**: On load, focus is placed directly inside the Ace code editor. Natural DOM order guides `Tab` navigation cleanly from the header toolbar through the editor, splitter, viewer actions, and footer buttons, skipping non-interactive read-only text fields and hidden inputs (`tabindex="-1"`).

---

## 4. Supported Kroki Engines

The engine dropdown includes all 28 engines from the public Kroki API, each mapped to its corresponding Ace Editor syntax mode, official documentation URL, and default template in `examples/{engine}.txt`:

1. `actdiag` (ActDiag)
2. `blockdiag` (BlockDiag)
3. `bpmn` (BPMN - XML)
4. `bytefield` (Bytefield - Clojure)
5. `c4plantuml` (C4 with PlantUML)
6. `d2` (D2 - **selected by default**)
7. `dbml` (DBML)
8. `ditaa` (Ditaa)
9. `erd` (Erd)
10. `excalidraw` (Excalidraw - JSON)
11. `graphviz` (GraphViz / DOT)
12. `mermaid` (Mermaid)
13. `nomnoml` (Nomnoml)
14. `nwdiag` (NwDiag)
15. `packetdiag` (PacketDiag)
16. `pikchr` (Pikchr)
17. `plantuml` (PlantUML)
18. `rackdiag` (RackDiag)
19. `seqdiag` (SeqDiag)
20. `structurizr` (Structurizr)
21. `svgbob` (Svgbob)
22. `symbolator` (Symbolator - VHDL/Verilog)
23. `tikz` (TikZ - LaTeX)
24. `umlet` (UMLet - XML)
25. `vega` (Vega - JSON)
26. `vegalite` (Vega-Lite - JSON)
27. `wavedrom` (WaveDrom - JSON)
28. `wireviz` (WireViz - YAML)

---

## 5. Encoding, Compression, and Kroki Communication

1. **Encoding Algorithm (Kroki Standard)**:
   - Encode editor text into UTF-8 (`TextEncoder`).
   - Compress using **Zlib Deflate** (level 9).
   - Convert the compressed buffer to **URL-safe Base64** (replacing `+` with `-` and `/` with `_`).
2. **Decoding (Loading from URL)**:
   - When opening Disperse with a `#engine/format/payload` hash, the URL-safe Base64 payload is decoded, inflated back to UTF-8, and loaded into the editor along with the specified engine and format.
3. **Rendering**:
   - Standard diagrams use `GET https://kroki.io/{engine}/{format}/{payload}`.
   - If a syntax error occurs, the error body returned by Kroki is displayed in the `#viewer-error` overlay.

---

## 6. Technical Architecture and Libraries (Vanilla + CDN)

Clean file structure requiring no build step:
- `index.html` — Semantic structure and CDN library imports.
- `favicon.svg` — Vector brand icon and logo (a prism dispersing a beam into 4 tetradic graph nodes).
- `css/styles.css` — Tetradic `oklch` color system, golden-ratio responsive layout, and light/dark themes.
- `js/app.js` — Initialization, per-engine application state, global keyboard shortcuts (`Ctrl/Cmd` and `Alt`/`Alt+Shift`), magnetic splitter, local file workflow, and events.
- `js/theme.js` — `sRGB → Oklab → OKLCH` conversion, tetradic palette generation, dynamic brand icon coloring, and light/dark mode toggle.
- `js/kroki.js` — Engine catalog, documentation links, cached lazy-loading of `examples/{engine}.txt`, compression/decompression, and Kroki URL builder.
- `js/viewer.js` — Diagram viewer (SVG and PNG) with zoom, pan, error overlay, and file download.
- `examples/*.txt` — Individual default example files for each of the 28 supported engines.
- `assets/screenshot.png` — Application screenshot referenced in `README.md`.

### External Libraries (via CDN)
- **Code Editor**: **Ace Editor** (`ace.js`, `keybinding-vim.min.js`).
- **Zoom & Pan**: **`@panzoom/panzoom`** (`panzoom.min.js`).
- **Compression**: **`pako`** (`pako.min.js`).
- **Iconography**: **`lucide`** (`lucide.min.js`).

---

## 7. Deployment and Containerization

- **`Containerfile`**: Builds an OCI image based on `nginx:stable` (Debian), linked to the repository via `LABEL org.opencontainers.image.source`, copying only the required static assets (`index.html`, `favicon.svg`, `css/`, `js/`, and `examples/`). It configures Nginx to listen on port `8765` (`ENV PORT=8765`, `EXPOSE 8765 80`) and prints the server URL (`Starting server at http://localhost:8765 ...`) on startup.
- **Running the Container**:
  ```bash
  docker run --rm -p 8765:8765 ghcr.io/sleepinfinitydev/disperse:latest
  ```
- **`Taskfile.yml`**: Provides development and packaging tasks:
  - `task run`: Starts a lightweight local web server (`python3 -m http.server`) on port `8765` by default (configurable via `PORT`, e.g., `task run PORT=9000`).
  - `task build`: Builds the container image (`ghcr.io/sleepinfinitydev/disperse` by default, configurable via `IMAGE=...`) tagged with both the short Git commit hash (`git rev-parse --short HEAD`) and `latest`, auto-detecting `podman` or `docker`.
  - `task push`: Builds and pushes both tags (`:{{.GIT_HASH}}` and `:latest`) to the container registry.
- **GitHub Actions (`.github/workflows/oci-image.yml`)**: Automatically builds the OCI image from `Containerfile` and pushes both `:<git-short-hash>` and `:latest` tags to GitHub Container Registry (`ghcr.io/sleepinfinitydev/disperse`) on every push to `main` using `GITHUB_TOKEN` with minimal permissions (`contents: read`, `packages: write`).
