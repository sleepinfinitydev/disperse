const ENGINES = [
  { id: 'excalidraw', label: 'Excalidraw (Editor)', mode: 'json', docs: 'https://docs.excalidraw.com/', featured: true, wysiwyg: true, krokiFormats: ['svg'] },
  { id: 'd2', label: 'd2', mode: 'yaml', docs: 'https://d2lang.com/tour/intro/', featured: true },
  { id: 'mermaid', label: 'mermaid', mode: 'yaml', docs: 'https://mermaid.js.org/intro/', featured: true },
  { id: 'dbml', label: 'dbml', mode: 'sql', docs: 'https://dbml.dbdiagram.io/docs/', featured: true },
  { id: 'c4plantuml-context', label: 'c4plantuml (context)', krokiEngine: 'c4plantuml', mode: 'text', docs: 'https://github.com/plantuml-stdlib/C4-PlantUML', featured: true },
  { id: 'c4plantuml-container', label: 'c4plantuml (container)', krokiEngine: 'c4plantuml', mode: 'text', docs: 'https://github.com/plantuml-stdlib/C4-PlantUML', featured: true },
  { id: 'c4plantuml-component', label: 'c4plantuml (component)', krokiEngine: 'c4plantuml', mode: 'text', docs: 'https://github.com/plantuml-stdlib/C4-PlantUML', featured: true },
  { id: 'c4plantuml-dynamic', label: 'c4plantuml (dynamic)', krokiEngine: 'c4plantuml', mode: 'text', docs: 'https://github.com/plantuml-stdlib/C4-PlantUML', featured: true },
  { id: 'c4plantuml-deployment', label: 'c4plantuml (deployment)', krokiEngine: 'c4plantuml', mode: 'text', docs: 'https://github.com/plantuml-stdlib/C4-PlantUML', featured: true },
  { id: 'actdiag', label: 'actdiag', mode: 'dot', docs: 'http://blockdiag.com/en/actdiag/' },
  { id: 'blockdiag', label: 'blockdiag', mode: 'dot', docs: 'http://blockdiag.com/en/blockdiag/' },
  { id: 'bpmn', label: 'bpmn', mode: 'xml', docs: 'https://www.omg.org/spec/BPMN/2.0/' },
  { id: 'bytefield', label: 'bytefield', mode: 'clojure', docs: 'https://bytefield-svg.deepsymmetry.org/' },
  { id: 'ditaa', label: 'ditaa', mode: 'text', docs: 'https://github.com/stathissideris/ditaa' },
  { id: 'erd', label: 'erd', mode: 'ini', docs: 'https://github.com/BurntSushi/erd' },
  { id: 'graphviz', label: 'graphviz', mode: 'dot', docs: 'https://graphviz.org/documentation/' },
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

const D2_LAYOUTS = [
  { id: 'dagre', label: 'dagre' },
  { id: 'elk', label: 'elk' },
  { id: 'tala', label: 'tala' }
];

const D2_THEMES = [
  { id: 'default', label: 'default' },
  { id: 'neutral-gray', label: 'neutral-gray' },
  { id: 'flagship-terrastruct', label: 'flagship-terrastruct' },
  { id: 'cool-classics', label: 'cool-classics' },
  { id: 'mixed-berry-blue', label: 'mixed-berry-blue' },
  { id: 'grape-soda', label: 'grape-soda' },
  { id: 'aubergine', label: 'aubergine' },
  { id: 'colorblind-clear', label: 'colorblind-clear' },
  { id: 'vanilla-nitro-cola', label: 'vanilla-nitro-cola' },
  { id: 'orange-creamsicle', label: 'orange-creamsicle' },
  { id: 'shirley-temple', label: 'shirley-temple' },
  { id: 'earth-tones', label: 'earth-tones' },
  { id: 'everglade-green', label: 'everglade-green' },
  { id: 'buttered-toast', label: 'buttered-toast' },
  { id: 'dark-mauve', label: 'dark-mauve' },
  { id: 'dark-flagship-terrastruct', label: 'dark-flagship-terrastruct' },
  { id: 'terminal', label: 'terminal' },
  { id: 'terminal-grayscale', label: 'terminal-grayscale' },
  { id: 'origami', label: 'origami' },
  { id: 'c4', label: 'c4' }
];

const exampleCache = {};
const examplePayloadCache = {};

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
  examplePayloadCache[engineId] = textToBase64UrlSafe(text);
  return text;
}

async function isExampleCode(code, engineId) {
  const normalized = (code || '').trimEnd();
  if (!normalized) return true;
  const codePayload = textToBase64UrlSafe(normalized);

  if (engineId) {
    try {
      await loadExample(engineId);
      if (examplePayloadCache[engineId] === codePayload) {
        return true;
      }
    } catch (_) {}
  }

  return false;
}

const ENGINE_EXTENSIONS = {
  bpmn: 'bpmn',
  bytefield: 'clj',
  c4plantuml: 'puml',
  d2: 'd2',
  dbml: 'dbml',
  ditaa: 'ditaa',
  erd: 'erd',
  excalidraw: 'excalidraw',
  graphviz: 'dot',
  mermaid: 'mmd',
  nomnoml: 'nomnoml',
  pikchr: 'pikchr',
  plantuml: 'puml',
  structurizr: 'dsl',
  symbolator: 'vhd',
  tikz: 'tex',
  umlet: 'uxf',
  vega: 'vg.json',
  vegalite: 'vl.json',
  wavedrom: 'json',
  wireviz: 'yml'
};

function getEngineInfo(engineId) {
  const exact = ENGINES.find((e) => e.id === engineId);
  if (exact) return exact;
  if (engineId === 'c4plantuml') {
    return ENGINES.find((e) => e.id === 'c4plantuml-context') || { id: 'c4plantuml', krokiEngine: 'c4plantuml', label: 'c4plantuml', mode: 'text' };
  }
  return { id: engineId, krokiEngine: engineId, label: engineId, mode: 'text' };
}

function getKrokiEngine(engineId) {
  const info = getEngineInfo(engineId);
  return info.krokiEngine || info.id || engineId;
}

function isWysiwygEngine(engineId) {
  return Boolean(getEngineInfo(engineId).wysiwyg);
}

function resolveEngineId(engineId, code = '') {
  if (ENGINES.some((e) => e.id === engineId)) {
    return engineId;
  }
  if (engineId === 'c4plantuml') {
    if (/C4_Container/i.test(code)) return 'c4plantuml-container';
    if (/C4_Component/i.test(code)) return 'c4plantuml-component';
    if (/C4_Dynamic/i.test(code)) return 'c4plantuml-dynamic';
    if (/C4_Deployment/i.test(code)) return 'c4plantuml-deployment';
    return 'c4plantuml-context';
  }
  return null;
}

function getEngineExtension(engineId) {
  const krokiEngine = getKrokiEngine(engineId);
  return ENGINE_EXTENSIONS[engineId] || ENGINE_EXTENSIONS[krokiEngine] || 'txt';
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

function buildOptionsQuery(engine, options = {}) {
  if (engine !== 'd2' || !options) return '';
  const params = new URLSearchParams();
  if (options.layout && options.layout !== 'dagre') {
    params.set('layout', options.layout);
  }
  if (options.theme && options.theme !== 'default') {
    params.set('theme', options.theme);
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

window.kroki = {
  ENGINES,
  D2_LAYOUTS,
  D2_THEMES,
  loadExample,
  isExampleCode,
  getEngineExtension,
  encode: textToBase64UrlSafe,
  decode: base64UrlSafeToText,
  getEngineInfo,
  getKrokiEngine,
  isWysiwygEngine,
  resolveEngineId,
  buildOptionsQuery,
  buildUrl(engine, format, payload, options = {}) {
    const info = getEngineInfo(engine);
    const krokiEngine = info.krokiEngine || info.id || engine;
    const effectiveFormat =
      Array.isArray(info.krokiFormats) && !info.krokiFormats.includes(format)
        ? info.krokiFormats[0]
        : format;
    const query = buildOptionsQuery(krokiEngine, options);
    return `https://kroki.io/${krokiEngine}/${effectiveFormat}/${payload}${query}`;
  }
};
