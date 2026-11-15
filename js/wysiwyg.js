const EXCALIDRAW_VERSION = '0.17.6';
const EXCALIDRAW_ASSET_PATH = `https://unpkg.com/@excalidraw/excalidraw@${EXCALIDRAW_VERSION}/dist/`;
const REACT_CDN_URL = 'https://unpkg.com/react@18.3.1/umd/react.production.min.js';
const REACT_DOM_CDN_URL = 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js';
const EXCALIDRAW_CDN_URL = `${EXCALIDRAW_ASSET_PATH}excalidraw.production.min.js`;

const BPMN_VERSION = '17.11.1';
const BPMN_BASE_URL = `https://unpkg.com/bpmn-js@${BPMN_VERSION}/dist`;
const BPMN_CDN_URL = `${BPMN_BASE_URL}/bpmn-modeler.production.min.js`;
const BPMN_CSS_URLS = [
  `${BPMN_BASE_URL}/assets/diagram-js.css`,
  `${BPMN_BASE_URL}/assets/bpmn-js.css`,
  `${BPMN_BASE_URL}/assets/bpmn-font/css/bpmn-embedded.css`
];

let excalidrawLoadPromise = null;
let excalidrawAPI = null;
let isExcalidrawMounted = false;
let lastSyncedSignature = '';
let lastSerializedJson = '';
let isPointerDown = false;
let syncDebounceTimer = null;
let pendingSceneChange = null;
let pendingUpdateOpts = null;

let bpmnLoadPromise = null;
let bpmnModeler = null;
let lastBpmnXml = '';
let bpmnHasImported = false;
let bpmnSyncTimer = null;

let drawioIframe = null;
let drawioOrigin = '';
let drawioBaseLoaded = '';
let isDrawioReady = false;
let drawioHasLoaded = false;
let drawioMessageBound = false;
let pendingDrawioLoad = null;
let lastDrawioXml = '';
let lastRawDrawioXml = '';
let drawioSyncTimer = null;
let pendingDrawioExport = null;

const DRAWIO_PASSTHROUGH_KEYS = [
  { key: 'r', ctrl: true, shift: false, alt: false, command: 'refresh' },
  { key: 'o', ctrl: true, shift: false, alt: false, command: 'openFile' },
  { key: 's', ctrl: true, shift: false, alt: false, command: 'saveFile' },
  { key: 's', ctrl: true, shift: true, alt: false, command: 'saveFileAs' },
  { key: 'r', ctrl: false, shift: false, alt: true, command: 'toggleAutoRender' },
  { key: 'n', ctrl: false, shift: false, alt: true, command: 'newDiagram' },
  { key: 't', ctrl: false, shift: false, alt: true, command: 'toggleTheme' },
  { key: 'a', ctrl: false, shift: false, alt: true, command: 'toggleAutoSave' },
  { key: 'd', ctrl: false, shift: false, alt: true, command: 'download' },
  { key: 'l', ctrl: false, shift: false, alt: true, command: 'copyLink' },
  { key: 'i', ctrl: false, shift: false, alt: true, command: 'copyImage' },
  { key: 'e', ctrl: false, shift: false, alt: true, command: 'copyEditor' },
  { key: 'x', ctrl: false, shift: false, alt: true, command: 'toggleExport' },
  { key: '1', ctrl: false, shift: false, alt: true, command: 'splitMaxEditor' },
  { key: '2', ctrl: false, shift: false, alt: true, command: 'splitReset' },
  { key: '3', ctrl: false, shift: false, alt: true, command: 'splitMaxViewer' },
  { key: '0', ctrl: false, shift: false, alt: true, command: 'zoomFit' },
  { key: '+', ctrl: false, shift: false, alt: true, command: 'zoomIn' },
  { key: '=', ctrl: false, shift: false, alt: true, command: 'zoomIn' },
  { key: '-', ctrl: false, shift: false, alt: true, command: 'zoomOut' },
  { key: 'enter', ctrl: false, shift: false, alt: true, command: 'maximizePreview' }
];

let activeWysiwygEngine = null;
let onCodeChangeCallback = null;
let isUpdatingFromEditor = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true }
    );
    script.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`link[href="${href}"]`);
    if (existing) {
      resolve();
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    link.addEventListener('load', () => resolve(), { once: true });
    link.addEventListener('error', () => reject(new Error(`Failed to load stylesheet ${href}`)), { once: true });
    document.head.appendChild(link);
  });
}

function getOrCreatePane(wysiwygContainer, id) {
  let pane = document.getElementById(id);
  if (!pane) {
    pane = document.createElement('div');
    pane.id = id;
    pane.className = 'wysiwyg-pane';
    wysiwygContainer.appendChild(pane);
  }
  return pane;
}

function ensureExcalidrawLoaded() {
  if (window.React && window.ReactDOM && window.ExcalidrawLib) {
    return Promise.resolve(window.ExcalidrawLib);
  }
  if (excalidrawLoadPromise) {
    return excalidrawLoadPromise;
  }

  window.EXCALIDRAW_ASSET_PATH = EXCALIDRAW_ASSET_PATH;

  excalidrawLoadPromise = (async () => {
    if (!window.React) {
      await loadScript(REACT_CDN_URL);
    }
    if (!window.ReactDOM) {
      await loadScript(REACT_DOM_CDN_URL);
    }
    if (!window.ExcalidrawLib) {
      await loadScript(EXCALIDRAW_CDN_URL);
    }
    return window.ExcalidrawLib;
  })().catch((err) => {
    excalidrawLoadPromise = null;
    throw err;
  });

  return excalidrawLoadPromise;
}

function ensureBpmnLoaded() {
  if (window.BpmnJS) {
    return Promise.resolve(window.BpmnJS);
  }
  if (bpmnLoadPromise) {
    return bpmnLoadPromise;
  }

  bpmnLoadPromise = (async () => {
    await Promise.all(BPMN_CSS_URLS.map((url) => loadStylesheet(url)));
    if (!window.BpmnJS) {
      await loadScript(BPMN_CDN_URL);
    }
    return window.BpmnJS;
  })().catch((err) => {
    bpmnLoadPromise = null;
    throw err;
  });

  return bpmnLoadPromise;
}

function computeSceneSignature(elements, appState) {
  const active = (elements || []).filter((el) => el && !el.isDeleted && el.type !== 'image');
  const elSig = active
    .map(
      (el) =>
        `${el.id}:${el.version}:${el.versionNonce}:${el.x}:${el.y}:${el.width}:${el.height}:${el.strokeColor || ''}:${el.backgroundColor || ''}:${el.text || ''}:${el.originalText || ''}`
    )
    .join('|');
  const bg = (appState && appState.viewBackgroundColor) || '#ffffff';
  const grid = (appState && appState.gridSize) || '';
  return `${bg}#${grid}#${elSig}`;
}

function parseExcalidrawCode(code, currentElements = null) {
  const trimmed = (code || '').trim();
  if (!trimmed) {
    return { elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} };
  }
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid Excalidraw JSON object');
  }
  const prevMap = new Map();
  if (Array.isArray(currentElements)) {
    currentElements.forEach((el) => {
      if (el && el.id) prevMap.set(el.id, el);
    });
  }
  const elements = Array.isArray(parsed.elements)
    ? parsed.elements
        .filter((el) => el && el.type !== 'image')
        .map((rawEl) => {
          const el = { ...rawEl };
          if (el.type === 'text') {
            const prev = prevMap.get(el.id);
            if (prev) {
              if (el.text !== prev.text && el.originalText === prev.originalText) {
                el.originalText = el.text;
              } else if (el.originalText !== prev.originalText && el.text === prev.text) {
                el.text = el.originalText;
              } else if (typeof el.text === 'string') {
                el.originalText = el.text;
              }
            } else if (typeof el.text === 'string') {
              el.originalText = el.text;
            }
          }
          return el;
        })
    : [];
  const appState = parsed.appState && typeof parsed.appState === 'object' ? parsed.appState : {};
  return { elements, appState, files: {} };
}

function flushPendingSceneChange() {
  if (!pendingSceneChange || !window.ExcalidrawLib || isUpdatingFromEditor) {
    pendingSceneChange = null;
    return;
  }
  const { elements, appState } = pendingSceneChange;
  pendingSceneChange = null;

  try {
    const cleanElements = (elements || []).filter((el) => el && el.type !== 'image');
    const sig = computeSceneSignature(cleanElements, appState);
    if (sig === lastSyncedSignature) {
      return;
    }
    lastSyncedSignature = sig;
    const json = window.ExcalidrawLib.serializeAsJSON(cleanElements, appState, {}, 'local');
    if (json && json !== lastSerializedJson) {
      lastSerializedJson = json;
      if (typeof onCodeChangeCallback === 'function') {
        onCodeChangeCallback(json);
      }
    }
  } catch (err) {
    console.error('Failed to serialize Excalidraw scene:', err);
  }
}

function handleExcalidrawChange(elements, appState, files) {
  if (appState && appState.openSidebar && excalidrawAPI && typeof excalidrawAPI.toggleSidebar === 'function') {
    excalidrawAPI.toggleSidebar({ name: appState.openSidebar.name, force: false });
  }
  if (isUpdatingFromEditor || activeWysiwygEngine !== 'excalidraw') return;
  const sig = computeSceneSignature(elements, appState);
  if (sig === lastSyncedSignature) return;

  pendingSceneChange = { elements, appState, files };
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }
  const delay = isPointerDown ? 450 : 180;
  syncDebounceTimer = setTimeout(() => {
    syncDebounceTimer = null;
    if (!isPointerDown) {
      flushPendingSceneChange();
    }
  }, delay);
}

function getActiveTheme() {
  return window.themeManager && window.themeManager.isDark ? 'dark' : 'light';
}

function renderExcalidrawComponent(container, initialData) {
  const React = window.React;
  const ReactDOM = window.ReactDOM;
  const Excalidraw = window.ExcalidrawLib.Excalidraw;

  const element = React.createElement(Excalidraw, {
    initialData,
    theme: getActiveTheme(),
    autoFocus: false,
    detectScroll: true,
    handleKeyboardGlobally: false,
    UIOptions: {
      canvasActions: {
        changeViewBackgroundColor: true,
        clearCanvas: true,
        export: false,
        loadScene: false,
        saveToActiveFile: false,
        toggleTheme: false,
        saveAsImage: false
      },
      tools: {
        image: false
      }
    },
    onPaste: (data, event) => {
      const hasClipboardFiles =
        (event && event.clipboardData && event.clipboardData.files && event.clipboardData.files.length > 0) ||
        (data && data.files && Object.keys(data.files).length > 0);
      const hasImageElements =
        data && Array.isArray(data.elements) && data.elements.some((el) => el && el.type === 'image');
      if (hasClipboardFiles || hasImageElements) {
        if (excalidrawAPI && typeof excalidrawAPI.setToast === 'function') {
          excalidrawAPI.setToast({
            message: 'Embedded images are disabled to keep diagram URLs compact',
            duration: 3200,
            closable: true
          });
        }
        return false;
      }
      return true;
    },
    excalidrawAPI: (api) => {
      excalidrawAPI = api;
      if (api && typeof api.onPointerDown === 'function') {
        api.onPointerDown(() => {
          isPointerDown = true;
        });
      }
      if (api && typeof api.onPointerUp === 'function') {
        api.onPointerUp(() => {
          isPointerDown = false;
          if (pendingSceneChange) {
            if (syncDebounceTimer) {
              clearTimeout(syncDebounceTimer);
              syncDebounceTimer = null;
            }
            setTimeout(flushPendingSceneChange, 40);
          }
        });
      }
      if (pendingUpdateOpts) {
        const opts = pendingUpdateOpts;
        pendingUpdateOpts = null;
        applyCodeToExcalidraw(opts.code, opts.centerView);
      } else if (initialData && initialData.elements && initialData.elements.length > 0) {
        setTimeout(() => {
          if (excalidrawAPI) {
            excalidrawAPI.scrollToContent(initialData.elements, {
              fitToViewport: false,
              animate: false
            });
          }
        }, 60);
      }
    },
    onChange: handleExcalidrawChange
  });

  ReactDOM.render(element, container);
  isExcalidrawMounted = true;
}

function applyCodeToExcalidraw(code, centerView = false) {
  const ExcalidrawLib = window.ExcalidrawLib;
  if (!ExcalidrawLib) return;

  const currentElements = excalidrawAPI ? excalidrawAPI.getSceneElements() : null;
  let parsed;
  try {
    parsed = parseExcalidrawCode(code, currentElements);
  } catch (err) {
    if (window.viewer && typeof window.viewer.showError === 'function') {
      window.viewer.showError(`Excalidraw JSON error: ${err.message}`);
    }
    return;
  }

  if (window.viewer && typeof window.viewer.hideError === 'function') {
    window.viewer.hideError();
  }

  const currentAppState = excalidrawAPI ? excalidrawAPI.getAppState() : null;
  const restored = ExcalidrawLib.restore(
    {
      elements: parsed.elements,
      appState: {
        ...parsed.appState,
        theme: getActiveTheme()
      },
      files: parsed.files
    },
    currentAppState,
    currentElements,
    {
      refreshDimensions: true,
      repairBindings: true
    }
  );

  const bumpedElements = restored.elements.map((el) =>
    typeof ExcalidrawLib.bumpVersion === 'function' ? ExcalidrawLib.bumpVersion(el) : el
  );

  lastSyncedSignature = computeSceneSignature(bumpedElements, restored.appState);
  lastSerializedJson = (code || '').trim();

  if (!excalidrawAPI) {
    pendingUpdateOpts = { code, centerView };
    return;
  }

  isUpdatingFromEditor = true;
  try {
    excalidrawAPI.updateScene({
      elements: bumpedElements,
      appState: {
        ...restored.appState,
        theme: getActiveTheme()
      }
    });
    if (centerView && bumpedElements && bumpedElements.length > 0) {
      setTimeout(() => {
        if (excalidrawAPI) {
          excalidrawAPI.scrollToContent(bumpedElements, {
            fitToViewport: false,
            animate: false
          });
        }
      }, 40);
    }
  } finally {
    setTimeout(() => {
      isUpdatingFromEditor = false;
    }, 50);
  }
}

async function applyCodeToBpmn(code, centerView = false) {
  if (!bpmnModeler) return;
  const trimmed = (code || '').trim();
  if (!trimmed) {
    if (window.viewer && typeof window.viewer.showError === 'function') {
      window.viewer.showError('Empty BPMN XML source');
    }
    return;
  }

  if (bpmnHasImported && trimmed === lastBpmnXml && !centerView) {
    return;
  }

  isUpdatingFromEditor = true;
  try {
    await bpmnModeler.importXML(trimmed);
    bpmnHasImported = true;
    lastBpmnXml = trimmed;
    if (window.viewer && typeof window.viewer.hideError === 'function') {
      window.viewer.hideError();
    }
    if (centerView) {
      const canvas = bpmnModeler.get('canvas');
      if (canvas) {
        canvas.resized();
        canvas.zoom('fit-viewport', 'auto');
      }
    }
  } catch (err) {
    if (window.viewer && typeof window.viewer.showError === 'function') {
      window.viewer.showError(`BPMN XML error: ${err && err.message ? err.message : 'Invalid BPMN XML'}`);
    }
  } finally {
    setTimeout(() => {
      isUpdatingFromEditor = false;
    }, 50);
  }
}

async function activateBpmn(pane, code, options = {}) {
  const loading = document.getElementById('loading');
  if (!window.BpmnJS && loading) {
    loading.style.display = 'flex';
  }

  const BpmnModeler = await ensureBpmnLoaded();
  if (activeWysiwygEngine !== 'bpmn') return;
  if (loading) loading.style.display = 'none';

  const isFirstMount = !bpmnModeler;
  if (!bpmnModeler) {
    pane.tabIndex = 0;
    bpmnModeler = new BpmnModeler({
      container: pane,
      keyboard: {
        bindTo: pane
      }
    });

    bpmnModeler.on('commandStack.changed', () => {
      if (isUpdatingFromEditor || activeWysiwygEngine !== 'bpmn') return;
      if (bpmnSyncTimer) {
        clearTimeout(bpmnSyncTimer);
      }
      bpmnSyncTimer = setTimeout(async () => {
        bpmnSyncTimer = null;
        if (!bpmnModeler || isUpdatingFromEditor || activeWysiwygEngine !== 'bpmn') return;
        try {
          const { xml } = await bpmnModeler.saveXML({ format: true });
          const cleanXml = (xml || '').trimEnd();
          if (cleanXml && cleanXml !== lastBpmnXml) {
            lastBpmnXml = cleanXml;
            if (typeof onCodeChangeCallback === 'function') {
              onCodeChangeCallback(cleanXml);
            }
          }
        } catch (err) {
          console.error('Failed to export BPMN XML:', err);
        }
      }, 180);
    });
  }

  await applyCodeToBpmn(code, isFirstMount || Boolean(options.centerView));
}

function getDrawioEmbedSpec() {
  const rawBase =
    window.kroki && typeof window.kroki.getDrawioBaseUrl === 'function'
      ? window.kroki.getDrawioBaseUrl()
      : 'https://embed.diagrams.net';
  const resolved = new URL(rawBase, window.location.origin);
  const params = new URLSearchParams(resolved.search);
  params.set('embed', '1');
  params.set('proto', 'json');
  params.set('spin', '1');
  if (!params.has('ui')) {
    params.set('ui', 'kennedy');
  }
  params.set('dark', getActiveTheme() === 'dark' ? '1' : '0');
  params.set('configure', '1');
  params.set('modified', '0');
  params.set('noSaveBtn', '1');
  params.set('saveAndExit', '0');
  params.set('noExitBtn', '1');
  params.set('libraries', '1');
  resolved.search = params.toString();
  return {
    base: rawBase,
    origin: resolved.origin,
    url: resolved.toString()
  };
}

function postToDrawio(payload) {
  if (!drawioIframe || !drawioIframe.contentWindow) return false;
  const targetOrigin = drawioOrigin && drawioOrigin !== 'null' ? drawioOrigin : '*';
  drawioIframe.contentWindow.postMessage(JSON.stringify(payload), targetOrigin);
  return true;
}

function validateDrawioXml(code) {
  const trimmed = (code || '').trim();
  if (!trimmed) {
    throw new Error('Empty Draw.io XML source');
  }
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(trimmed, 'application/xml');
  const parseErr = xmlDoc ? xmlDoc.querySelector('parsererror') : null;
  if (parseErr) {
    throw new Error((parseErr.textContent || 'Malformed XML').trim().split('\n')[0]);
  }
  const rootTag =
    xmlDoc && xmlDoc.documentElement
      ? (xmlDoc.documentElement.localName || xmlDoc.documentElement.tagName || '').toLowerCase()
      : '';
  if (rootTag !== 'mxfile' && rootTag !== 'mxgraphmodel') {
    throw new Error('Root element must be <mxfile> or <mxGraphModel>');
  }
  return xmlDoc;
}

function serializeXmlNodePretty(node, depth = 0) {
  const indent = '  '.repeat(depth);
  const serializer = new XMLSerializer();

  if (node.nodeType === Node.ELEMENT_NODE) {
    const childNodes = Array.from(node.childNodes || []);
    const hasSignificantText = childNodes.some(
      (c) =>
        (c.nodeType === Node.TEXT_NODE || c.nodeType === Node.CDATA_SECTION_NODE) &&
        (c.nodeValue || '').trim().length > 0
    );
    const elementChildren = childNodes.filter((c) => c.nodeType === Node.ELEMENT_NODE);

    if (hasSignificantText) {
      return `${indent}${serializer.serializeToString(node)}`;
    }

    const clone = node.cloneNode(false);
    const emptySerialized = serializer.serializeToString(clone);

    if (elementChildren.length === 0) {
      if (emptySerialized.endsWith('/>')) {
        return `${indent}${emptySerialized}`;
      }
      const closeIdx = emptySerialized.lastIndexOf('></');
      if (closeIdx !== -1) {
        return `${indent}${emptySerialized.slice(0, closeIdx)} />`;
      }
      return `${indent}${emptySerialized}`;
    }

    let openTag = emptySerialized;
    let closeTag = `</${node.tagName}>`;
    if (emptySerialized.endsWith('/>')) {
      openTag = `${emptySerialized.slice(0, -2)}>`;
    } else {
      const closeIdx = emptySerialized.lastIndexOf('></');
      if (closeIdx !== -1) {
        openTag = emptySerialized.slice(0, closeIdx + 1);
        closeTag = emptySerialized.slice(closeIdx + 1);
      }
    }

    const inner = elementChildren
      .map((child) => serializeXmlNodePretty(child, depth + 1))
      .join('\n');
    return `${indent}${openTag}\n${inner}\n${indent}${closeTag}`;
  }

  return '';
}

function formatDrawioXml(rawXml) {
  try {
    const xmlDoc = validateDrawioXml(rawXml);
    if (xmlDoc && xmlDoc.documentElement) {
      return serializeXmlNodePretty(xmlDoc.documentElement, 0);
    }
  } catch (_) {}
  return (rawXml || '').trim();
}

function dispatchDrawioHostShortcut(command) {
  const selectorMap = {
    refresh: '#refresh-btn',
    openFile: '#file-open-btn',
    saveFile: '#file-save-btn',
    saveFileAs: '#file-save-as-btn',
    toggleAutoRender: '#autorender-btn',
    newDiagram: '#new-btn',
    toggleTheme: '#theme-btn',
    toggleAutoSave: '#file-autosave-btn',
    download: '#download-btn',
    copyLink: '#brand-link',
    copyImage: 'button[data-input="out-image-text"]',
    copyEditor: 'button[data-input="out-editor-text"]',
    splitMaxEditor: '#split-max-editor',
    splitReset: '#split-reset',
    splitMaxViewer: '#split-max-viewer',
    zoomFit: '#zoom-fit',
    zoomIn: '#zoom-in',
    zoomOut: '#zoom-out',
    maximizePreview: '#maximize-preview'
  };
  if (command === 'toggleExport') {
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'x', code: 'KeyX', altKey: true, bubbles: true })
    );
    return;
  }
  const sel = selectorMap[command];
  if (sel) {
    document.querySelector(sel)?.click();
  }
}

function sendLoadToDrawio(xml, centerView = false) {
  const loadMsg = {
    action: 'load',
    xml,
    autosave: 1,
    dark: getActiveTheme() === 'dark'
  };
  if (centerView) {
    loadMsg.fit = 1;
    loadMsg.border = 24;
    loadMsg.maxFitScale = 1;
  }
  isUpdatingFromEditor = true;
  postToDrawio(loadMsg);
  setTimeout(() => {
    isUpdatingFromEditor = false;
  }, 80);
}

function applyCodeToDrawio(code, centerView = false) {
  const trimmed = (code || '').trim();
  try {
    validateDrawioXml(trimmed);
  } catch (err) {
    if (window.viewer && typeof window.viewer.showError === 'function') {
      const msg = err && err.message ? err.message : 'Invalid Draw.io XML';
      window.viewer.showError(
        msg === 'Empty Draw.io XML source' ? msg : `Draw.io XML error: ${msg}`
      );
    }
    return;
  }

  if (window.viewer && typeof window.viewer.hideError === 'function') {
    window.viewer.hideError();
  }

  if (
    drawioHasLoaded &&
    (trimmed === lastDrawioXml || trimmed === lastRawDrawioXml) &&
    !centerView
  ) {
    return;
  }

  lastDrawioXml = trimmed;

  if (!isDrawioReady || !drawioIframe || !drawioIframe.contentWindow) {
    pendingDrawioLoad = { code: trimmed, centerView: Boolean(centerView) };
    return;
  }

  pendingDrawioLoad = null;
  sendLoadToDrawio(trimmed, centerView);
}

function handleDrawioMessage(evt) {
  if (!drawioIframe || evt.source !== drawioIframe.contentWindow) return;
  if (drawioOrigin && drawioOrigin !== 'null' && evt.origin !== drawioOrigin) return;
  if (typeof evt.data !== 'string' || !evt.data) return;

  let msg;
  try {
    msg = JSON.parse(evt.data);
  } catch (_) {
    return;
  }
  if (!msg || typeof msg !== 'object') return;

  if (msg.event === 'configure') {
    postToDrawio({
      action: 'configure',
      config: {
        compressXml: false,
        passThroughKeys: DRAWIO_PASSTHROUGH_KEYS
      }
    });
    return;
  }

  if (msg.event === 'init') {
    isDrawioReady = true;
    const loading = document.getElementById('loading');
    if (loading && activeWysiwygEngine === 'diagramsnet') {
      loading.style.display = 'none';
    }
    if (pendingDrawioLoad) {
      const { code, centerView } = pendingDrawioLoad;
      pendingDrawioLoad = null;
      requestAnimationFrame(() => {
        sendLoadToDrawio(code, centerView);
      });
    }
    return;
  }

  if (msg.event === 'load') {
    drawioHasLoaded = true;
    if (typeof msg.xml === 'string' && msg.xml.trim()) {
      lastRawDrawioXml = msg.xml.trim();
    }
    return;
  }

  if (msg.event === 'autosave' || msg.event === 'save') {
    if (isUpdatingFromEditor || activeWysiwygEngine !== 'diagramsnet') return;
    const rawXml = typeof msg.xml === 'string' ? msg.xml.trim() : '';
    if (!rawXml || rawXml === lastRawDrawioXml) return;

    lastRawDrawioXml = rawXml;
    const formatted = formatDrawioXml(rawXml);
    lastDrawioXml = formatted;

    if (drawioSyncTimer) {
      clearTimeout(drawioSyncTimer);
    }
    drawioSyncTimer = setTimeout(() => {
      drawioSyncTimer = null;
      if (isUpdatingFromEditor || activeWysiwygEngine !== 'diagramsnet') return;
      if (typeof onCodeChangeCallback === 'function') {
        onCodeChangeCallback(formatted);
      }
    }, 150);
    return;
  }

  if (msg.event === 'export' && pendingDrawioExport) {
    const current = pendingDrawioExport;
    pendingDrawioExport = null;
    clearTimeout(current.timer);
    current.resolve(msg);
    return;
  }

  if (msg.event === 'shortcut' && msg.command) {
    dispatchDrawioHostShortcut(msg.command);
  }
}

function ensureDrawioMessageListener() {
  if (drawioMessageBound) return;
  window.addEventListener('message', handleDrawioMessage);
  drawioMessageBound = true;
}

function activateDrawio(pane, code, options = {}) {
  ensureDrawioMessageListener();
  const loading = document.getElementById('loading');
  const spec = getDrawioEmbedSpec();

  void pane.offsetWidth;

  const needsMount = !drawioIframe || drawioBaseLoaded !== spec.base;
  if (needsMount) {
    isDrawioReady = false;
    drawioHasLoaded = false;
    drawioOrigin = spec.origin;
    drawioBaseLoaded = spec.base;
    pane.innerHTML = '';

    const iframe = document.createElement('iframe');
    iframe.className = 'wysiwyg-iframe';
    iframe.title = 'Draw.io Diagram Editor';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allow = 'clipboard-read; clipboard-write';
    iframe.addEventListener('error', () => {
      if (loading && activeWysiwygEngine === 'diagramsnet') {
        loading.style.display = 'none';
      }
      if (window.viewer && typeof window.viewer.showError === 'function') {
        window.viewer.showError(`Failed to load Draw.io editor from ${spec.base}`);
      }
    });

    drawioIframe = iframe;
    if (loading) loading.style.display = 'flex';
    applyCodeToDrawio(code, true);
    iframe.src = spec.url;
    pane.appendChild(iframe);
    return;
  }

  if (!isDrawioReady && loading) {
    loading.style.display = 'flex';
  }
  applyCodeToDrawio(code, Boolean(options.centerView));
}

async function activateWysiwyg(engine, code, options = {}) {
  const viewerContainer = document.getElementById('viewer-container');
  const viewer = document.getElementById('viewer');
  const wysiwygContainer = document.getElementById('wysiwyg-container');
  const loading = document.getElementById('loading');

  if (!viewerContainer || !wysiwygContainer) return;

  activeWysiwygEngine = engine;
  viewerContainer.classList.add('wysiwyg-active');
  viewerContainer.dataset.wysiwygEngine = engine;
  if (window.viewer && typeof window.viewer.setPanzoomEnabled === 'function') {
    window.viewer.setPanzoomEnabled(false);
  }
  if (viewer) viewer.style.display = 'none';
  wysiwygContainer.style.display = 'block';

  const excalidrawPane = getOrCreatePane(wysiwygContainer, 'wysiwyg-excalidraw');
  const bpmnPane = getOrCreatePane(wysiwygContainer, 'wysiwyg-bpmn');
  const drawioPane = getOrCreatePane(wysiwygContainer, 'wysiwyg-diagramsnet');

  excalidrawPane.style.display = engine === 'excalidraw' ? 'block' : 'none';
  bpmnPane.style.display = engine === 'bpmn' ? 'block' : 'none';
  drawioPane.style.display = engine === 'diagramsnet' ? 'block' : 'none';

  if (engine === 'diagramsnet') {
    activateDrawio(drawioPane, code, options);
    return;
  }

  if (engine === 'bpmn') {
    try {
      await activateBpmn(bpmnPane, code, options);
    } catch (err) {
      if (loading) loading.style.display = 'none';
      if (window.viewer && typeof window.viewer.showError === 'function') {
        window.viewer.showError(`Failed to load BPMN editor: ${err.message}`);
      }
    }
    return;
  }

  if (engine !== 'excalidraw') return;

  if (!window.ExcalidrawLib) {
    if (loading) loading.style.display = 'flex';
  }

  try {
    const ExcalidrawLib = await ensureExcalidrawLoaded();
    if (activeWysiwygEngine !== 'excalidraw') return;
    if (loading) loading.style.display = 'none';

    if (!isExcalidrawMounted) {
      let parsed = { elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} };
      try {
        parsed = parseExcalidrawCode(code);
        if (window.viewer && typeof window.viewer.hideError === 'function') {
          window.viewer.hideError();
        }
      } catch (err) {
        if (window.viewer && typeof window.viewer.showError === 'function') {
          window.viewer.showError(`Excalidraw JSON error: ${err.message}`);
        }
      }

      const restored = ExcalidrawLib.restore(
        {
          elements: parsed.elements,
          appState: {
            ...parsed.appState,
            theme: getActiveTheme()
          },
          files: parsed.files
        },
        null,
        null,
        {
          refreshDimensions: true,
          repairBindings: true
        }
      );

      lastSyncedSignature = computeSceneSignature(restored.elements, restored.appState);
      lastSerializedJson = (code || '').trim();

      renderExcalidrawComponent(excalidrawPane, {
        elements: restored.elements,
        appState: {
          ...restored.appState,
          theme: getActiveTheme()
        },
        files: restored.files
      });
    } else {
      applyCodeToExcalidraw(code, Boolean(options.centerView));
      if (excalidrawAPI && typeof excalidrawAPI.refresh === 'function') {
        excalidrawAPI.refresh();
      }
    }
  } catch (err) {
    if (loading) loading.style.display = 'none';
    if (window.viewer && typeof window.viewer.showError === 'function') {
      window.viewer.showError(`Failed to load Excalidraw editor: ${err.message}`);
    }
  }
}

function deactivateWysiwyg() {
  const viewerContainer = document.getElementById('viewer-container');
  const viewer = document.getElementById('viewer');
  const wysiwygContainer = document.getElementById('wysiwyg-container');

  activeWysiwygEngine = null;
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
    syncDebounceTimer = null;
  }
  if (bpmnSyncTimer) {
    clearTimeout(bpmnSyncTimer);
    bpmnSyncTimer = null;
  }
  if (drawioSyncTimer) {
    clearTimeout(drawioSyncTimer);
    drawioSyncTimer = null;
  }
  pendingSceneChange = null;

  if (viewerContainer) {
    viewerContainer.classList.remove('wysiwyg-active');
    delete viewerContainer.dataset.wysiwygEngine;
  }
  if (window.viewer && typeof window.viewer.setPanzoomEnabled === 'function') {
    window.viewer.setPanzoomEnabled(true);
  }
  if (wysiwygContainer) wysiwygContainer.style.display = 'none';
  if (viewer) viewer.style.display = 'flex';
}

function setTheme(theme) {
  const isDark = theme === 'dark';

  if (isDrawioReady && drawioIframe && drawioIframe.contentWindow) {
    const xmlToKeep = lastRawDrawioXml || lastDrawioXml;
    if (xmlToKeep) {
      isUpdatingFromEditor = true;
      postToDrawio({
        action: 'load',
        xml: xmlToKeep,
        autosave: 1,
        dark: isDark
      });
      setTimeout(() => {
        isUpdatingFromEditor = false;
      }, 80);
    }
  }

  if (!isExcalidrawMounted || !excalidrawAPI) return;
  const excalidrawPane = document.getElementById('wysiwyg-excalidraw');
  isUpdatingFromEditor = true;
  try {
    excalidrawAPI.updateScene({
      appState: {
        theme: isDark ? 'dark' : 'light'
      }
    });
    if (excalidrawPane && window.React && window.ReactDOM && window.ExcalidrawLib) {
      renderExcalidrawComponent(excalidrawPane, null);
    }
  } finally {
    setTimeout(() => {
      isUpdatingFromEditor = false;
    }, 50);
  }
}

function zoomIn() {
  if (activeWysiwygEngine === 'diagramsnet') {
    postToDrawio({ action: 'invokeAction', actionName: 'zoomIn' });
    return;
  }
  if (activeWysiwygEngine === 'bpmn' && bpmnModeler) {
    const canvas = bpmnModeler.get('canvas');
    if (canvas) {
      const currentZoom = canvas.zoom() || 1;
      canvas.zoom(Math.min(4, Number((currentZoom * 1.25).toFixed(2))));
    }
    return;
  }
  if (!excalidrawAPI) return;
  const appState = excalidrawAPI.getAppState();
  const currentZoom = (appState && appState.zoom && appState.zoom.value) || 1;
  const nextZoom = Math.min(30, Number((currentZoom * 1.25).toFixed(2)));
  excalidrawAPI.updateScene({
    appState: {
      zoom: { value: nextZoom }
    }
  });
}

function zoomOut() {
  if (activeWysiwygEngine === 'diagramsnet') {
    postToDrawio({ action: 'invokeAction', actionName: 'zoomOut' });
    return;
  }
  if (activeWysiwygEngine === 'bpmn' && bpmnModeler) {
    const canvas = bpmnModeler.get('canvas');
    if (canvas) {
      const currentZoom = canvas.zoom() || 1;
      canvas.zoom(Math.max(0.2, Number((currentZoom / 1.25).toFixed(2))));
    }
    return;
  }
  if (!excalidrawAPI) return;
  const appState = excalidrawAPI.getAppState();
  const currentZoom = (appState && appState.zoom && appState.zoom.value) || 1;
  const nextZoom = Math.max(0.1, Number((currentZoom / 1.25).toFixed(2)));
  excalidrawAPI.updateScene({
    appState: {
      zoom: { value: nextZoom }
    }
  });
}

function zoomFit() {
  if (activeWysiwygEngine === 'diagramsnet') {
    postToDrawio({ action: 'fit', border: 24, maxScale: 1 });
    return;
  }
  if (activeWysiwygEngine === 'bpmn' && bpmnModeler) {
    const canvas = bpmnModeler.get('canvas');
    if (canvas) {
      canvas.resized();
      canvas.zoom('fit-viewport', 'auto');
    }
    return;
  }
  if (!excalidrawAPI) return;
  const elements = excalidrawAPI.getSceneElements();
  if (elements && elements.length > 0) {
    excalidrawAPI.scrollToContent(elements, {
      fitToViewport: false,
      animate: true
    });
  } else {
    excalidrawAPI.updateScene({
      appState: {
        scrollX: 0,
        scrollY: 0,
        zoom: { value: 1 }
      }
    });
  }
}

function svgStringToPngBlob(svgString) {
  return new Promise((resolve, reject) => {
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = (img.naturalWidth || img.width || 800) * 2;
        canvas.height = (img.naturalHeight || img.height || 600) * 2;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to encode PNG'));
        }, 'image/png');
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG image for PNG export'));
    };
    img.src = url;
  });
}

function drawioExportToBlob(msg, ext) {
  const data = msg && typeof msg.data === 'string' ? msg.data : '';
  if (!data) {
    throw new Error('Empty export payload from Draw.io');
  }

  if (ext === 'svg') {
    const trimmed = data.trim();
    if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
      return new Blob([trimmed], { type: 'image/svg+xml;charset=utf-8' });
    }
    if (data.startsWith('data:image/svg+xml;base64,')) {
      const b64 = data.slice('data:image/svg+xml;base64,'.length);
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'image/svg+xml;charset=utf-8' });
    }
    const commaIdx = data.indexOf(',');
    if (commaIdx !== -1) {
      const svgStr = decodeURIComponent(data.slice(commaIdx + 1));
      return new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    }
    throw new Error('Unsupported SVG export data from Draw.io');
  }

  const base64Prefix = 'data:image/png;base64,';
  const rawB64 = data.startsWith(base64Prefix) ? data.slice(base64Prefix.length) : data;
  const bin = atob(rawB64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'image/png' });
}

function requestDrawioExport(ext) {
  return new Promise((resolve, reject) => {
    if (!isDrawioReady || !drawioIframe || !drawioIframe.contentWindow) {
      reject(new Error('Draw.io editor is not ready'));
      return;
    }
    if (pendingDrawioExport) {
      clearTimeout(pendingDrawioExport.timer);
      pendingDrawioExport.reject(new Error('Superseded by newer export request'));
      pendingDrawioExport = null;
    }
    const timer = setTimeout(() => {
      pendingDrawioExport = null;
      reject(new Error('Timed out waiting for Draw.io export'));
    }, 15000);
    pendingDrawioExport = { resolve, reject, timer };

    if (ext === 'png') {
      postToDrawio({
        action: 'export',
        format: 'png',
        scale: 2,
        border: 8,
        background: getActiveTheme() === 'dark' ? '#1e1e1e' : '#ffffff',
        spinKey: 'exporting'
      });
    } else {
      postToDrawio({
        action: 'export',
        format: 'svg',
        asText: true,
        border: 8,
        spinKey: 'exporting'
      });
    }
  });
}

async function download(format = 'svg') {
  const ext = format === 'png' ? 'png' : 'svg';

  if (activeWysiwygEngine === 'diagramsnet') {
    try {
      const msg = await requestDrawioExport(ext);
      const blob = drawioExportToBlob(msg, ext);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disperse-diagramsnet.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to export Draw.io diagram:', err);
    }
    return;
  }

  if (activeWysiwygEngine === 'bpmn' && bpmnModeler) {
    try {
      const { svg } = await bpmnModeler.saveSVG();
      const blob =
        ext === 'png'
          ? await svgStringToPngBlob(svg)
          : new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `disperse-bpmn.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Failed to export BPMN diagram:', err);
    }
    return;
  }

  if (!excalidrawAPI || !window.ExcalidrawLib) return;
  const ExcalidrawLib = window.ExcalidrawLib;
  const elements = ExcalidrawLib.getNonDeletedElements(excalidrawAPI.getSceneElements());
  const appState = excalidrawAPI.getAppState();
  const files = excalidrawAPI.getFiles();

  try {
    let blob;
    if (ext === 'png') {
      blob = await ExcalidrawLib.exportToBlob({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          exportWithDarkMode: getActiveTheme() === 'dark'
        },
        files,
        mimeType: 'image/png'
      });
    } else {
      const svgEl = await ExcalidrawLib.exportToSvg({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          exportWithDarkMode: getActiveTheme() === 'dark'
        },
        files
      });
      const svgString = new XMLSerializer().serializeToString(svgEl);
      blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disperse-excalidraw.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Failed to export Excalidraw diagram:', err);
  }
}

function refreshLayout() {
  if (activeWysiwygEngine === 'excalidraw' && excalidrawAPI && typeof excalidrawAPI.refresh === 'function') {
    excalidrawAPI.refresh();
  } else if (activeWysiwygEngine === 'bpmn' && bpmnModeler) {
    try {
      const canvas = bpmnModeler.get('canvas');
      if (canvas) canvas.resized();
    } catch (_) {}
  }
}

window.wysiwyg = {
  EXCALIDRAW_CDN_URL,
  EXCALIDRAW_ASSET_PATH,
  BPMN_CDN_URL,
  isActive() {
    return Boolean(activeWysiwygEngine);
  },
  getActiveEngine() {
    return activeWysiwygEngine;
  },
  onCodeChange(cb) {
    onCodeChangeCallback = cb;
  },
  activate: activateWysiwyg,
  deactivate: deactivateWysiwyg,
  updateFromCode(code, centerView = false) {
    if (activeWysiwygEngine === 'excalidraw') {
      applyCodeToExcalidraw(code, centerView);
    } else if (activeWysiwygEngine === 'bpmn') {
      applyCodeToBpmn(code, centerView);
    } else if (activeWysiwygEngine === 'diagramsnet') {
      applyCodeToDrawio(code, centerView);
    }
  },
  setTheme,
  zoomIn,
  zoomOut,
  zoomFit,
  download,
  refreshLayout
};
