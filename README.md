# DISPERSE

Minimalist, icon-first single-page web application (SPA) for creating and sharing **Diagrams as Code**, powered by [Kroki](https://kroki.io).

## Features
- **28 Diagram Engines**: Mermaid, GraphViz, PlantUML, C4, D2, Excalidraw, Vega-Lite, WaveDrom, BPMN, TikZ, and more.
- **Zero-Text / Icon-First UI**: Clean icon-driven interface.
- **Dynamic OKLCH Tetradic Theme**: Customizable base color with automatic light and dark modes.
- **Stateless URL Sharing**: Diagrams are compressed (Zlib deflate + URL-safe Base64) directly into the URL hash and ready to export as Direct Links, Markdown, or HTML.

## Quick Start

### Run locally (with [Task](https://taskfile.dev))
```bash
task run
```
By default, it starts a local server at `http://localhost:8765` (customizable via `task run PORT=9000`).

### Build & Push OCI Container Image
```bash
task build
task push
```
By default, it tags and pushes `ghcr.io/sleepinfinitydev/disperse:<git-short-hash>` and `ghcr.io/sleepinfinitydev/disperse:latest` (customizable via `IMAGE=...`).

## License
Licensed under the [GNU General Public License v3.0 (GPLv3)](LICENSE).
