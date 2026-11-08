let editor = null;
let updateTimeout = null;
let currentEngine = 'mermaid';
let isApplyingProgrammaticChange = false;
const codeByEngine = {};

function isVerticalLayout() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function setEditorModeForEngine(engineId) {
  const info = window.kroki.getEngineInfo(engineId);
  const docsBtn = document.getElementById('docs-btn');
  if (docsBtn && info && info.docs) {
    docsBtn.href = info.docs;
  }
  if (!editor) return;
  editor.session.setMode(`ace/mode/${info.mode || 'text'}`);
}

function initEditor() {
  const editorEl = document.getElementById('editor');
  if (!editorEl || typeof ace === 'undefined') return;

  editor = ace.edit('editor');
  const isDark = window.themeManager ? window.themeManager.isDark : false;
  editor.setTheme(isDark ? 'ace/theme/tomorrow_night' : 'ace/theme/chrome');
  editor.setOptions({
    fontSize: '14px',
    showPrintMargin: false,
    wrap: true,
    tabSize: 2,
    useSoftTabs: true,
    behavioursEnabled: true,
    showFoldWidgets: true,
     showLineNumbers: true,
     showGutter: true
  });

  window.editor = editor;
  setEditorModeForEngine(currentEngine);

  editor.session.on('change', () => {
    if (isApplyingProgrammaticChange) return;
    codeByEngine[currentEngine] = editor.getValue();
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      syncState(true);
    }, 500);
  });
}

function setEditorCode(code) {
  if (!editor) return;
  isApplyingProgrammaticChange = true;
  editor.setValue(code, -1);
  codeByEngine[currentEngine] = code;
  isApplyingProgrammaticChange = false;
}

function initSplitter() {
  const splitter = document.getElementById('splitter');
  const mainEl = document.querySelector('main');
  const editorContainer = document.getElementById('editor-container');
  if (!splitter || !mainEl || !editorContainer) return;

  let isDragging = false;
  const GOLDEN_RATIO_PCT = 38.2;
  const SNAP_THRESHOLD_PCT = 1.6;

  const applySplitPercentage = (pct, enableSnap = false) => {
    let targetPct = Math.min(85, Math.max(15, pct));
    const isSnapped = enableSnap && Math.abs(targetPct - GOLDEN_RATIO_PCT) <= SNAP_THRESHOLD_PCT;

    if (isSnapped) {
      targetPct = GOLDEN_RATIO_PCT;
      splitter.classList.add('snapped');
    } else {
      splitter.classList.remove('snapped');
    }

    if (isVerticalLayout()) {
      editorContainer.style.width = '100%';
      editorContainer.style.height = `${targetPct}%`;
    } else {
      editorContainer.style.height = '100%';
      editorContainer.style.width = `${targetPct}%`;
    }
    if (editor) editor.resize();
  };

  splitter.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.splitter-quick-btn')) return;
    e.preventDefault();
    isDragging = true;
    splitter.classList.add('dragging');
    try {
      splitter.setPointerCapture(e.pointerId);
    } catch (_) {}
    document.body.style.userSelect = 'none';
    document.body.style.cursor = isVerticalLayout() ? 'row-resize' : 'col-resize';
  });

  splitter.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const rect = mainEl.getBoundingClientRect();
    if (isVerticalLayout()) {
      if (rect.height <= 0) return;
      const pct = ((e.clientY - rect.top) / rect.height) * 100;
      applySplitPercentage(pct, true);
    } else {
      if (rect.width <= 0) return;
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      applySplitPercentage(pct, true);
    }
  });

  const stopDragging = (e) => {
    if (!isDragging) return;
    isDragging = false;
    splitter.classList.remove('dragging', 'snapped');
    try {
      if (e && e.pointerId !== undefined) {
        splitter.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
    if (editor) editor.resize();
  };

  splitter.addEventListener('pointerup', stopDragging);
  splitter.addEventListener('pointercancel', stopDragging);

  splitter.addEventListener('dblclick', () => {
    applySplitPercentage(38.2);
  });

  const btnMaxEditor = document.getElementById('split-max-editor');
  const btnMaxViewer = document.getElementById('split-max-viewer');
  const btnResetGolden = document.getElementById('split-reset');

  if (btnMaxEditor) {
    btnMaxEditor.addEventListener('click', (e) => {
      e.stopPropagation();
      applySplitPercentage(82);
    });
  }
  if (btnMaxViewer) {
    btnMaxViewer.addEventListener('click', (e) => {
      e.stopPropagation();
      applySplitPercentage(18);
    });
  }
  if (btnResetGolden) {
    btnResetGolden.addEventListener('click', (e) => {
      e.stopPropagation();
      applySplitPercentage(38.2);
    });
  }

  window.addEventListener('resize', () => {
    if (isVerticalLayout()) {
      editorContainer.style.width = '100%';
      if (!editorContainer.style.height || editorContainer.style.height === '100%') {
        editorContainer.style.height = '38.2%';
      }
    } else {
      editorContainer.style.height = '100%';
      if (!editorContainer.style.width || editorContainer.style.width === '100%') {
        editorContainer.style.width = '38.2%';
      }
    }
    if (editor) editor.resize();
  });
}

function initSelects() {
  const engineSelect = document.getElementById('engine-select');
  const formatSelect = document.getElementById('format-select');
  if (!engineSelect || !formatSelect) return;

  engineSelect.innerHTML = '';
  window.kroki.ENGINES.forEach((engine) => {
    const opt = document.createElement('option');
    opt.value = engine.id;
    opt.textContent = engine.label;
    engineSelect.appendChild(opt);
  });
  engineSelect.value = 'mermaid';
  currentEngine = 'mermaid';

  engineSelect.addEventListener('change', async () => {
    const prevEngine = currentEngine;
    const nextEngine = engineSelect.value;

    if (editor) {
      codeByEngine[prevEngine] = editor.getValue();
    }

    currentEngine = nextEngine;
    setEditorModeForEngine(nextEngine);

    const savedCode = codeByEngine[nextEngine];
    if (savedCode && savedCode.trim()) {
      setEditorCode(savedCode);
      syncState(true);
    } else {
      try {
        const exampleCode = await window.kroki.loadExample(nextEngine);
        if (currentEngine === nextEngine) {
          setEditorCode(exampleCode);
          syncState(true);
        }
      } catch (err) {
        console.error('Failed to load example:', err);
      }
    }
  });

  formatSelect.addEventListener('change', () => {
    syncState(true);
  });
}

function updateSnippets(krokiUrl, appUrl) {
  const imageFmtBtn = document.querySelector('.format-btn.active[data-target="image"]');
  const editorFmtBtn = document.querySelector('.format-btn.active[data-target="editor"]');

  const imgFmt = imageFmtBtn ? imageFmtBtn.dataset.fmt : 'url';
  const edFmt = editorFmtBtn ? editorFmtBtn.dataset.fmt : 'url';

  const imgInput = document.getElementById('out-image-text');
  const edInput = document.getElementById('out-editor-text');

  if (imgInput) {
    if (imgFmt === 'url') imgInput.value = krokiUrl;
    else if (imgFmt === 'md') imgInput.value = `![](${krokiUrl})`;
    else if (imgFmt === 'html') imgInput.value = `<img src="${krokiUrl}" />`;
  }

  if (edInput) {
    if (edFmt === 'url') edInput.value = appUrl;
    else if (edFmt === 'md') edInput.value = `![](${krokiUrl}) [Edit in Disperse](${appUrl})`;
    else if (edFmt === 'html') edInput.value = `<img src="${krokiUrl}" /> <a href="${appUrl}">Edit in Disperse</a>`;
  }
}

function syncState(renderDiagram = true) {
  const engineSelect = document.getElementById('engine-select');
  const formatSelect = document.getElementById('format-select');
  if (!engineSelect || !formatSelect || !editor) return;

  const engine = engineSelect.value || 'mermaid';
  const format = formatSelect.value || 'svg';
  const code = editor.getValue();

  if (!code.trim()) {
    if (window.viewer && typeof window.viewer.showError === 'function') {
      window.viewer.showError('Empty diagram source');
    }
    return;
  }

  const payload = window.kroki.encode(code);
  const krokiUrl = window.kroki.buildUrl(engine, format, payload);
  const appUrl = `${window.location.origin}${window.location.pathname}#${engine}/${format}/${payload}`;

  window.history.replaceState(null, '', `#${engine}/${format}/${payload}`);

  const brandLink = document.getElementById('brand-link');
  if (brandLink) {
    brandLink.href = appUrl;
  }

  if (renderDiagram && window.viewer) {
    window.viewer.update(krokiUrl, format, engine);
  }
  updateSnippets(krokiUrl, appUrl);
}

function initSnippets() {
  document.querySelectorAll('.format-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      document
        .querySelectorAll(`.format-btn[data-target="${target}"]`)
        .forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      syncState(false);
    });
  });

  document.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const inputId = btn.dataset.input;
      const input = document.getElementById(inputId);
      if (!input) return;

      const textToCopy = input.value;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          input.select();
          document.execCommand('copy');
        }
      } catch (_) {
        input.select();
        document.execCommand('copy');
      }

      btn.classList.add('copied');
      setTimeout(() => {
        btn.classList.remove('copied');
      }, 1800);
    });
  });
}

async function loadFromUrl() {
  const engineSelect = document.getElementById('engine-select');
  const formatSelect = document.getElementById('format-select');
  const rawHash = window.location.hash.replace(/^#\/?/, '');

  if (rawHash) {
    const parts = rawHash.split('/');
    if (parts.length >= 3) {
      const engine = parts[0];
      const format = parts[1];
      const payload = parts.slice(2).join('/');

      const validEngine = window.kroki.ENGINES.some((e) => e.id === engine);
      const validFormat = format === 'svg' || format === 'png';

      if (validEngine && engineSelect) {
        engineSelect.value = engine;
        currentEngine = engine;
        setEditorModeForEngine(engine);
      }
      if (validFormat && formatSelect) {
        formatSelect.value = format;
      }

      try {
        const decoded = window.kroki.decode(payload);
        setEditorCode(decoded);
        return;
      } catch (err) {
        console.error('Failed to decode URL state:', err);
      }
    }
  }

  try {
    const defaultCode = await window.kroki.loadExample(currentEngine);
    setEditorCode(defaultCode);
  } catch (err) {
    console.error('Failed to load initial example:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
  const brandLink = document.getElementById('brand-link');
  if (brandLink) {
    brandLink.href = window.location.href;
    brandLink.addEventListener('click', async (e) => {
      e.preventDefault();
      const currentUrl = window.location.href;
      brandLink.href = currentUrl;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(currentUrl);
        }
      } catch (_) {}
      brandLink.classList.add('copied');
      setTimeout(() => {
        brandLink.classList.remove('copied');
      }, 1800);
    });
  }
  if (window.themeManager) {
    window.themeManager.init();
  }
  initSelects();
  initEditor();
  initSplitter();
  if (window.viewer) {
    window.viewer.init();
  }
  initSnippets();

  await loadFromUrl();
  syncState(true);

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      syncState(true);
    });
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
      e.preventDefault();
      syncState(true);
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (window.viewer && typeof window.viewer.download === 'function') {
        window.viewer.download();
      }
    }
  });
});
