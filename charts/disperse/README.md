# Disperse Helm Chart

Official Helm v3 chart for deploying **Disperse** — a Diagrams as Code single-page web application (SPA) with an optional self-hosted **Kroki** backend and companion rendering sidecars on Kubernetes.

## Features

- **Decoupled Backend Operating Modes**:
  - **Standalone (`kroki.enabled: false`, default)**: Deploys only the lightweight Disperse static SPA (`nginxinc/nginx-unprivileged`), pointing to `https://kroki.io` (or any custom external Kroki server via `disperse.krokiBaseUrl`).
  - **Self-Hosted Kroki Stack (`kroki.enabled: true`)**: Deploys a second `Deployment` (`<fullname>-kroki`) running `yuzutech/kroki` along with configurable companion sidecars (`mermaid`, `bpmn`, `excalidraw`), exposed through its own dedicated `Service`, `Ingress`, or Gateway API `HTTPRoute`.
- **Clean Separation of Ingress / Gateway API**: Disperse and Kroki use independent Kubernetes `Service`, `Ingress`, and `HTTPRoute` resources—requiring zero reverse-proxy logic inside Nginx and zero controller-specific path-rewrite CRDs.
- **Per-Engine Privacy & Resource Control (`local` vs. `remote` vs. `disabled`)**: Independently control each Chromium-based companion engine (`mermaid`, `bpmn`, `excalidraw`) via `kroki.sidecars.<engine>.mode`:
  - `local` *(default when `kroki.enabled: true`)*: Deploys the `yuzutech/kroki-<engine>` sidecar container inside the Kroki Pod over `127.0.0.1` for 100% private in-cluster diagram rendering.
  - `remote`: Omits the sidecar container to save Chromium RAM and routes requests for that engine from the browser to `kroki.remoteFallbackUrl` (`https://kroki.io`) with an explicit `🌐 (kroki.io)` non-private indicator and warning tooltip in the UI.
  - `disabled`: Omits the sidecar container and removes the engine from Disperse's language selector.
- **Hardened by Default**: Both `disperse` (`UID 101`) and `kroki` (`UID 1001`) run with `runAsNonRoot: true`, `readOnlyRootFilesystem: true`, `allowPrivilegeEscalation: false`, `seccompProfile: RuntimeDefault`, and `capabilities.drop: ["ALL"]`.
- **Extensibility via `extraManifests`**: Bundle arbitrary Kubernetes manifests rendered through Helm's `tpl` engine.

## Quick Start

### 1. Standalone Mode (uses `https://kroki.io`)

Install directly from GitHub Container Registry:

```bash
helm upgrade --install disperse oci://ghcr.io/sleepinfinitydev/charts/disperse
```

*(To test a branch preview build before merging to `main`, pass `--version 0.1.0-<branch>`, e.g. `--version 0.1.0-feat-helm-charts`. From a local git checkout, use `./charts/disperse`.)*

### 2. Full Self-Hosted Stack with Ingress (`nip.io`)

```yaml
# values-selfhosted.yaml
kroki:
  enabled: true
  ingress:
    enabled: true
    hosts:
      - host: kroki.127.0.0.1.nip.io
        paths:
          - path: /
            pathType: Prefix

ingress:
  enabled: true
  hosts:
    - host: disperse.127.0.0.1.nip.io
      paths:
        - path: /
          pathType: Prefix
```

```bash
helm upgrade --install disperse oci://ghcr.io/sleepinfinitydev/charts/disperse -n disperse --create-namespace -f values-selfhosted.yaml
```

### 3. Resource-Saver Hybrid Mode (Core Kroki Local, Chromium Sidecars Remote or Disabled)

If you want local rendering for the 25 built-in Kroki engines without running Chromium sidecar containers in-cluster:

```yaml
# values-lightweight.yaml
kroki:
  enabled: true
  sidecars:
    mermaid:
      mode: remote   # or "disabled" for strict on-premise data privacy
    bpmn:
      mode: remote   # or "disabled"
    excalidraw:
      mode: remote   # or "disabled"
  ingress:
    enabled: true
    hosts:
      - host: kroki.127.0.0.1.nip.io
        paths:
          - path: /
            pathType: Prefix

ingress:
  enabled: true
  hosts:
    - host: disperse.127.0.0.1.nip.io
      paths:
        - path: /
          pathType: Prefix
```

```bash
helm upgrade --install disperse oci://ghcr.io/sleepinfinitydev/charts/disperse -n disperse --create-namespace -f values-lightweight.yaml
```

## Key Configuration Values

| Parameter | Description | Default |
| :--- | :--- | :--- |
| `replicaCount` | Number of Disperse frontend replicas | `1` |
| `image.registry` | Disperse OCI image registry | `ghcr.io` |
| `image.repository` | Disperse OCI image repository | `sleepinfinitydev/disperse` |
| `image.tag` | Disperse image tag (defaults to `.Chart.AppVersion`) | `""` (`"latest"`) |
| `disperse.krokiBaseUrl` | Override primary Kroki URL (`""` auto-derives from `kroki.ingress`, `kroki.httpRoute`, `http://localhost:8000`, or `https://kroki.io`) | `""` |
| `disperse.footerCredits` | Custom footer HTML/text (`null` = default credits, `""` = hide footer) | `null` |
| `disperse.disabledEngines` | Array of engine IDs to hide from `#engine-select` | `[]` |
| `service.type` | Disperse Kubernetes Service type | `ClusterIP` |
| `service.port` | Disperse Kubernetes Service port | `8765` |
| `ingress.enabled` | Enable Kubernetes `Ingress` for Disperse (`disperse.127.0.0.1.nip.io` by default) | `false` |
| `httpRoute.enabled` | Enable Gateway API `HTTPRoute` for Disperse | `false` |
| `kroki.enabled` | Deploy the self-hosted `yuzutech/kroki` backend Deployment & Service | `false` |
| `kroki.service.port` | Kroki Kubernetes Service port | `8000` |
| `kroki.ingress.enabled` | Enable dedicated Kubernetes `Ingress` for Kroki (`kroki.127.0.0.1.nip.io` by default) | `false` |
| `kroki.httpRoute.enabled` | Enable dedicated Gateway API `HTTPRoute` for Kroki | `false` |
| `kroki.remoteFallbackUrl` | External Kroki URL used by engines in `remote` mode | `"https://kroki.io"` |
| `kroki.sidecars.mermaid.mode` | Mode for `mermaid` when `kroki.enabled=true` (`local` \| `remote` \| `disabled`) | `"local"` |
| `kroki.sidecars.bpmn.mode` | Mode for `bpmn` when `kroki.enabled=true` (`local` \| `remote` \| `disabled`) | `"local"` |
| `kroki.sidecars.excalidraw.mode` | Mode for `excalidraw` when `kroki.enabled=true` (`local` \| `remote` \| `disabled`) | `"local"` |
| `pdb.enabled` | Enable `PodDisruptionBudget` (`policy/v1`) | `false` |
| `extraManifests` | Additional templated Kubernetes manifests | `[]` |
