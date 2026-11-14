# DISPERSE

Minimalist, icon-first single-page web application (SPA) for creating and sharing **Diagrams as Code**, powered by [Kroki](https://kroki.io).

![Disperse Screenshot](assets/screenshot.png)

## Features
- **28 Diagram Engines**: Mermaid, GraphViz, PlantUML, C4, D2, Excalidraw, Vega-Lite, WaveDrom, BPMN, TikZ, and more.
- **Embedded WYSIWYG Visual Editors (Beta)**: Interactive [Excalidraw](https://excalidraw.com) and [BPMN (`bpmn-js`)](https://bpmn.io) visual editors synchronized bidirectionally in real time with the code editor and stateless URLs.
- **Zero-Text / Icon-First UI**: Clean icon-driven interface.
- **Dynamic OKLCH Tetradic Theme**: Customizable base color with automatic light and dark modes.
- **Stateless URL Sharing**: Diagrams are compressed (Zlib deflate + URL-safe Base64) directly into the URL hash and ready to export as Direct Links, Markdown, or HTML.

## Quick Start

### Run with Docker
```bash
docker run --rm -p 8765:8765 ghcr.io/sleepinfinitydev/disperse:latest
```
Then open `http://localhost:8765` in your browser.

Runtime configuration follows the **12-Factor App** model via environment variables (all optional with built-in defaults):
- `PORT` (default: `8765`): HTTP listening port.
- `FOOTER_CREDITS` (default: `Made with ❤️ in Betanzos ... inspired by Niolesk.`): Custom footer text/HTML (or `""` to hide).
- `KROKI_BASE_URL` (default: `https://kroki.io`): Custom or self-hosted Kroki API endpoint.

### Run locally (with [Task](https://taskfile.dev))
```bash
task run
```
By default, it starts a local server at `http://localhost:8765` (customizable via environment variables or task arguments, e.g., `FOOTER_CREDITS="Custom footer" task run` or `task run PORT=9000`).

### Build & Push OCI Container Image
```bash
task build
task push
```
By default, it tags and pushes `ghcr.io/sleepinfinitydev/disperse:<git-short-hash>` and `ghcr.io/sleepinfinitydev/disperse:latest` (customizable via `IMAGE=...`).

## Acknowledgments
Built on the shoulders of giants: [Kroki](https://kroki.io) (MIT), [Excalidraw](https://excalidraw.com) (MIT), [bpmn.io / bpmn-js](https://bpmn.io) (bpmn.io License), [Ace Editor](https://ace.c9.io) (BSD-3-Clause), [Panzoom](https://github.com/timmywil/panzoom) (MIT), [Pako](https://github.com/nodeca/pako) (MIT/Zlib), [Lucide](https://lucide.dev) (ISC/MIT), and inspired by [Niolesk](https://niolesk.top) (MIT).

## License
Licensed under the [GNU General Public License v3.0 (GPLv3)](LICENSE).
