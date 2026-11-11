# Agent Guidelines for DISPERSE

This document contains binding instructions and operational rules for AI coding agents working on the **DISPERSE** repository.

---

## 1. Specification Synchronization (Crucial Rule)

- **`SPEC.md` is the single source of truth** for DISPERSE's architecture, design decisions, user interface, keyboard shortcuts, color model, and supported features.
- **Mandatory Update**: Whenever you implement, modify, or remove features, UI elements, keyboard shortcuts, styling systems (such as fonts or color schemes), or data flows, **you MUST update `SPEC.md`** to reflect those changes accurately.
- **Before Committing**:
  1. Inspect the changes made in the session (`git diff` / `git status`).
  2. Verify whether any of those modifications impact the behavior, UI, architecture, or configuration documented in `SPEC.md`.
  3. Update `SPEC.md` in the same commit or alongside the implementation before declaring the task complete.

---

## 2. Core Principles & Architecture

- **No Frameworks**: Plain HTML5, CSS3, and modern Vanilla JavaScript (ES6+). Do not introduce build tools (like Webpack, Vite) or front-end frameworks (React, Vue, Svelte) unless explicitly requested.
- **Icon-First / Zero-Text UI**: All controls, actions, and buttons use vector icons (Lucide SVG). Text is strictly limited to the brand name (`DISPERSE`), engine/format select options, footer credits, and user inputs/outputs.
- **Color System**: Theme colors derive dynamically from the user's preferred base color using OKLCH tetradic harmony (30° double complementary). Dark mode inverts diagram strokes while preserving node hues.
- **Typography System**:
  - Main UI font: `IBM Plex Sans` with `system-ui, sans-serif` fallback (`--font-family`).
  - Code/Monospace font: `IBM Plex Mono` with `monospace` fallback (`--font-family-mono`).
- **Language**:
  - Source code, comments, documentation (`SPEC.md`, `README.md`, `AGENTS.md`), and commit messages must always be in **English**.
  - Respond to the user in the language they use (e.g. Galego / Español / English).

---

## 3. Git & Commit Conventions

- Use clean, conventional commit messages: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `chore:`, `ci:`.
- Ensure documentation updates (`SPEC.md`) are committed alongside or immediately following code changes.
