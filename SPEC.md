# Design and Functional Specification — DISPERSE

## 1. Overview
**DISPERSE** is a single-page web application (**SPA**) for creating and editing **Diagrams as Code**, inspired by **Niolesk** and powered by the **Kroki** API (`https://kroki.io` by default, or a self-hosted Kroki backend) as its rendering engine.

### Core Principles
- **Technology**: HTML5, CSS3, and Vanilla JavaScript (ES6+), with no UI frameworks, relying only on lightweight libraries for code editing, zoom/pan, iconography, and compression. All source code, comments, documentation, and UI text are in **English** (`lang="en"`).
- **Zero-Text / Icon-First UI**: The interface contains no static text other than the `DISPERSE` brand title and footer credits (along with technical engine/format dropdown values and generated URLs/snippets). All actions and controls are represented using **vector icons (SVG)**.
- **Stateless URL Sharing & Per-Language Local Persistence**: Any diagram can be shared via a self-contained URL carrying the compressed and encoded source code in Kroki's standard format. Simultaneously, each diagram language maintains an isolated workspace draft in `localStorage` so switching languages never causes cross-syntax rendering errors or work loss, while shared `#hash` URLs take precedence on load without overwriting existing local drafts until modified.
- **12-Factor Configuration via Environment Variables**: Disperse strictly adheres to the **[Twelve-Factor App (Factor III: Config)](https://12factor.net/config)** methodology for deployment and runtime configuration. Environment-specific settings (such as listening port `PORT`, rendering backend `KROKI_BASE_URL`, and customizable footer credits `FOOTER_CREDITS`) are injected via environment variables at runtime into `js/config.js` (`window.DISPERSE_CONFIG`) without modifying source code or rebuilding container images, while providing sensible defaults out of the box.

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
| DISPERSE  [ ↻ | ▶ | 📄+ | Engine v | 📖 | Layout v | Theme v | Format v ] (☀/☾)(●)(⛶) | <- Header
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
     1. **Refresh Button (`#refresh-btn`)**: Refresh icon (`refresh-cw`) with caption `"Refresh preview (Ctrl+R)"` (updated to `"Refresh preview — unrendered changes (Ctrl+R)"` and highlighted in `--color-tertiary` via `.stale` when auto-render is disabled and the editor contains unrendered changes).
        - **Keyboard shortcut**: `Ctrl + R` (or `Cmd + R`), intercepting the browser event (`e.preventDefault()`) to refresh the diagram without reloading the page.
     2. **Auto-Render Toggle Button (`#autorender-btn`)**: Toggle button (`aria-pressed="true|false"`, `.active` when enabled, persisted in `localStorage` under `disperse-autorender` and enabled by default) with a play icon (`play`) and caption `"Toggle auto-render (Alt+R)"`.
        - **Keyboard shortcut**: `Alt + R`.
        - **When enabled (`true`, default)**: Typing in the code editor triggers a debounced (`500ms`) render of the diagram preview alongside state synchronization.
        - **When disabled (`false`)**: Typing in the code editor still synchronizes the per-language `localStorage` draft, compressed URL `#hash`, sharing snippets, and local file auto-save (`syncState(false)`), without issuing Kroki HTTP requests or pushing partial code edits into WYSIWYG canvases, and marks `#refresh-btn` as `.stale`. Explicit context changes—initial page load, switching diagram language (`#engine-select`), resetting to example (`#new-btn`), opening/dropping a local file, changing D2 layout/theme or output format, manual refresh (`Ctrl/Cmd + R`), and re-enabling auto-render while `.stale`—always trigger an immediate render.
     3. **New Diagram / Reset to Example Button (`#new-btn`)**: New-document icon (`file-plus`) with caption `"New diagram / Reset to example (Alt+N)"`.
        - **Keyboard shortcut**: `Alt + N`.
        - **Behavior**: Restores the active language's default example (`examples/{engine}.txt`), removes its saved `localStorage` draft (`disperse-draft:{engine}`), resets D2 layout/theme selectors to defaults when `d2` is active, clears Ace Editor's `UndoManager` history, detaches any open local file (`fileState`), and re-renders centered (`centerView: true`).
        - **Confirmation guard**: Prompts `window.confirm(...)` before resetting whenever the current editor code differs from the active language's stock example or when an open local file has unsaved changes (`fileState.isDirty`).
     4. **Kroki Engine Dropdown (`#engine-select`)**: Lists all 28 engines supported by Kroki (32 entries in total, grouped into Featured Code Languages including 5 C4-PlantUML diagram types at the top, followed by a visual separator, the remaining code engines in alphabetical order, a second visual separator, and Embedded Visual Editors marked as `Beta` at the bottom) with caption `"Diagram language"` (updated to `"Diagram language (Experimental / Beta editor)"` when a `Beta` visual editor is active). Switching engines performs an isolated workspace transition:
        - **Local file guard & detachment**: If a local file is currently open (`fileState.name`), checks `fileState.isDirty` and asks `window.confirm(...)` before detaching (reverting `#engine-select` to the previous engine if cancelled). Detaching `fileState` prevents auto-save or `Ctrl+S` from accidentally overwriting a local file with source code from another language.
        - **Outgoing & incoming per-language drafts**: Flushes the outgoing language's in-browser draft to `localStorage` (`disperse-draft:{prevEngine}`, when eligible), updates `disperse-last-engine`, and loads the newly selected language's saved draft from `localStorage` (`disperse-draft:{nextEngine}`)—or loads its default template from `examples/{nextEngine}.txt` when no saved draft exists.
        - **Editor & preview update**: Updates the Kroki rendering endpoint (`c4plantuml-*` variants map to `c4plantuml`), updates Ace syntax highlighting mode and `#docs-btn` `href`, resets Ace's `UndoManager` so undo history never crosses language boundaries, adjusts the WYSIWYG splitter state, and **always renders** the newly loaded diagram immediately (even if auto-render is disabled).
     5. **Language Documentation Link (`#docs-btn`)**: Anchor with an open-book icon (`book-open`) and caption `"Language documentation"`, opening the selected language's official documentation in a new tab (`target="_blank"`).
     6. **Layout Engine Dropdown (`#layout-select`)**: Selectable layout engines for D2 (`dagre`, `elk`, `tala`), with caption `"Layout engine (D2)"`. Enabled only when `d2` is selected and disabled for all other engines.
     7. **Diagram Theme Dropdown (`#theme-select`)**: Selectable themes for D2 (`default`, `neutral-gray`, `flagship-terrastruct`, `cool-classics`, `mixed-berry-blue`, `grape-soda`, `aubergine`, `colorblind-clear`, `vanilla-nitro-cola`, `orange-creamsicle`, `shirley-temple`, `earth-tones`, `everglade-green`, `buttered-toast`, `dark-mauve`, `dark-flagship-terrastruct`, `terminal`, `terminal-grayscale`, `origami`, `c4`), with caption `"Diagram theme (D2)"`. Enabled only when `d2` is selected and disabled for all other engines.
     8. **Output Format Dropdown (`#format-select`)**: `svg` (default) and `png`, with caption `"Output format"`.
3. **Right (Visual Preferences)**:
   - **Light / Dark Mode Button (`#theme-btn`)**: Circular button with a sun/moon icon and caption `"Toggle light/dark theme (Alt+T)"`.
   - **Preferred Color Button (`#color-swatch`)**: Circular button **of the exact same diameter** as the theme button, filled with the current preferred color (`rgb(0, 128, 192)` by default) and caption `"Preferred theme color"`. Clicking it opens the native `<input type="color">` (which has `tabindex="-1"` so keyboard focus stays on `#color-swatch`).
   - **Fullscreen Button (`#fullscreen-btn`)**: Circular button of matching diameter with `maximize`/`minimize` icons and caption `"Toggle fullscreen (F11)"`.
4. **Captions / Tooltips (`[data-tooltip]`)**:
   - All icon buttons and controls across the header, splitter, editor/viewer toolbars, and publishing footer display instant hover/focus captions indicating their action and keyboard shortcut where applicable (e.g., `Refresh preview (Ctrl+R)`, `Download diagram (Alt+D)`, `Save local file (Ctrl+S)`).

### 4.2. Main Area (Editor + Preview)
- Occupies all available vertical space between header and footer (`flex: 1`).
- **Golden Ratio by default ($\varphi \approx 1.618$)**:
  - **Left Panel (Editor)**: $38.2\%$ of total width ($1 - 1/\varphi$) for text-first engines, and **collapsed ($0\%$) by default** when a graphical WYSIWYG engine (`excalidraw`, `bpmn`) is active.
  - **Right Panel (Preview / WYSIWYG Editor)**: $61.8\%$ of total width ($1/\varphi$) for text-first engines, and **$100\%$ by default** when a graphical WYSIWYG engine is active.
- **Resizable Splitter (`#splitter`)**:
  - Draggable bar via mouse/touch (`pointerdown` / `pointermove` with `setPointerCapture`) to resize both panels freely across the full range (`0%` - `100%`), allowing complete collapse of the editor or preview panel.
  - **Automatic WYSIWYG Collapse & Restore**: Selecting a graphical WYSIWYG engine (`Excalidraw (Editor)` or `BPMN (Editor)`) or opening an `#excalidraw/...` / `#bpmn/...` URL automatically collapses the code editor panel to `0%` so the visual canvas occupies the entire workspace. Users can expand the code editor at any time (via dragging `#splitter`, double-clicking it, or pressing `Alt+2` / `Alt+Enter`) to inspect or edit the live synchronized code. Switching back to a text-based engine automatically restores the `38.2%` split.
  - **Magnetic Snap**: When dragging near the default golden ratio ($38.2\% \pm 1.6\%$), the splitter snaps into place and highlights with `--color-tertiary`.
  - Double-clicking the splitter also restores the golden ratio ($38.2\% / 61.8\%$).
  - **Quick-Split Buttons**: Three quick-action buttons inside the splitter grip allow instant layout adjustments via click or keyboard shortcuts: Maximize editor (`#split-max-editor`, `Alt+1`), Reset split (`#split-reset`, `Alt+2`), and Maximize preview (`#split-max-viewer`, `Alt+3`).

#### Left Panel: Rich Code Editor
- Automatically receives focus (`editor.focus()`) on application startup for text-first engines so users can begin typing immediately.
- Line numbers, syntax highlighting matched to the diagram language, auto-closing brackets/quotes, `Tab` indentation, and code folding.
- Editor theme synchronized with the `oklch` color system and light/dark mode.
- Debounced state synchronization (`500ms` after typing stops): persists the active language's draft to `localStorage`, updates the URL `#hash` and sharing snippets, triggers local file auto-save when active, and—when auto-render (`#autorender-btn`, `Alt+R`) is enabled—updates the diagram preview. Manual refresh is always available via `Ctrl/Cmd + R` or `#refresh-btn`.
- Isolated undo history: resetting the diagram, opening a local file, or switching languages resets Ace Editor's `UndoManager` so `Ctrl+Z` never undoes into a previous document or language.
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
  - Activated automatically when a graphical WYSIWYG engine (`Excalidraw (Editor)` or `BPMN (Editor)`) is selected or when a `.excalidraw` / `.bpmn` file is opened/dropped.
  - Lazy-loads each visual editor on demand into isolated panes (`#wysiwyg-excalidraw`, `#wysiwyg-bpmn`) without impacting initial page load for other languages:
    - **Excalidraw**: `@excalidraw/excalidraw` (`https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js` with `window.EXCALIDRAW_ASSET_PATH = 'https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/'`).
    - **BPMN**: `bpmn-js` (`https://unpkg.com/bpmn-js@17.11.1/dist/bpmn-modeler.production.min.js` and its `diagram-js.css`, `bpmn-js.css`, and `bpmn-embedded.css` stylesheets).
  - **Bidirectional Real-Time Synchronization**:
    - **Canvas → Code Editor & URLs**: Drawing or modifying elements on the Excalidraw canvas (`serializeAsJSON`) or BPMN modeler (`commandStack.changed` → `saveXML({ format: true })`) updates the Ace code editor, recalculates the compressed URL hash (`#excalidraw/...`, `#bpmn/...`) and Kroki/Disperse sharing snippets (`https://kroki.io/excalidraw/svg/...`, `https://kroki.io/bpmn/svg/...`), and triggers local file auto-save when active.
    - **Code Editor / File → Canvas**: Editing the JSON/XML in the Ace editor, loading a URL, or opening/dropping a `.excalidraw` or `.bpmn` file restores and updates the live visual scene (`updateScene` / `importXML`).
  - **Payload Size Guard & Disabled Library (Excalidraw)**: Disables the Excalidraw image tool (`UIOptions.tools.image: false`), blocks pasting binary/image elements (`onPaste`), strips binary `files` during serialization so Base64 images cannot bloat the JSON or exceed Kroki's GET URL length limits, and disables Excalidraw's Library button, sidebar, and `"Add to library"` context menu item.
  - **Theme, Style Isolation & Native Controls**: Synchronizes with Disperse's light/dark mode (`Alt+T`), scopes Disperse's root layout and form selectors (`body > header`, `body > main`, `body > footer`, `:where(:not(#wysiwyg-container *))`) so they never override internal WYSIWYG semantic elements (such as Excalidraw's bottom `<footer class="layer-ui__wrapper__footer">` bar containing zoom, undo/redo, and help controls), disables `@panzoom/panzoom` pointer capture while a WYSIWYG editor is active (`panzoom-exclude` / `setPanzoomEnabled(false)`), and hides Disperse's floating `.viewer-actions` toolbar (`#viewer-container.wysiwyg-active .viewer-actions { display: none }`) so each visual editor's native canvas interactions are used without interference (while global shortcuts such as `Alt++`, `Alt+-`, `Alt+0`, `Alt+Enter`, and `Alt+D` remain available).
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
   - **Image (image icon)**: Points directly to the configured Kroki API base URL (`https://kroki.io` by default, or a dedicated self-hosted Kroki endpoint such as `http://kroki.127.0.0.1.nip.io` — or `https://kroki.io` for specific engines configured in `remote` mode):
     `{kroki_base_url}/{engine}/{format}/{compressed_payload}`
   - **Editor (pencil icon)**: Points to this Disperse instance with state in the URL hash:
     `{current_origin}/#{engine}/{format}/{compressed_payload}`
   - **Local File (hard drive icon)**: Progressive local file workflow. Includes actions to Open (`Ctrl+O`), Save (`Ctrl+S`), Save As (`Ctrl+Shift+S`), and Toggle Auto-Save (`Alt+A`). It supports dragging and dropping files directly onto the window (via `#drop-overlay`).
     - **Automatic Format & Language Detection**: Opening or dropping a local file inspects its filename extension (supporting compound extensions such as `.vg.json` and `.vl.json`, dedicated extensions such as `.d2`, `.mmd`/`.mermaid`, `.dbml`, `.puml`/`.plantuml`/`.iuml` with C4 diagram variant detection, `.bpmn`, `.excalidraw`, `.dot`/`.gv`, `.dsl`, `.ditaa`, `.erd`, `.nomnoml`, `.pikchr`, `.uxf`, `.vhd`/`.vhdl`/`.v`/`.sv`, `.tex`/`.tikz`, `.yml`/`.yaml`, `.clj`/`.edn`, and lightweight content inspection for generic `.json` and `.xml` files) and automatically switches `#engine-select` to the corresponding language after flushing any prior in-browser draft.
     - **Safe Detachment & Reload Guard**: Manually switching languages in `#engine-select` or clicking New / Reset (`#new-btn`) detaches the linked local file (after confirming if `fileState.isDirty`). The browser `beforeunload` warning prompt is triggered **exclusively** when a local file is open with unsaved changes on disk (`fileState.name && fileState.isDirty`), avoiding unnecessary prompts during normal `localStorage`-backed browser editing.
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
5. **Footer credits (`#footer-credits`)**:
   - **Default value**: Centered bottom credit line acknowledging the project, its license, and its dependencies, rendered with Lucide vector icons (`heart` tinted in `--color-tertiary` and horizontally flipped `copyright` icon representing copyleft) instead of native Unicode emojis/glyphs to avoid platform-specific rendering anomalies:
     `Made with <heart> in Betanzos · Copyleft <copyleft> (GPLv3) by sleepinfinity.dev · Disperse was built on the shoulders of giants: Kroki, Excalidraw, bpmn.io, Ace, Panzoom, Pako, Lucide, and inspired by Niolesk.`
   - **12-Factor Environment Variable Customization (`FOOTER_CREDITS`)**:
     - Customizable at runtime via the `FOOTER_CREDITS` environment variable (or `DISPERSE_FOOTER_CREDITS`), exposed to the frontend as `window.DISPERSE_CONFIG.footerCredits` (`js/config.js`) and applied by `initFooterCredits()` in `js/app.js` prior to `lucide.createIcons()`.
     - Supports plain text, HTML links (`<a href="...">`), and inline Lucide icon tags (`<i data-lucide="..."></i>`), which automatically inherit the active theme's typography and `--color-primary` link styling.
     - If `FOOTER_CREDITS` is unset, the default credit line above is displayed. If `FOOTER_CREDITS` is explicitly set to an empty or whitespace-only string (`FOOTER_CREDITS=""`), `#footer-credits` is hidden (`display: none`).

### 4.4. Responsive Design
1. **Desktop & Wide Screens (`> 900px`)**:
   - Horizontal split (Editor left `38.2%` | Vertical splitter | Viewer right `61.8%`).
2. **Tablets & Narrow Windows (`<= 900px`)**:
   - Stacked vertical layout (Editor top `38.2%` height | Horizontal draggable splitter with quick-maximize/reset buttons | Viewer bottom `61.8%` height).
3. **Mobile (`<= 600px`)**:
   - Compact wrapped header and touch-friendly controls (`>= 36px`).

### 4.5. Keyboard Shortcuts & Focus Flow
All keyboard shortcuts are reflected in their corresponding control tooltips (`data-tooltip`) and `aria-label` attributes, and support main keyboard keys, numeric keypad (`Numpad`) keys, and layout-independent `KeyboardEvent.code` matching across international and macOS `Option` layouts:

| Shortcut | Action | Control |
| :--- | :--- | :--- |
| `Ctrl/Cmd + R` | Refresh diagram preview | `#refresh-btn` |
| `Alt + R` | Toggle auto-render preview | `#autorender-btn` |
| `Alt + N` | New diagram / Reset to example | `#new-btn` |
| `Ctrl/Cmd + O` | Open local file | `#file-open-btn` |
| `Ctrl/Cmd + S` | Save local file (or download source fallback) | `#file-save-btn` |
| `Ctrl/Cmd + Shift + S` | Save local file as... | `#file-save-as-btn` |
| `Alt + A` | Toggle local file auto-save | `#file-autosave-btn` |
| `Alt + T` | Toggle light/dark theme | `#theme-btn` |
| `F11` | Toggle fullscreen | `#fullscreen-btn` |
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

### 5.1. Featured Code Languages (Top of List)
Displayed at the top of `#engine-select` above the first disabled separator (`──────────────`):
1. `d2` (`d2` — D2, **selected by default**)
2. `mermaid` (`mermaid` — Mermaid)
3. `dbml` (`dbml` — DBML / SQL Database Markup Language)
4. `c4plantuml-context` (`c4plantuml (context)` — C4 System Context diagram via `c4plantuml` Kroki engine)
5. `c4plantuml-container` (`c4plantuml (container)` — C4 Container diagram via `c4plantuml` Kroki engine)
6. `c4plantuml-component` (`c4plantuml (component)` — C4 Component diagram via `c4plantuml` Kroki engine)
7. `c4plantuml-dynamic` (`c4plantuml (dynamic)` — C4 Dynamic diagram via `c4plantuml` Kroki engine)
8. `c4plantuml-deployment` (`c4plantuml (deployment)` — C4 Deployment diagram via `c4plantuml` Kroki engine)

### 5.2. Remaining Code Engines (Alphabetical Order)
Displayed below the first separator and above the second disabled separator (`──────────────`):
9. `actdiag` (ActDiag)
10. `blockdiag` (BlockDiag)
11. `bytefield` (Bytefield - Clojure)
12. `ditaa` (Ditaa)
13. `erd` (Erd)
14. `graphviz` (GraphViz / DOT)
15. `nomnoml` (Nomnoml)
16. `nwdiag` (NwDiag)
17. `packetdiag` (PacketDiag)
18. `pikchr` (Pikchr)
19. `plantuml` (PlantUML)
20. `rackdiag` (RackDiag)
21. `seqdiag` (SeqDiag)
22. `structurizr` (Structurizr)
23. `svgbob` (Svgbob)
24. `symbolator` (Symbolator - VHDL/Verilog)
25. `tikz` (TikZ - LaTeX)
26. `umlet` (UMLet - XML)
27. `vega` (Vega - JSON)
28. `vegalite` (Vega-Lite - JSON)
29. `wavedrom` (WaveDrom - JSON)
30. `wireviz` (WireViz - YAML)

### 5.3. Embedded Visual Editors (Experimental / Beta — Bottom of List)
Displayed at the bottom of `#engine-select` below the second disabled separator (`──────────────`):
31. `excalidraw` (`Excalidraw (Editor · Beta)` — Embedded interactive Excalidraw WYSIWYG editor + JSON, `wysiwyg: true`, `beta: true`)
32. `bpmn` (`BPMN (Editor · Beta)` — Embedded interactive BPMN 2.0 WYSIWYG modeler via `bpmn-js` + XML, `wysiwyg: true`, `beta: true`)

---

## 6. Encoding, Compression, Workspace Persistence, and Kroki Communication

1. **Encoding Algorithm (Kroki Standard)**:
   - Encode editor text into UTF-8 (`TextEncoder`).
   - Compress using **Zlib Deflate** (level 9).
   - Convert the compressed buffer to **URL-safe Base64** (replacing `+` with `-` and `/` with `_`).
2. **Decoding & Startup Precedence (`#hash` URL vs. `localStorage`)**:
   - **With URL `#engine/format/payload[?layout=...&theme=...]` hash (Shared Link)**: The URL payload always takes precedence on startup—decoding and loading the specified engine, format, options, and source code. To protect the user's own local workspace, opening an external `#hash` URL whose content differs from the existing `localStorage` draft for that engine **does not overwrite** `disperse-draft:{engine}` until the user makes a modification in the editor/canvas (if the user switches languages without modifying it, their previous local draft remains intact). If the `#hash` URL specifies a known engine that has been administratively disabled on the instance (`disabled`), Disperse preserves `window.location.hash` intact, displays the decoded source code in the editor without persisting it, and shows an explicit notice in `#viewer-error`.
   - **Without URL `#hash` (Clean Root Visit)**: Restores the last active language from `disperse-last-engine` (defaulting to `d2`) and loads its saved draft from `disperse-draft:{engine}` (including D2 `layout`/`theme` when applicable), falling back to `examples/{engine}.txt` if no draft exists.
3. **Per-Language `localStorage` Persistence**:
   - Each of the 32 selectable entries in `#engine-select` stores its own draft independently under `disperse-draft:{engineId}` (JSON `{ code, layout?, theme? }`), alongside `disperse-last-engine` and `disperse-autorender` (`'true'` by default).
   - Whenever an engine's code matches its stock template (`examples/{engineId}.txt`) and uses default options, `disperse-draft:{engineId}` is removed from `localStorage` to keep storage clean.
   - While a local file (`fileState.name`) is open, edits track against that file rather than overwriting the language's scratchpad draft; any pending in-browser draft is flushed synchronously on `beforeunload`. All `localStorage` operations are wrapped in `try/catch` to handle private browsing or quota limits gracefully.
4. **Rendering & SVG Sanitization**:
   - Standard diagrams use `GET {kroki_base_url}/{engine}/{format}/{payload}` (where `{kroki_base_url}` defaults to `https://kroki.io` and can be configured at runtime via `window.DISPERSE_CONFIG.krokiBaseUrl`, or routed to `window.DISPERSE_CONFIG.krokiRemoteUrl` for engines in `remote` mode).
   - **Client-Side SVG Sanitization (`js/viewer.js`)**: Before mounting any rendered SVG into `#viewer`, Disperse parses it via `DOMParser` (`parseAndSanitizeSvg`) and strips executable scripts (`<script>`), dangerous embedded elements (`<iframe>`, `<object>`, `<embed>`, `<form>`, `<meta>`, `<link>`, `<base>`), inline event handlers (`on*`), unsafe SMIL attribute mutations (`<set>`, `<animate*>`), external `<use>` references, unsafe URI schemes (`javascript:`, `vbscript:`, `file:`, non-raster `data:`), and CSS `expression()`/`@import` vectors—while preserving legitimate `<style>` rules, embedded `@font-face` fonts, `<foreignObject>` HTML node labels (e.g., Mermaid and D2), and external `http(s):`/`mailto:` links (forcing `target="_blank"` and `rel="noopener noreferrer"`). The sanitized `<svg>` node is mounted via `document.importNode` + `replaceChildren` (never raw `innerHTML`).
   - If a syntax or rendering error occurs, the error body returned by Kroki is displayed as plain text (`textContent`) in the `#viewer-error` overlay.

---

## 7. Technical Architecture and Libraries (Vanilla + CDN)

Clean file structure requiring no build step:
- `index.html` — Semantic structure and CDN library imports.
- `favicon.svg` — Vector brand icon and logo (a prism dispersing a beam into 4 tetradic graph nodes).
- `css/styles.css` — Tetradic `oklch` color system, golden-ratio responsive layout, and light/dark themes.
- `js/config.js` — 12-Factor runtime configuration object (`window.DISPERSE_CONFIG`) providing default values (`krokiBaseUrl`, `footerCredits`) and generated at container startup from environment variables by Nginx's entrypoint script (`Containerfile`).
- `js/app.js` — Initialization (including `initFooterCredits()`), per-engine `localStorage` workspace persistence, auto-render and reset/new workflows, global keyboard shortcuts (`Ctrl/Cmd`, `Alt`/`Alt+Shift`, `F11`), magnetic splitter, local file workflow with format auto-detection, and events.
- `js/theme.js` — `sRGB → Oklab → OKLCH` conversion, tetradic palette generation, dynamic brand icon coloring, and light/dark mode toggle.
- `js/kroki.js` — Engine catalog, documentation links, file-extension/content language detection, cached lazy-loading of `examples/{engine}.txt`, compression/decompression, and Kroki URL builder.
- `js/viewer.js` — Diagram viewer (SVG and PNG) with `DOMParser`-based SVG XSS sanitization, zoom, pan, error overlay, and file download.
- `js/wysiwyg.js` — Lazy-loaded embedded WYSIWYG visual editors (`@excalidraw/excalidraw` and `bpmn-js`) with bidirectional Ace Editor / URL synchronization and client-side SVG/PNG export.
- `examples/*.txt` — Individual default example files for each of the 32 selectable engine/template entries (28 Kroki engines including 5 C4-PlantUML diagram types).
- `assets/screenshot.png` — Application screenshot referenced in `README.md`.

### External Libraries (via CDN)
- **Code Editor**: **Ace Editor** (`ace.js`, `keybinding-vim.min.js`).
- **Zoom & Pan**: **`@panzoom/panzoom`** (`panzoom.min.js`).
- **Compression**: **`pako`** (`pako.min.js`).
- **Iconography**: **`lucide`** (`lucide.min.js`).
- **WYSIWYG Visual Editors (Lazy-Loaded on Demand)**:
  - **`@excalidraw/excalidraw`** (`https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js` with `react@18.3.1` and `react-dom@18.3.1`).
  - **`bpmn-js`** (`https://unpkg.com/bpmn-js@17.11.1/dist/bpmn-modeler.production.min.js` and stylesheets).

---

## 8. 12-Factor Configuration, Deployment, and Containerization

### 8.1. Twelve-Factor App Configuration Model (Factor III: Config)
Disperse follows the **[Twelve-Factor App](https://12factor.net/config)** methodology for all deployment and runtime configuration:
1. **Strict Separation of Config from Code**: No deployment-specific URLs, ports, or organizational branding/footer credits need to be hardcoded or require rebuilding the application or OCI image.
2. **Environment Variables as the Single Configuration Interface**: All runtime configuration—both in standalone OCI containers and in Kubernetes (`charts/disperse`)—is supplied strictly via standard environment variables (`PORT`, `KROKI_BASE_URL`, `KROKI_REMOTE_URL`, `ENGINE_MODE_*`, `KROKI_DISABLED_ENGINES`, `FOOTER_CREDITS`).
3. **Sensible Defaults**: Every environment variable has a documented default value embedded in `js/config.js` and `Containerfile`, ensuring zero-configuration startup out of the box.
4. **Runtime Injection for Static SPA (`js/config.js` -> `window.DISPERSE_CONFIG`)**:
   - In **OCI containers (`Containerfile`)**, the unprivileged Nginx entrypoint script (`/docker-entrypoint.d/40-disperse.sh`) reads the container's environment variables on startup, writes `/tmp/disperse-config.js` (and `/usr/share/nginx/html/js/config.js` when writable), and configures `/tmp/disperse-nginx.conf` to serve `/js/config.js` with `Cache-Control: no-store, no-cache, must-revalidate`—compatible with `readOnlyRootFilesystem: true` when `/tmp` is mounted as a `tmpfs` / `emptyDir`.
   - In **local development (`Taskfile.yml` `task run`)**, `js/config.js` is generated from `KROKI_BASE_URL`, `KROKI_REMOTE_URL`, `ENGINE_MODE_*`, `KROKI_DISABLED_ENGINES`, and `FOOTER_CREDITS` / `DISPERSE_FOOTER_CREDITS` (properly honoring `FOOTER_CREDITS=""` to hide the footer) before starting `python3 -m http.server`, and restored via `defer` on exit.

| Environment Variable | `window.DISPERSE_CONFIG` Key | Default Value | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | *(Server / Nginx)* | `8765` | Unprivileged HTTP listening port for the container (`UID 101`) or local server. |
| `FOOTER_CREDITS` *(alias: `DISPERSE_FOOTER_CREDITS`)* | `footerCredits` | `'Made with <i data-lucide="heart" class="heart-icon"></i> in Betanzos · Copyleft <i data-lucide="copyright" class="copyleft-icon"></i> (<a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">GPLv3</a>) by <a href="https://sleepinfinity.dev" target="_blank" rel="noopener noreferrer">sleepinfinity.dev</a> · <a href="https://github.com/sleepinfinitydev/disperse" target="_blank" rel="noopener noreferrer">Disperse</a> was built on the shoulders of giants: <a href="https://kroki.io" target="_blank" rel="noopener noreferrer">Kroki</a>, <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer">Excalidraw</a>, <a href="https://bpmn.io" target="_blank" rel="noopener noreferrer">bpmn.io</a>, <a href="https://ace.c9.io" target="_blank" rel="noopener noreferrer">Ace</a>, <a href="https://github.com/timmywil/panzoom" target="_blank" rel="noopener noreferrer">Panzoom</a>, <a href="https://github.com/nodeca/pako" target="_blank" rel="noopener noreferrer">Pako</a>, <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer">Lucide</a>, and inspired by <a href="https://niolesk.top" target="_blank" rel="noopener noreferrer">Niolesk</a>.'` | Custom text/HTML (supporting `<a>` links and `<i data-lucide="...">` icons) rendered in `#footer-credits`. Setting `FOOTER_CREDITS=""` hides the footer credit line completely. |
| `KROKI_BASE_URL` | `krokiBaseUrl` | `'https://kroki.io'` | Primary base URL of the Kroki rendering API (supports absolute URLs or relative paths). |
| `KROKI_REMOTE_URL` | `krokiRemoteUrl` | `'https://kroki.io'` | Fallback external Kroki URL used by companion engines configured in `remote` mode when `KROKI_BASE_URL` differs. |
| `ENGINE_MODE_MERMAID`, `ENGINE_MODE_BPMN`, `ENGINE_MODE_EXCALIDRAW` | `engineModes.{mermaid,bpmn,excalidraw}` | `'local'` | Per-engine mode (`local` \| `remote` \| `disabled`). When `remote` (and `KROKI_BASE_URL !== KROKI_REMOTE_URL`), adds `🌐 (<host>)` and a non-confidential warning tooltip in `#engine-select` and routes requests to `KROKI_REMOTE_URL`. When `disabled`, hides the engine from `#engine-select`. |
| `KROKI_DISABLED_ENGINES` | `disabledEngines` | `''` | Optional comma-separated list of engine IDs to hide from `#engine-select`. |

### 8.2. Containerization & Local Tooling
- **`Containerfile`**: Builds a hardened, non-root OCI image based on **`nginxinc/nginx-unprivileged:stable`** (`USER 101`, group `0`-writable assets for OpenShift/Kubernetes compatibility), linked to the repository via `LABEL org.opencontainers.image.source` and `org.opencontainers.image.description`, copying only the required static assets (`index.html`, `favicon.svg`, `css/`, `js/`, and `examples/`, scoped by `.dockerignore`). Nginx serves static files exclusively (no reverse proxy) on port `8765` (`ENV PORT=8765`, `EXPOSE 8765`).
  - **Runtime Configuration (`/docker-entrypoint.d/40-disperse.sh`)**:
    - Validates `PORT` is numeric (`8765` fallback) and writes `/tmp/disperse-nginx.conf` (included from `/etc/nginx/nginx.conf`).
    - Escapes `\`, `"`, `\r`, `\t`, and `\n` safely when generating `/tmp/disperse-config.js` from `KROKI_BASE_URL`, `KROKI_REMOTE_URL`, `ENGINE_MODE_MERMAID`, `ENGINE_MODE_BPMN`, `ENGINE_MODE_EXCALIDRAW`, `KROKI_DISABLED_ENGINES`, and `FOOTER_CREDITS` / `DISPERSE_FOOTER_CREDITS`.
    - Serves `/js/config.js` with `Cache-Control: no-store, no-cache, must-revalidate` and runs cleanly under `--read-only --tmpfs /tmp --cap-drop=ALL`.
- **`README.md`**: Organized following the **[Diátaxis](https://diataxis.fr/)** documentation framework (Tutorials for Docker and local K3s + Helm deployment, How-To Guides for sidecar modes and separate Ingress/Gateway API exposure, Reference tables, and Architecture/Privacy Explanations).
- **Running the Container**:
  ```bash
  # Default configuration
  docker run --rm -p 8765:8765 ghcr.io/sleepinfinitydev/disperse:latest

  # Custom footer credits via 12-Factor environment variable
  docker run --rm -p 8765:8765 \
    -e FOOTER_CREDITS='Internal Diagrams · <a href="https://example.com" target="_blank">Platform Team</a>' \
    ghcr.io/sleepinfinitydev/disperse:latest
  ```
- **`Taskfile.yml`**: Provides development and packaging tasks:
  - `task run`: Generates `js/config.js` from 12-Factor environment variables (`KROKI_BASE_URL`, `KROKI_REMOTE_URL`, `ENGINE_MODE_*`, `KROKI_DISABLED_ENGINES`, `FOOTER_CREDITS` / `DISPERSE_FOOTER_CREDITS`), starts `python3 -m http.server` on port `8765` by default (`PORT=...`), and restores `js/config.js` via `defer` upon exit.
  - `task build`: Builds the container image (`ghcr.io/sleepinfinitydev/disperse` by default, configurable via `IMAGE=...`) tagged with both the short Git commit hash (`git rev-parse --short HEAD`) and `latest`, auto-detecting `podman` or `docker`.
  - `task push`: Builds and pushes both tags (`:{{.GIT_HASH}}` and `:latest`) to the container registry.
- **GitHub Actions (`.github/workflows/oci-image.yml`)**: Lints the Helm chart (`helm lint --strict`), builds and pushes the OCI container image (`ghcr.io/sleepinfinitydev/disperse`), and packages and pushes the OCI Helm chart (`oci://ghcr.io/sleepinfinitydev/charts/disperse`, separated under `/charts` and linked to the repository via `org.opencontainers.image.source` annotation) using `GITHUB_TOKEN` (`contents: read`, `packages: write`):
  - **Triggers**: Runs automatically on `push` to `main` and `feat-helm-charts`, and supports manual execution from any branch via `workflow_dispatch`.
  - **`main` Tagging**: Publishes container image tags `:<git-short-hash>`, `:<chart-version>`, and `:latest`, alongside Helm chart version `<chart-version>` (e.g., `0.1.0`) packaged with `--app-version <git-short-hash>`.
  - **Branch / Preview Tagging (Non-`main`)**: Never publishes `latest` or stable SemVer versions. Instead, publishes sanitized branch container image tags `:<branch>-<git-short-hash>` and `:<branch>`, alongside SemVer 2.0 prerelease Helm chart versions `<chart-version>-<branch>` (rolling branch preview, e.g., `0.1.0-feat-helm-charts`) and `<chart-version>-<branch>.g<git-short-hash>` (immutable commit snapshot), packaged with `--app-version <branch>-<git-short-hash>` so deploying the branch chart automatically pulls the matching branch container image.

---

## 9. Kubernetes & Helm Chart Specification (`charts/disperse`)

Disperse provides an official Helm v3 chart (`apiVersion: v2`, `type: application`) under `charts/disperse` designed around Kubernetes PodSecurity (`restricted`), 12-Factor configuration, and clean network decoupling.

### 9.1. Architectural Goals & Decoupled Topology

1. **Dual Backend Operating Modes**:
   - **Mode A — Standalone Disperse with External Kroki (`kroki.enabled: false`, default)**:
     - Deploys only the `disperse` `Deployment` (static SPA served by `nginxinc/nginx-unprivileged` as `UID 101`).
     - The browser communicates directly with `https://kroki.io` (or any custom private Kroki server defined in `disperse.krokiBaseUrl`).
   - **Mode B — Full Self-Hosted Stack (`kroki.enabled: true`)**:
     - Deploys a **second `Deployment`** (`<fullname>-kroki`) running `yuzutech/kroki` along with configurable companion sidecars (`mermaid`, `bpmn`, `excalidraw`) inside the same Pod over `127.0.0.1`.
     - Isolates the lightweight static frontend (`disperse`) from the JVM + headless Chromium rendering stack (`kroki`), enabling independent scaling, resource quotas, rollouts, and node scheduling.
2. **Decoupled Services & Independent Ingress / Gateway API Routing (No Nginx Reverse Proxy)**:
   - Disperse's Nginx container serves static SPA assets exclusively; it does **not** reverse-proxy Kroki traffic.
   - Instead, Disperse (`<fullname>:8765`) and Kroki (`<fullname>-kroki:8000`, when `kroki.enabled: true`) each expose their own dedicated Kubernetes `Service` and optional **`Ingress` (`ingress.*` / `kroki.ingress.*`)** or **Gateway API `HTTPRoute` (`httpRoute.*` / `kroki.httpRoute.*`)**:

```
                        Browser Client
              ┌────────────────┴────────────────┐
              │                                 │
              ▼ (disperse.*)                    ▼ (kroki.* or kroki.io)
   ┌──────────────────────┐          ┌──────────────────────────────────────┐
   │ Ingress / HTTPRoute  │          │ Ingress / HTTPRoute                  │
   │  Service: <fullname> │          │  Service: <fullname>-kroki (:8000)   │
   │       (:8765)        │          └──────────────────┬───────────────────┘
   └──────────┬───────────┘                             │
              ▼                                         ▼
   ┌──────────────────────┐          ┌──────────────────────────────────────┐
   │ Deployment 1:        │          │ Deployment 2: <fullname>-kroki       │
   │  <fullname>          │          │  ┌────────────────────────────────┐  │
   │  nginx-unprivileged  │          │  │ Main: yuzutech/kroki (:8000)   │  │
   │  (UID 101, static)   │          │  └───────┬────────┬────────┬──────┘  │
   └──────────────────────┘          │          │127.0.0.1 (Pod loopback)   │
                                     │          ▼        ▼        ▼         │
                                     │  ┌──────────┐┌────────┐┌──────────┐  │
                                     │  │ mermaid  ││  bpmn  ││excalidraw│  │
                                     │  │ (:8002)  ││(:8003) ││ (:8004)  │  │
                                     │  └──────────┘└────────┘└──────────┘  │
                                     └──────────────────────────────────────┘
```

   - **Why Decoupled Routing Is Superior**:
     - Upstream `yuzutech/kroki` serves requests at `/` (`/{engine}/{format}/{payload}`) and natively emits `Access-Control-Allow-Origin: *` CORS headers.
     - Exposing Kroki on its own hostname (e.g., `kroki.127.0.0.1.nip.io` alongside `disperse.127.0.0.1.nip.io`) works identically across **every** Kubernetes Ingress controller (K3s Traefik, `ingress-nginx`, Cilium, HAProxy, AWS ALB) and Gateway API implementation without vendor-specific regex path-rewrite annotations or CRDs, and eliminates an unnecessary L7 hop through Nginx.
     - Switching between public Kroki (`kroki.io`), an existing corporate Kroki server, or the chart's built-in Kroki stack reduces to changing a single backend URL (`KROKI_BASE_URL` / `disperse.krokiBaseUrl`).
3. **Automatic `KROKI_BASE_URL` Resolution in Helm (`disperse.krokiBaseUrl`)**:
   - When `disperse.krokiBaseUrl` is explicitly set, that URL is used verbatim.
   - Otherwise, when `kroki.enabled: true`, the chart automatically derives `KROKI_BASE_URL` from `kroki.ingress.hosts[0]` (`https://` when `kroki.ingress.tls` is configured, else `http://`), or from `kroki.httpRoute.hostnames[0]` (`https://` when `kroki.httpRoute.https` or an HTTPS/TLS `sectionName` is used), falling back to `http://localhost:<kroki.service.port>` for local `kubectl port-forward` usage.
   - When `kroki.enabled: false` and `disperse.krokiBaseUrl` is empty, it defaults to `https://kroki.io`.
4. **Pure 12-Factor Injection (No `ConfigMap` Duplication)**:
   - `templates/deployment.yaml` injects all runtime configuration (`PORT`, `KROKI_BASE_URL`, `KROKI_REMOTE_URL`, `ENGINE_MODE_MERMAID`, `ENGINE_MODE_BPMN`, `ENGINE_MODE_EXCALIDRAW`, `KROKI_DISABLED_ENGINES`, `FOOTER_CREDITS`, plus `disperse.env` overrides) directly as container environment variables consumed by `40-disperse.sh`, mounting only a single `emptyDir` at `/tmp`.
5. **Extensibility via `extraManifests`**:
   - Built-in `extraManifests` list rendered through Helm's `tpl` engine so operators can bundle arbitrary Kubernetes resources (e.g., `Gateway`, `Certificate`, `NetworkPolicy`, `ServiceMonitor`) with full access to chart context and helpers.

---

### 9.2. Companion Sidecars & Tri-State (`local` | `remote` | `disabled`) Modes

To render all **28 diagram engines** supported by Disperse, the `<fullname>-kroki` `Deployment` combines the core `yuzutech/kroki` container (25 built-in engines) with **3 individually configurable headless-Chromium companion sidecars** (`mermaid`, `bpmn`, `excalidraw`):

| Container / Engine | Helm Setting | Disperse Container Env Var | Default Mode (`kroki.enabled=true`) | Image (when `mode: local`) | Port |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`kroki` (25 core engines)** | `kroki.enabled` | `KROKI_BASE_URL` | — | `docker.io/yuzutech/kroki:0.33.0` | `8000` |
| **`mermaid`** | `kroki.sidecars.mermaid.mode` | `ENGINE_MODE_MERMAID` | `"local"` | `docker.io/yuzutech/kroki-mermaid:0.33.0` | `8002` |
| **`bpmn`** | `kroki.sidecars.bpmn.mode` | `ENGINE_MODE_BPMN` | `"local"` | `docker.io/yuzutech/kroki-bpmn:0.33.0` | `8003` |
| **`excalidraw`** | `kroki.sidecars.excalidraw.mode` | `ENGINE_MODE_EXCALIDRAW` | `"local"` | `docker.io/yuzutech/kroki-excalidraw:0.33.0` | `8004` |

#### Tri-State Mode Semantics
- **`mode: "local"` *(default when `kroki.enabled: true`)*:** Deploys the corresponding `yuzutech/kroki-<engine>` sidecar container inside `<fullname>-kroki` (wired over `127.0.0.1` via `KROKI_<ENGINE>_HOST` / `KROKI_<ENGINE>_PORT`, with a shared `/dev/shm` `Memory` `emptyDir` volume sized via `kroki.sidecars.shmSize`, default `256Mi`) and routes requests to `KROKI_BASE_URL`. Guarantees **100% in-cluster diagram rendering privacy**.
- **`mode: "remote"`:** Omits the sidecar container from `<fullname>-kroki` (saving ~150–400 MB Chromium RAM per sidecar). When `KROKI_BASE_URL !== KROKI_REMOTE_URL`, Disperse marks the engine in `#engine-select` with `<label> 🌐 (<remote_host>)`, highlights `#engine-select` in `--color-tertiary`, displays a `"⚠️ External service (<host>, non-confidential)"` tooltip, and routes rendering/snippet URLs for that engine directly to `KROKI_REMOTE_URL` (`https://kroki.io` by default).
- **`mode: "disabled"`:** Omits the sidecar container and removes the engine from `#engine-select` and file auto-detection.
- **Standalone / External Kroki Guard (`kroki.enabled: false`)**: When `kroki.enabled: false`, `kroki.sidecars` is ignored so connecting Disperse to an external private `disperse.krokiBaseUrl` routes all engines to `disperse.krokiBaseUrl` by default (unless explicitly overridden in `disperse.engineModes`).

#### Kubernetes Hardening & Best Practices
1. **PodSecurity `restricted` Compliance Across Both Deployments**:
   - **`disperse` (`UID/GID 101`)** and **`kroki` + sidecars (`UID/GID 1001`)** run with `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, `seccompProfile: RuntimeDefault`, and `capabilities.drop: ["ALL"]` (including the `helm test` Pod running as `UID 65534`).
   - Isolated `emptyDir` `subPath` mounts provide writable `/tmp` and `/home/kroki` directories for each container in `<fullname>-kroki`.
2. **Preventing the `KROKI_PORT` Collision**:
   - Sets `enableServiceLinks: false` on `<fullname>-kroki` so Kubernetes never injects `KROKI_PORT=tcp://...` environment variables that would crash `yuzutech/kroki`.
3. **URI & Payload Sizing**:
   - Complex diagrams produce long Base64-encoded GET URLs on Kroki (`KROKI_MAX_URI_LENGTH=16384`). When exposing Kroki via Ingress or Gateway API, configure the external proxy to accept large request headers (e.g., `nginx.ingress.kubernetes.io/large-client-header-buffers: "4 16k"` on `kroki.ingress.annotations`).

---

### 9.3. Chart File Structure & Values Overview

```
charts/disperse/
├── Chart.yaml                   # Chart metadata (apiVersion: v2, type: application)
├── .helmignore                  # Ignored files when packaging
├── README.md                    # Chart documentation & quick-start examples
├── values.yaml                  # Default configuration values
├── values.schema.json           # JSON Schema for strict values validation
└── templates/
    ├── NOTES.txt                # Post-install access & port-forward instructions
    ├── _helpers.tpl             # Naming, labels, images, URL & engine-mode helpers
    ├── serviceaccount.yaml      # Optional ServiceAccount (automountServiceAccountToken: false)
    ├── deployment.yaml          # Disperse unprivileged static SPA Deployment (12-Factor env)
    ├── service.yaml             # Disperse Service (<fullname>:8765)
    ├── ingress.yaml             # Conditional Ingress for Disperse (if ingress.enabled)
    ├── httproute.yaml           # Conditional HTTPRoute for Disperse (if httpRoute.enabled)
    ├── kroki-deployment.yaml    # Conditional Kroki + sidecars Deployment (if kroki.enabled)
    ├── kroki-service.yaml       # Conditional Kroki Service (<fullname>-kroki:8000)
    ├── kroki-ingress.yaml       # Conditional Ingress for Kroki (if kroki.enabled & kroki.ingress.enabled)
    ├── kroki-httproute.yaml     # Conditional HTTPRoute for Kroki (if kroki.enabled & kroki.httpRoute.enabled)
    ├── pdb.yaml                 # Optional PodDisruptionBudget (if pdb.enabled)
    ├── extra-manifests.yaml     # Templated extra Kubernetes manifests (if extraManifests)
    └── tests/
        └── test-connection.yaml # Helm test hook verifying Disperse `/`, `/js/config.js` & Kroki `/health`
```

#### Key `values.yaml` Structure Overview

```yaml
global:
  imageRegistry: ""
  imagePullSecrets: []

replicaCount: 1
image:
  registry: ghcr.io
  repository: sleepinfinitydev/disperse
  tag: "" # Defaults to .Chart.AppVersion ("latest")
  pullPolicy: IfNotPresent

disperse:
  krokiBaseUrl: ""     # Auto-derived when empty
  krokiRemoteUrl: ""   # Defaults to kroki.remoteFallbackUrl ("https://kroki.io")
  engineModes: {}      # Optional overrides when kroki.enabled=false
  footerCredits: null  # null = default credits, "" = hide footer, "<string>" = custom HTML/text
  disabledEngines: []
  env: []

service:
  type: ClusterIP
  port: 8765
  targetPort: 8765

pdb:
  enabled: false
  minAvailable: null
  maxUnavailable: 1

kroki:
  enabled: false
  replicaCount: 1
  remoteFallbackUrl: "https://kroki.io"
  image:
    registry: docker.io
    repository: yuzutech/kroki
    tag: "0.33.0"
  service:
    type: ClusterIP
    port: 8000
    targetPort: 8000
  safeMode: "SECURE"
  maxUriLength: 16384
  sidecars:
    shmSize: "256Mi"
    mermaid:
      mode: "local"    # "local" | "remote" | "disabled"
      port: 8002
    bpmn:
      mode: "local"    # "local" | "remote" | "disabled"
      port: 8003
    excalidraw:
      mode: "local"    # "local" | "remote" | "disabled"
      port: 8004
  ingress:
    enabled: false
    hosts:
      - host: kroki.127.0.0.1.nip.io
        paths:
          - path: /
            pathType: Prefix
  httpRoute:
    enabled: false
    https: false

ingress:
  enabled: false
  hosts:
    - host: disperse.127.0.0.1.nip.io
      paths:
        - path: /
          pathType: Prefix

httpRoute:
  enabled: false
  https: false

extraManifests: []
```

---

### 9.4. Roadmap & Upcoming Enhancements

1. **Implemented**:
   - Pure 12-Factor unprivileged static container (`nginxinc/nginx-unprivileged:stable`, `UID 101`, `readOnlyRootFilesystem: true`).
   - Client-side `DOMParser` SVG sanitization (`js/viewer.js`).
   - Decoupled Helm chart (`charts/disperse`) with independent `Service`, `Ingress`, and Gateway API `HTTPRoute` resources for Disperse and Kroki, plus full tri-state companion sidecar support (`local` | `remote` | `disabled`) for **Mermaid**, **BPMN**, and **Excalidraw**.
   - Embedded bidirectional WYSIWYG visual editors for **Excalidraw (`@excalidraw/excalidraw`)** and **BPMN 2.0 (`bpmn-js`)**.
2. **Future Enhancements**:
   - **Diagrams.net / Draw.io Support**: Add `diagramsnet` to Disperse's engine catalog alongside the `yuzutech/kroki-diagramsnet` sidecar (`:8005`) and embedded `diagrams.net` visual editor integration.
   - **Vendorized Frontend Assets for Full Air-Gapped Operation**: Bundle fonts (`IBM Plex Sans`, `IBM Plex Mono`), core UI libraries (`ace`, `pako`, `panzoom`, `lucide`), and WYSIWYG editor assets directly in the container/chart so Disperse operates in completely offline / air-gapped networks with zero external CDN requests.


