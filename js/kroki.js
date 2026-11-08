const ENGINES = [
  { id: 'actdiag', label: 'actdiag', mode: 'dot' },
  { id: 'blockdiag', label: 'blockdiag', mode: 'dot' },
  { id: 'bpmn', label: 'bpmn', mode: 'xml' },
  { id: 'bytefield', label: 'bytefield', mode: 'clojure' },
  { id: 'c4plantuml', label: 'c4plantuml', mode: 'text' },
  { id: 'd2', label: 'd2', mode: 'yaml' },
  { id: 'dbml', label: 'dbml', mode: 'sql' },
  { id: 'ditaa', label: 'ditaa', mode: 'text' },
  { id: 'erd', label: 'erd', mode: 'ini' },
  { id: 'excalidraw', label: 'excalidraw', mode: 'json' },
  { id: 'graphviz', label: 'graphviz', mode: 'dot' },
  { id: 'mermaid', label: 'mermaid', mode: 'yaml' },
  { id: 'nomnoml', label: 'nomnoml', mode: 'text' },
  { id: 'nwdiag', label: 'nwdiag', mode: 'dot' },
  { id: 'packetdiag', label: 'packetdiag', mode: 'dot' },
  { id: 'pikchr', label: 'pikchr', mode: 'c_cpp' },
  { id: 'plantuml', label: 'plantuml', mode: 'text' },
  { id: 'rackdiag', label: 'rackdiag', mode: 'dot' },
  { id: 'seqdiag', label: 'seqdiag', mode: 'dot' },
  { id: 'structurizr', label: 'structurizr', mode: 'csharp' },
  { id: 'svgbob', label: 'svgbob', mode: 'text' },
  { id: 'symbolator', label: 'symbolator', mode: 'verilog' },
  { id: 'tikz', label: 'tikz', mode: 'latex' },
  { id: 'umlet', label: 'umlet', mode: 'xml' },
  { id: 'vega', label: 'vega', mode: 'json' },
  { id: 'vegalite', label: 'vegalite', mode: 'json' },
  { id: 'wavedrom', label: 'wavedrom', mode: 'json' },
  { id: 'wireviz', label: 'wireviz', mode: 'yaml' }
];

const exampleCache = {};

async function loadExample(engineId) {
  if (exampleCache[engineId]) {
    return exampleCache[engineId];
  }
  const response = await fetch(`examples/${engineId}.txt`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const text = (await response.text()).trimEnd();
  exampleCache[engineId] = text;
  return text;
}

function textToBase64UrlSafe(text) {
  const utf8 = new TextEncoder().encode(text);
  const compressed = pako.deflate(utf8, { level: 9 });
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < compressed.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, compressed.subarray(i, i + chunkSize));
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlSafeToText(base64UrlSafe) {
  let base64 = base64UrlSafe.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const compressed = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    compressed[i] = binary.charCodeAt(i);
  }
  const utf8 = pako.inflate(compressed);
  return new TextDecoder('utf-8').decode(utf8);
}

window.kroki = {
  ENGINES,
  loadExample,
  encode: textToBase64UrlSafe,
  decode: base64UrlSafeToText,
  getEngineInfo(engineId) {
    return ENGINES.find((e) => e.id === engineId) || { id: engineId, label: engineId, mode: 'text' };
  },
  buildUrl(engine, format, payload) {
    return `https://kroki.io/${engine}/${format}/${payload}`;
  }
};
