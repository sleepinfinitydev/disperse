# Disperse Helm Chart

Official Helm v3 chart for deploying **Disperse** — a Diagrams as Code single-page web application (SPA) with an optional self-hosted **Kroki** backend on Kubernetes.

## Features

- **Dual Backend Operating Modes**:
  - **Standalone (`kroki.enabled: false`, default)**: Deploys only the lightweight Disperse SPA (Nginx), pointing to `https://kroki.io` (or a custom `disperse.krokiBaseUrl`).
  - **Self-Hosted Kroki Stack (`kroki.enabled: true`)**: Deploys a second `Deployment` (`<fullname>-kroki`) running `yuzutech/kroki` for on-premise diagram rendering, routed through Disperse's Nginx reverse proxy at `/kroki/`.
- **Single Published Kubernetes Service**: Both `/` (Disperse SPA) and `/kroki/` (internal Kroki backend) are served behind a single Service (`<fullname>:8765`).
- **Per-Engine Privacy Control (`remote` vs. `disabled` vs. `local`)**: Independently control companion engines (`mermaid`, `bpmn`, `excalidraw`) via `kroki.sidecars.<engine>.mode`:
  - `remote`: Keeps the engine enabled in the UI selector with an explicit `🌐 (kroki.io)` non-private indicator and warning tooltip, routing requests to `kroki.remoteFallbackUrl`.
  - `disabled`: Removes the engine from the UI selector for strict on-premise / air-gapped confidentiality.
  - `local`: Routes requests to the internal Kroki backend.
- **Ingress & Gateway API (`HTTPRoute`)**: Native support for both `networking.k8s.io/v1` `Ingress` and `gateway.networking.k8s.io/v1` `HTTPRoute`.
- **Extensibility via `extraManifests`**: Bundle arbitrary Kubernetes manifests rendered through Helm's `tpl` engine.

## Quick Start

### 1. Standalone Mode (uses `https://kroki.io`)

```bash
helm upgrade --install disperse ./charts/disperse
```

### 2. Self-Hosted Kroki Mode (with Excalidraw & BPMN enabled remotely with UI warning)

```bash
helm upgrade --install disperse ./charts/disperse \
  --set kroki.enabled=true \
  --set kroki.sidecars.mermaid.mode=remote \
  --set kroki.sidecars.bpmn.mode=remote \
  --set kroki.sidecars.excalidraw.mode=remote
```

### 3. Strict On-Premise Mode (disable remote-only engines)

```bash
helm upgrade --install disperse ./charts/disperse \
  --set kroki.enabled=true \
  --set kroki.sidecars.mermaid.mode=disabled \
  --set kroki.sidecars.bpmn.mode=disabled \
  --set kroki.sidecars.excalidraw.mode=disabled
```

## Key Configuration Values

| Parameter | Description | Default |
| :--- | :--- | :--- |
| `replicaCount` | Number of Disperse frontend replicas | `1` |
| `image.registry` | Disperse OCI image registry | `ghcr.io` |
| `image.repository` | Disperse OCI image repository | `sleepinfinitydev/disperse` |
| `image.tag` | Disperse image tag (defaults to `.Chart.AppVersion`) | `""` (`"latest"`) |
| `disperse.krokiBaseUrl` | Override primary Kroki URL (`""` -> `/kroki` when `kroki.enabled=true`, else `https://kroki.io`) | `""` |
| `disperse.footerCredits` | Custom footer HTML/text (`null` = default credits, `""` = hide footer) | `null` |
| `disperse.disabledEngines` | Array of engine IDs to hide from `#engine-select` | `[]` |
| `service.type` | Published Kubernetes Service type | `ClusterIP` |
| `service.port` | Published Kubernetes Service port | `8765` |
| `kroki.enabled` | Deploy the self-hosted `yuzutech/kroki` backend Deployment | `false` |
| `kroki.remoteFallbackUrl` | External Kroki URL used by engines in `remote` mode | `"https://kroki.io"` |
| `kroki.sidecars.mermaid.mode` | Mode for `mermaid` when `kroki.enabled=true` (`remote` \| `disabled` \| `local`) | `"remote"` |
| `kroki.sidecars.bpmn.mode` | Mode for `bpmn` when `kroki.enabled=true` (`remote` \| `disabled` \| `local`) | `"remote"` |
| `kroki.sidecars.excalidraw.mode` | Mode for `excalidraw` when `kroki.enabled=true` (`remote` \| `disabled` \| `local`) | `"remote"` |
| `ingress.enabled` | Enable Kubernetes `Ingress` (`networking.k8s.io/v1`) | `false` |
| `httpRoute.enabled` | Enable Gateway API `HTTPRoute` (`gateway.networking.k8s.io/v1`) | `false` |
| `extraManifests` | Additional templated Kubernetes manifests | `[]` |
