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

async function activateWysiwyg(engine, code, options = {}) {
  const viewerContainer = document.getElementById('viewer-container');
  const viewer = document.getElementById('viewer');
  const wysiwygContainer = document.getElementById('wysiwyg-container');
  const loading = document.getElementById('loading');

  if (!viewerContainer || !wysiwygContainer) return;

  activeWysiwygEngine = engine;
  viewerContainer.classList.add('wysiwyg-active');
  viewerContainer.dataset.wysiwygEngine = engine;
  if (viewer) viewer.style.display = 'none';
  wysiwygContainer.style.display = 'block';

  const excalidrawPane = getOrCreatePane(wysiwygContainer, 'wysiwyg-excalidraw');
  const bpmnPane = getOrCreatePane(wysiwygContainer, 'wysiwyg-bpmn');

  excalidrawPane.style.display = engine === 'excalidraw' ? 'block' : 'none';
  bpmnPane.style.display = engine === 'bpmn' ? 'block' : 'none';

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
  pendingSceneChange = null;

  if (viewerContainer) {
    viewerContainer.classList.remove('wysiwyg-active');
    delete viewerContainer.dataset.wysiwygEngine;
  }
  if (wysiwygContainer) wysiwygContainer.style.display = 'none';
  if (viewer) viewer.style.display = 'flex';
}

function setTheme(theme) {
  if (!isExcalidrawMounted || !excalidrawAPI) return;
  const excalidrawPane = document.getElementById('wysiwyg-excalidraw');
  isUpdatingFromEditor = true;
  try {
    excalidrawAPI.updateScene({
      appState: {
        theme: theme === 'dark' ? 'dark' : 'light'
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

async function download(format = 'svg') {
  const ext = format === 'png' ? 'png' : 'svg';

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
    }
  },
  setTheme,
  zoomIn,
  zoomOut,
  zoomFit,
  download,
  refreshLayout
};
