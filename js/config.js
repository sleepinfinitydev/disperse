// Disperse Runtime Configuration
// - Static web server deployments (Caddy, Nginx, Apache): edit the values below directly.
// - Container / Kubernetes deployments: generated automatically at startup from 12-Factor environment variables.
window.DISPERSE_CONFIG = Object.assign(
  {
    krokiBaseUrl: "https://kroki.io",
    krokiRemoteUrl: "https://kroki.io",
    drawioBaseUrl: "https://embed.diagrams.net",
    footerCredits:
      'Made with <i data-lucide="heart" class="heart-icon"></i> in Betanzos · Copyleft <i data-lucide="copyright" class="copyleft-icon"></i> (<a href="https://www.gnu.org/licenses/gpl-3.0.html" target="_blank" rel="noopener noreferrer">GPLv3</a>) by <a href="https://sleepinfinity.dev" target="_blank" rel="noopener noreferrer">sleepinfinity.dev</a> · <a href="https://github.com/sleepinfinitydev/disperse" target="_blank" rel="noopener noreferrer">Disperse</a> was built on the shoulders of giants: <a href="https://kroki.io" target="_blank" rel="noopener noreferrer">Kroki</a>, <a href="https://excalidraw.com" target="_blank" rel="noopener noreferrer">Excalidraw</a>, <a href="https://bpmn.io" target="_blank" rel="noopener noreferrer">bpmn.io</a>, <a href="https://www.diagrams.net" target="_blank" rel="noopener noreferrer">diagrams.net</a>, <a href="https://ace.c9.io" target="_blank" rel="noopener noreferrer">Ace</a>, <a href="https://github.com/timmywil/panzoom" target="_blank" rel="noopener noreferrer">Panzoom</a>, <a href="https://github.com/nodeca/pako" target="_blank" rel="noopener noreferrer">Pako</a>, <a href="https://lucide.dev" target="_blank" rel="noopener noreferrer">Lucide</a>, and inspired by <a href="https://niolesk.top" target="_blank" rel="noopener noreferrer">Niolesk</a>.',
    engineModes: {
      mermaid: "local",
      bpmn: "local",
      excalidraw: "local",
      diagramsnet: "local"
    },
    disabledEngines: ""
  },
  window.DISPERSE_CONFIG || {}
);
