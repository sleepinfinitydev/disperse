const EXCALIDRAW_VERSION = '0.17.6';
const EXCALIDRAW_ASSET_PATH = `https://unpkg.com/@excalidraw/excalidraw@${EXCALIDRAW_VERSION}/dist/`;
const REACT_CDN_URL = 'https://unpkg.com/react@18.3.1/umd/react.production.min.js';
const REACT_DOM_CDN_URL = 'https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js';
const EXCALIDRAW_CDN_URL = `${EXCALIDRAW_ASSET_PATH}excalidraw.production.min.js`;

let excalidrawLoadPromise = null;
let excalidrawAPI = null;
let isMounted = false;
let activeWysiwygEngine = null;
let lastSyncedSignature = '';
let lastSerializedJson = '';
let isPointerDown = false;
let syncDebounceTimer = null;
let pendingSceneChange = null;
let onCodeChangeCallback = null;
let isUpdatingFromEditor = false;
let pendingUpdateOpts = null;

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

function computeSceneSignature(elements, appState) {
  const active = (elements || []).filter((el) => el && !el.isDeleted);
  const elSig = active
    .map((el) => `${el.id}:${el.version}:${el.versionNonce}:${el.x}:${el.y}:${el.width}:${el.height}:${el.text || ''}`)
    .join('|');
  const bg = (appState && appState.viewBackgroundColor) || '#ffffff';
  const grid = (appState && appState.gridSize) || '';
  return `${bg}#${grid}#${elSig}`;
}

function parseExcalidrawCode(code) {
  const trimmed = (code || '').trim();
  if (!trimmed) {
    return { elements: [], appState: { viewBackgroundColor: '#ffffff' }, files: {} };
  }
  const parsed = JSON.parse(trimmed);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid Excalidraw JSON object');
  }
  const elements = Array.isArray(parsed.elements) ? parsed.elements : [];
  const appState = parsed.appState && typeof parsed.appState === 'object' ? parsed.appState : {};
  const files = parsed.files && typeof parsed.files === 'object' ? parsed.files : {};
  return { elements, appState, files };
}

function flushPendingSceneChange() {
  if (!pendingSceneChange || !window.ExcalidrawLib || isUpdatingFromEditor) {
    pendingSceneChange = null;
    return;
  }
  const { elements, appState, files } = pendingSceneChange;
  pendingSceneChange = null;

  try {
    const sig = computeSceneSignature(elements, appState);
    if (sig === lastSyncedSignature) {
      return;
    }
    lastSyncedSignature = sig;
    const json = window.ExcalidrawLib.serializeAsJSON(elements, appState, files || {}, 'local');
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
  isMounted = true;
}

function applyCodeToExcalidraw(code, centerView = false) {
  const ExcalidrawLib = window.ExcalidrawLib;
  if (!ExcalidrawLib) return;

  let parsed;
  try {
    parsed = parseExcalidrawCode(code);
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
    null
  );

  lastSyncedSignature = computeSceneSignature(restored.elements, restored.appState);
  lastSerializedJson = (code || '').trim();

  if (!excalidrawAPI) {
    pendingUpdateOpts = { code, centerView };
    return;
  }

  isUpdatingFromEditor = true;
  try {
    excalidrawAPI.updateScene({
      elements: restored.elements,
      appState: {
        ...restored.appState,
        theme: getActiveTheme()
      }
    });
    if (parsed.files && Object.keys(parsed.files).length > 0 && typeof excalidrawAPI.addFiles === 'function') {
      excalidrawAPI.addFiles(Object.values(parsed.files));
    }
    if (centerView && restored.elements && restored.elements.length > 0) {
      setTimeout(() => {
        if (excalidrawAPI) {
          excalidrawAPI.scrollToContent(restored.elements, {
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

async function activateWysiwyg(engine, code, options = {}) {
  const viewerContainer = document.getElementById('viewer-container');
  const viewer = document.getElementById('viewer');
  const wysiwygContainer = document.getElementById('wysiwyg-container');
  const loading = document.getElementById('loading');

  if (!viewerContainer || !wysiwygContainer) return;

  activeWysiwygEngine = engine;
  viewerContainer.classList.add('wysiwyg-active');
  if (viewer) viewer.style.display = 'none';
  wysiwygContainer.style.display = 'block';

  if (engine !== 'excalidraw') return;

  if (!window.ExcalidrawLib) {
    if (loading) loading.style.display = 'flex';
  }

  try {
    const ExcalidrawLib = await ensureExcalidrawLoaded();
    if (activeWysiwygEngine !== 'excalidraw') return;
    if (loading) loading.style.display = 'none';

    if (!isMounted) {
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
        null
      );

      lastSyncedSignature = computeSceneSignature(restored.elements, restored.appState);
      lastSerializedJson = (code || '').trim();

      renderExcalidrawComponent(wysiwygContainer, {
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
  pendingSceneChange = null;

  if (viewerContainer) viewerContainer.classList.remove('wysiwyg-active');
  if (wysiwygContainer) wysiwygContainer.style.display = 'none';
  if (viewer) viewer.style.display = 'flex';
}

function setTheme(theme) {
  if (!isMounted || !excalidrawAPI) return;
  const wysiwygContainer = document.getElementById('wysiwyg-container');
  isUpdatingFromEditor = true;
  try {
    excalidrawAPI.updateScene({
      appState: {
        theme: theme === 'dark' ? 'dark' : 'light'
      }
    });
    if (wysiwygContainer && window.React && window.ReactDOM && window.ExcalidrawLib) {
      renderExcalidrawComponent(wysiwygContainer, null);
    }
  } finally {
    setTimeout(() => {
      isUpdatingFromEditor = false;
    }, 50);
  }
}

function zoomIn() {
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

async function download(format = 'svg') {
  if (!excalidrawAPI || !window.ExcalidrawLib) return;
  const ExcalidrawLib = window.ExcalidrawLib;
  const elements = ExcalidrawLib.getNonDeletedElements(excalidrawAPI.getSceneElements());
  const appState = excalidrawAPI.getAppState();
  const files = excalidrawAPI.getFiles();

  try {
    let blob;
    const ext = format === 'png' ? 'png' : 'svg';
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
  if (excalidrawAPI && typeof excalidrawAPI.refresh === 'function') {
    excalidrawAPI.refresh();
  }
}

window.wysiwyg = {
  EXCALIDRAW_CDN_URL,
  EXCALIDRAW_ASSET_PATH,
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
    }
  },
  setTheme,
  zoomIn,
  zoomOut,
  zoomFit,
  download,
  refreshLayout
};
