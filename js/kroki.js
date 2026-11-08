const ENGINES = [
  { id: 'actdiag', label: 'actdiag', mode: 'dot', docs: 'http://blockdiag.com/en/actdiag/' },
  { id: 'blockdiag', label: 'blockdiag', mode: 'dot', docs: 'http://blockdiag.com/en/blockdiag/' },
  { id: 'bpmn', label: 'bpmn', mode: 'xml', docs: 'https://www.omg.org/spec/BPMN/2.0/' },
  { id: 'bytefield', label: 'bytefield', mode: 'clojure', docs: 'https://bytefield-svg.deepsymmetry.org/' },
  { id: 'c4plantuml', label: 'c4plantuml', mode: 'text', docs: 'https://github.com/plantuml-stdlib/C4-PlantUML' },
  { id: 'd2', label: 'd2', mode: 'yaml', docs: 'https://d2lang.com/tour/intro/' },
  { id: 'dbml', label: 'dbml', mode: 'sql', docs: 'https://dbml.dbdiagram.io/docs/' },
  { id: 'ditaa', label: 'ditaa', mode: 'text', docs: 'https://github.com/stathissideris/ditaa' },
  { id: 'erd', label: 'erd', mode: 'ini', docs: 'https://github.com/BurntSushi/erd' },
  { id: 'excalidraw', label: 'excalidraw', mode: 'json', docs: 'https://docs.excalidraw.com/' },
  { id: 'graphviz', label: 'graphviz', mode: 'dot', docs: 'https://graphviz.org/documentation/' },
  { id: 'mermaid', label: 'mermaid', mode: 'yaml', docs: 'https://mermaid.js.org/intro/' },
  { id: 'nomnoml', label: 'nomnoml', mode: 'text', docs: 'https://nomnoml.com/' },
  { id: 'nwdiag', label: 'nwdiag', mode: 'dot', docs: 'http://blockdiag.com/en/nwdiag/' },
  { id: 'packetdiag', label: 'packetdiag', mode: 'dot', docs: 'http://blockdiag.com/en/nwdiag/packetdiag-examples.html' },
  { id: 'pikchr', label: 'pikchr', mode: 'c_cpp', docs: 'https://pikchr.org/home/doc/trunk/homepage.md' },
  { id: 'plantuml', label: 'plantuml', mode: 'text', docs: 'https://plantuml.com/' },
  { id: 'rackdiag', label: 'rackdiag', mode: 'dot', docs: 'http://blockdiag.com/en/nwdiag/rackdiag-examples.html' },
  { id: 'seqdiag', label: 'seqdiag', mode: 'dot', docs: 'http://blockdiag.com/en/seqdiag/' },
  { id: 'structurizr', label: 'structurizr', mode: 'csharp', docs: 'https://docs.structurizr.com/dsl' },
  { id: 'svgbob', label: 'svgbob', mode: 'text', docs: 'https://ivanceras.github.io/svgbob-editor/' },
  { id: 'symbolator', label: 'symbolator', mode: 'verilog', docs: 'https://kevinpt.github.io/symbolator/' },
  { id: 'tikz', label: 'tikz', mode: 'latex', docs: 'https://pgf-tikz.github.io/pgf/pgfmanual.pdf' },
  { id: 'umlet', label: 'umlet', mode: 'xml', docs: 'https://www.umlet.com/' },
  { id: 'vega', label: 'vega', mode: 'json', docs: 'https://vega.github.io/vega/docs/' },
  { id: 'vegalite', label: 'vegalite', mode: 'json', docs: 'https://vega.github.io/vega-lite/docs/' },
  { id: 'wavedrom', label: 'wavedrom', mode: 'json', docs: 'https://wavedrom.com/tutorial.html' },
  { id: 'wireviz', label: 'wireviz', mode: 'yaml', docs: 'https://github.com/wireviz/WireViz' }
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
