let editor = null;
let updateTimeout = null;
let currentEngine = 'd2';
let isApplyingProgrammaticChange = false;
let baselineContent = '';
let isSavingInProgress = false;
let pendingAutoSave = false;
let isVimMode = localStorage.getItem('disperse-vim-mode') === 'true';

const fileState = {
  handle: null,
  name: '',
  savedContent: null,
  isDirty: false,
  autoSave: false
};

function isVerticalLayout() {
  return window.matchMedia('(max-width: 900px)').matches;
}

function setEditorModeForEngine(engineId) {
  const info = window.kroki.getEngineInfo(engineId);
  const docsBtn = document.getElementById('docs-btn');
  if (docsBtn && info && info.docs) {
    docsBtn.href = info.docs;
  }
  const isD2 = engineId === 'd2';
  const layoutSelect = document.getElementById('layout-select');
  const themeSelect = document.getElementById('theme-select');
  if (layoutSelect) layoutSelect.disabled = !isD2;
  if (themeSelect) themeSelect.disabled = !isD2;

  if (!editor) return;
  editor.session.setMode(`ace/mode/${info.mode || 'text'}`);
  editor.session.setUseWorker(false);
}

function initEditor() {
  const editorEl = document.getElementById('editor');
  if (!editorEl || typeof ace === 'undefined') return;

  editor = ace.edit('editor');
  const isDark = window.themeManager ? window.themeManager.isDark : false;
  editor.setTheme((isDark || isVimMode) ? 'ace/theme/tomorrow_night' : 'ace/theme/chrome');
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
  
  if (isVimMode) {
    editor.setKeyboardHandler('ace/keyboard/vim');
    document.getElementById('editor-vim-mode')?.classList.add('active');
  }

  editor.session.on('change', () => {
    if (isApplyingProgrammaticChange) return;
    updateLocalFileUI();
    clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
      syncState(true);
      if (fileState.autoSave && fileState.handle && fileState.isDirty) {
        performAutoSave();
      }
    }, 500);
  });
}

function setEditorCode(code, isBaseline = false) {
  if (!editor) return;
  isApplyingProgrammaticChange = true;
  editor.setValue(code, -1);
  if (isBaseline && !fileState.name) {
    baselineContent = code;
  }
  isApplyingProgrammaticChange = false;
  updateLocalFileUI();
}

function initSplitter() {
  const splitter = document.getElementById('splitter');
  const mainEl = document.querySelector('main');
  const editorContainer = document.getElementById('editor-container');
  if (!splitter || !mainEl || !editorContainer) return;

  let isDragging = false;
  const GOLDEN_RATIO_PCT = 38.2;
  const SNAP_THRESHOLD_PCT = 1.6;
  let currentSplitPct = GOLDEN_RATIO_PCT;

  const applySplitPercentage = (pct, enableSnap = false) => {
    let targetPct = Math.min(100, Math.max(0, pct));
    const isSnapped = enableSnap && Math.abs(targetPct - GOLDEN_RATIO_PCT) <= SNAP_THRESHOLD_PCT;

    if (isSnapped) {
      targetPct = GOLDEN_RATIO_PCT;
      splitter.classList.add('snapped');
    } else {
      splitter.classList.remove('snapped');
    }

    currentSplitPct = targetPct;

    if (isVerticalLayout()) {
      editorContainer.style.width = '100%';
      editorContainer.style.height = `${targetPct}%`;
    } else {
      editorContainer.style.height = '100%';
      editorContainer.style.width = `${targetPct}%`;
    }
    const iconMaximize = document.getElementById('preview-icon-maximize');
    const iconMinimize = document.getElementById('preview-icon-minimize');
    if (iconMaximize && iconMinimize) {
      const isMaximized = targetPct === 0;
      iconMaximize.style.display = isMaximized ? 'none' : 'inline-flex';
      iconMinimize.style.display = isMaximized ? 'inline-flex' : 'none';
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
      const availHeight = rect.height - splitter.offsetHeight;
      if (availHeight <= 0) return;
      const pct = ((e.clientY - rect.top - splitter.offsetHeight / 2) / availHeight) * 100;
      applySplitPercentage(pct, true);
    } else {
      const availWidth = rect.width - splitter.offsetWidth;
      if (availWidth <= 0) return;
      const pct = ((e.clientX - rect.left - splitter.offsetWidth / 2) / availWidth) * 100;
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
  const btnMaximizePreview = document.getElementById('maximize-preview');

  if (btnMaxEditor) {
    btnMaxEditor.addEventListener('click', (e) => {
      e.stopPropagation();
      applySplitPercentage(100);
    });
  }
  if (btnMaxViewer) {
    btnMaxViewer.addEventListener('click', (e) => {
      e.stopPropagation();
      applySplitPercentage(0);
    });
  }
  if (btnResetGolden) {
    btnResetGolden.addEventListener('click', (e) => {
      e.stopPropagation();
      applySplitPercentage(38.2);
    });
  }
  let previousSplitPercentage = GOLDEN_RATIO_PCT;
  if (btnMaximizePreview) {
    btnMaximizePreview.addEventListener('click', (e) => {
      e.stopPropagation();
      if (currentSplitPct === 0) {
        applySplitPercentage(previousSplitPercentage);
        if (exportSplitterCtrl) exportSplitterCtrl.restoreFromMaximize();
      } else {
        previousSplitPercentage = currentSplitPct;
        applySplitPercentage(0);
        const didCollapseExport = exportSplitterCtrl ? exportSplitterCtrl.collapseForMaximize() : false;
        setTimeout(() => {
          const zoomFitBtn = document.getElementById('zoom-fit');
          if (zoomFitBtn) zoomFitBtn.click();
        }, didCollapseExport ? 220 : 50);
      }
    });
  }

  window.addEventListener('resize', () => {
    applySplitPercentage(currentSplitPct, false);
  });
}

let toggleExportSection = null;
let exportSplitterCtrl = null;

function initExportSplitter() {
  const exportSplitter = document.getElementById('export-splitter');
  const exportSection = document.getElementById('export-section');
  const exportContent = document.getElementById('export-section-content');
  if (!exportSplitter || !exportSection || !exportContent) return;

  let isDragging = false;
  let grabOffset = 0;
  let animTimer = null;
  let lastTargetCollapsed = false;
  let autoCollapsedByMaximize = false;
  let savedHeightBeforeMaximize = null;
  const SNAP_PX = 4;

  const getMaxHeight = () => exportContent.offsetHeight;

  const getCurrentHeight = () => exportSection.getBoundingClientRect().height;

  const clearAnimation = () => {
    if (animTimer) {
      clearTimeout(animTimer);
      animTimer = null;
    }
    exportSection.classList.remove('animating');
  };

  const applyExportHeight = (heightPx, animate = false) => {
    const maxHeight = getMaxHeight();
    const targetHeight = Math.min(maxHeight, Math.max(0, heightPx));
    const isCollapsed = targetHeight === 0;
    const isFullyExpanded = targetHeight >= maxHeight;
    lastTargetCollapsed = isCollapsed;

    clearAnimation();

    const startHeight = getCurrentHeight();
    if (animate && Math.abs(startHeight - targetHeight) >= 1) {
      exportSection.style.height = `${startHeight}px`;
      exportSection.classList.add('clipped');
      exportSection.classList.remove('collapsed');
      void exportSection.offsetHeight;
      exportSection.classList.add('animating');
      exportSection.style.height = `${targetHeight}px`;

      animTimer = setTimeout(() => {
        animTimer = null;
        exportSection.classList.remove('animating');
        if (isCollapsed) {
          exportSection.classList.add('collapsed');
        } else if (isFullyExpanded) {
          exportSection.style.height = '';
          exportSection.classList.remove('clipped', 'collapsed');
        }
        if (editor) editor.resize();
      }, 210);
    } else {
      if (isFullyExpanded && !isDragging) {
        exportSection.style.height = '';
        exportSection.classList.remove('clipped', 'collapsed');
      } else {
        exportSection.style.height = `${targetHeight}px`;
        exportSection.classList.add('clipped');
        exportSection.classList.toggle('collapsed', isCollapsed);
      }
      if (editor) editor.resize();
    }
  };

  exportSplitter.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.splitter-quick-btn')) return;
    e.preventDefault();
    autoCollapsedByMaximize = false;
    clearAnimation();
    const currentH = getCurrentHeight();
    exportSection.style.height = `${currentH}px`;
    exportSection.classList.add('clipped');

    isDragging = true;
    exportSplitter.classList.add('dragging');
    const splitterRect = exportSplitter.getBoundingClientRect();
    grabOffset = splitterRect.bottom - e.clientY;
    try {
      exportSplitter.setPointerCapture(e.pointerId);
    } catch (_) {}
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  });

  exportSplitter.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const maxHeight = getMaxHeight();
    const exportBottom = exportSection.getBoundingClientRect().bottom;
    const desiredTop = e.clientY + grabOffset;
    let rawHeight = exportBottom - desiredTop;

    if (rawHeight <= SNAP_PX) rawHeight = 0;
    else if (rawHeight >= maxHeight - SNAP_PX) rawHeight = maxHeight;

    applyExportHeight(rawHeight, false);
  });

  const stopDragging = (e) => {
    if (!isDragging) return;
    isDragging = false;
    exportSplitter.classList.remove('dragging');
    try {
      if (e && e.pointerId !== undefined) {
        exportSplitter.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
    document.body.style.userSelect = '';
    document.body.style.cursor = '';

    const maxHeight = getMaxHeight();
    const currentH = getCurrentHeight();
    if (currentH >= maxHeight - 1) {
      exportSection.style.height = '';
      exportSection.classList.remove('clipped', 'collapsed');
    }
    if (editor) editor.resize();
  };

  exportSplitter.addEventListener('pointerup', stopDragging);
  exportSplitter.addEventListener('pointercancel', stopDragging);

  exportSplitter.addEventListener('dblclick', () => {
    autoCollapsedByMaximize = false;
    applyExportHeight(getMaxHeight(), true);
  });

  const btnCollapseExport = document.getElementById('export-collapse');
  const btnRestoreExport = document.getElementById('export-restore');

  if (btnCollapseExport) {
    btnCollapseExport.addEventListener('click', (e) => {
      e.stopPropagation();
      autoCollapsedByMaximize = false;
      applyExportHeight(0, true);
    });
  }
  if (btnRestoreExport) {
    btnRestoreExport.addEventListener('click', (e) => {
      e.stopPropagation();
      autoCollapsedByMaximize = false;
      applyExportHeight(getMaxHeight(), true);
    });
  }

  toggleExportSection = () => {
    autoCollapsedByMaximize = false;
    if (!lastTargetCollapsed && getCurrentHeight() > 0) {
      applyExportHeight(0, true);
    } else {
      applyExportHeight(getMaxHeight(), true);
    }
  };

  exportSplitterCtrl = {
    collapseForMaximize() {
      if (!lastTargetCollapsed && getCurrentHeight() > 0) {
        autoCollapsedByMaximize = true;
        savedHeightBeforeMaximize =
          exportSection.style.height === '' ? null : getCurrentHeight();
        applyExportHeight(0, true);
        return true;
      }
      autoCollapsedByMaximize = false;
      return false;
    },
    restoreFromMaximize() {
      if (autoCollapsedByMaximize) {
        autoCollapsedByMaximize = false;
        if (lastTargetCollapsed) {
          const targetH =
            savedHeightBeforeMaximize !== null ? savedHeightBeforeMaximize : getMaxHeight();
          applyExportHeight(targetH, true);
        }
      }
    }
  };

  window.addEventListener('resize', () => {
    if (exportSection.style.height !== '') {
      const maxHeight = getMaxHeight();
      const currentH = parseFloat(exportSection.style.height);
      if (!Number.isNaN(currentH) && currentH > maxHeight) {
        exportSection.style.height = `${maxHeight}px`;
      }
    }
  });
}

function initSelects() {
  const engineSelect = document.getElementById('engine-select');
  const formatSelect = document.getElementById('format-select');
  const layoutSelect = document.getElementById('layout-select');
  const themeSelect = document.getElementById('theme-select');
  if (!engineSelect || !formatSelect) return;

  engineSelect.innerHTML = '';
  let lastWasFeatured = false;
  window.kroki.ENGINES.forEach((engine) => {
    if (lastWasFeatured && !engine.featured) {
      const sep = document.createElement('option');
      sep.disabled = true;
      sep.value = '';
      sep.textContent = '──────────────';
      engineSelect.appendChild(sep);
    }
    const opt = document.createElement('option');
    opt.value = engine.id;
    opt.textContent = engine.label;
    engineSelect.appendChild(opt);
    lastWasFeatured = Boolean(engine.featured);
  });
  engineSelect.value = 'd2';
  currentEngine = 'd2';

  if (layoutSelect && window.kroki.D2_LAYOUTS) {
    layoutSelect.innerHTML = '';
    window.kroki.D2_LAYOUTS.forEach((layout) => {
      const opt = document.createElement('option');
      opt.value = layout.id;
      opt.textContent = layout.label;
      layoutSelect.appendChild(opt);
    });
    layoutSelect.value = 'dagre';
    layoutSelect.disabled = false;
    layoutSelect.addEventListener('change', () => {
      syncState(true);
    });
  }

  if (themeSelect && window.kroki.D2_THEMES) {
    themeSelect.innerHTML = '';
    window.kroki.D2_THEMES.forEach((theme) => {
      const opt = document.createElement('option');
      opt.value = theme.id;
      opt.textContent = theme.label;
      themeSelect.appendChild(opt);
    });
    themeSelect.value = 'default';
    themeSelect.disabled = false;
    themeSelect.addEventListener('change', () => {
      syncState(true);
    });
  }

  engineSelect.addEventListener('change', async () => {
    const prevEngine = currentEngine;
    const nextEngine = engineSelect.value;
    const currentCode = editor ? editor.getValue() : '';

    currentEngine = nextEngine;
    setEditorModeForEngine(nextEngine);

    const isEmpty = !currentCode.trim();
    const hasLoadedFile = Boolean(fileState.name);
    const isStockExample =
      isEmpty || (!hasLoadedFile && (await window.kroki.isExampleCode(currentCode, prevEngine)));

    if (isStockExample) {
      try {
        const exampleCode = await window.kroki.loadExample(nextEngine);
        if (currentEngine === nextEngine) {
          setEditorCode(exampleCode, true);
          syncState(true);
        }
      } catch (err) {
        console.error('Failed to load example:', err);
      }
    } else {
      syncState(true);
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
  const layoutSelect = document.getElementById('layout-select');
  const themeSelect = document.getElementById('theme-select');
  if (!engineSelect || !formatSelect || !editor) return;

  const engine = engineSelect.value || 'd2';
  const format = formatSelect.value || 'svg';
  const options = {
    layout: layoutSelect ? layoutSelect.value : 'dagre',
    theme: themeSelect ? themeSelect.value : 'default'
  };
  const code = editor.getValue();

  if (!code.trim()) {
    if (window.viewer && typeof window.viewer.showError === 'function') {
      window.viewer.showError('Empty diagram source');
    }
    return;
  }

  const payload = window.kroki.encode(code);
  const query = window.kroki.buildOptionsQuery(engine, options);
  const krokiUrl = window.kroki.buildUrl(engine, format, payload, options);
  const hashState = `#${engine}/${format}/${payload}${query}`;
  const appUrl = `${window.location.origin}${window.location.pathname}${hashState}`;

  window.history.replaceState(null, '', hashState);

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
  const layoutSelect = document.getElementById('layout-select');
  const themeSelect = document.getElementById('theme-select');
  const rawHash = window.location.hash.replace(/^#\/?/, '');

  if (rawHash) {
    const [pathPart, queryPart = ''] = rawHash.split('?');
    const parts = pathPart.split('/');
    if (parts.length >= 3) {
      const engine = parts[0];
      const format = parts[1];
      const payload = parts.slice(2).join('/');

      const validFormat = format === 'svg' || format === 'png';
      let decoded = null;
      try {
        decoded = window.kroki.decode(payload);
      } catch (err) {
        console.error('Failed to decode URL state:', err);
      }

      const resolvedEngine = window.kroki.resolveEngineId
        ? window.kroki.resolveEngineId(engine, decoded || '')
        : (window.kroki.ENGINES.some((e) => e.id === engine) ? engine : null);

      if (resolvedEngine && engineSelect) {
        engineSelect.value = resolvedEngine;
        currentEngine = resolvedEngine;
        setEditorModeForEngine(resolvedEngine);
      }
      if (validFormat && formatSelect) {
        formatSelect.value = format;
      }

      if (queryPart && resolvedEngine === 'd2') {
        const params = new URLSearchParams(queryPart);
        const layout = params.get('layout');
        const theme = params.get('theme');
        if (layout && layoutSelect && window.kroki.D2_LAYOUTS.some((l) => l.id === layout)) {
          layoutSelect.value = layout;
        }
        if (theme && themeSelect && window.kroki.D2_THEMES.some((t) => t.id === theme)) {
          themeSelect.value = theme;
        }
      }

      if (decoded !== null) {
        setEditorCode(decoded, true);
        return;
      }
    }
  }

  try {
    const defaultCode = await window.kroki.loadExample(currentEngine);
    setEditorCode(defaultCode, true);
  } catch (err) {
    console.error('Failed to load initial example:', err);
  }
}

function hasUnsavedChanges() {
  if (!editor) return false;
  const currentCode = editor.getValue();
  if (fileState.name) {
    return currentCode !== fileState.savedContent;
  }
  return currentCode.trim() !== '' && currentCode !== baselineContent;
}

function flashSaveButton() {
  const saveBtn = document.getElementById('file-save-btn');
  if (!saveBtn) return;
  saveBtn.classList.add('saved');
  setTimeout(() => {
    saveBtn.classList.remove('saved');
  }, 1400);
}

function supportsFileSystemAccess() {
  return (
    typeof window.showOpenFilePicker === 'function' &&
    typeof window.showSaveFilePicker === 'function'
  );
}

function initProgressiveFileUI() {
  const hasFSA = supportsFileSystemAccess();
  const saveBtn = document.getElementById('file-save-btn');
  const saveIcon = document.getElementById('file-save-icon');
  const downloadIcon = document.getElementById('file-download-icon');
  const saveAsBtn = document.getElementById('file-save-as-btn');
  const autoSaveBtn = document.getElementById('file-autosave-btn');
  const fileInputText = document.getElementById('out-file-text');

  if (!hasFSA) {
    if (saveIcon) saveIcon.style.display = 'none';
    if (downloadIcon) downloadIcon.style.display = 'inline-flex';
    if (saveAsBtn) saveAsBtn.style.display = 'none';
    if (autoSaveBtn) autoSaveBtn.style.display = 'none';
    if (saveBtn) {
      saveBtn.setAttribute('data-tooltip', 'Download source file (Ctrl+S)');
      saveBtn.setAttribute('aria-label', 'Download source file (Ctrl+S)');
    }
    if (fileInputText) {
      fileInputText.placeholder =
        'No local file — Open (Ctrl+O), Download source (Ctrl+S), or drop a file anywhere';
    }
  }
  updateLocalFileUI();
}

function updateLocalFileUI() {
  const hasFSA = supportsFileSystemAccess();
  const fileInputText = document.getElementById('out-file-text');
  const saveBtn = document.getElementById('file-save-btn');
  const autoSaveBtn = document.getElementById('file-autosave-btn');
  const targetIcon = document.getElementById('file-target-icon');

  if (autoSaveBtn) {
    autoSaveBtn.classList.toggle('active', Boolean(fileState.autoSave));
  }

  if (!fileState.name) {
    fileState.isDirty = false;
    if (fileInputText) {
      fileInputText.value = '';
      fileInputText.classList.remove('dirty');
    }
    if (saveBtn) saveBtn.classList.remove('dirty');
    if (targetIcon) targetIcon.classList.remove('dirty');
    return;
  }

  const currentCode = editor ? editor.getValue() : '';
  fileState.isDirty = currentCode !== fileState.savedContent;

  if (saveBtn) saveBtn.classList.toggle('dirty', fileState.isDirty);
  if (targetIcon) targetIcon.classList.toggle('dirty', fileState.isDirty);
  if (fileInputText) {
    fileInputText.classList.toggle('dirty', fileState.isDirty);
    let statusLabel = 'Saved';
    if (fileState.isDirty) {
      statusLabel = isSavingInProgress ? 'Saving...' : 'Unsaved changes';
    } else if (fileState.autoSave && fileState.handle) {
      statusLabel = 'Auto-save active';
    } else if (!fileState.handle) {
      statusLabel = hasFSA ? 'Loaded (Save to link file on disk)' : 'Loaded';
    }
    fileInputText.value = `${fileState.name}  •  ${statusLabel}`;
  }
}

async function ensureReadWritePermission(handle) {
  if (!handle) return false;
  if (typeof handle.queryPermission === 'function') {
    let perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') return true;
    if (typeof handle.requestPermission === 'function') {
      perm = await handle.requestPermission({ mode: 'readwrite' });
      return perm === 'granted';
    }
    return false;
  }
  return true;
}

async function writeToFileHandle(handle, content) {
  const granted = await ensureReadWritePermission(handle);
  if (!granted) {
    throw new Error('Write permission not granted');
  }
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
}

function triggerFallbackDownload(filename, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function performAutoSave() {
  if (!fileState.autoSave || !fileState.handle || !editor) return;
  if (isSavingInProgress) {
    pendingAutoSave = true;
    return;
  }

  const contentToSave = editor.getValue();
  if (contentToSave === fileState.savedContent) {
    updateLocalFileUI();
    return;
  }

  isSavingInProgress = true;
  updateLocalFileUI();

  try {
    await writeToFileHandle(fileState.handle, contentToSave);
    fileState.savedContent = contentToSave;
    baselineContent = contentToSave;
    flashSaveButton();
  } catch (err) {
    console.error('Auto-save failed:', err);
    fileState.autoSave = false;
  } finally {
    isSavingInProgress = false;
    updateLocalFileUI();
    if (pendingAutoSave) {
      pendingAutoSave = false;
      if (editor.getValue() !== fileState.savedContent) {
        performAutoSave();
      }
    }
  }
}

async function loadFileIntoEditor(file, handle = null) {
  if (!file) return;
  try {
    const text = await file.text();
    fileState.handle = handle || null;
    fileState.name = file.webkitRelativePath || file.name || 'untitled.txt';
    fileState.savedContent = text;
    fileState.isDirty = false;
    baselineContent = text;

    if (fileState.autoSave) {
      if (!fileState.handle) {
        fileState.autoSave = false;
      } else {
        const granted = await ensureReadWritePermission(fileState.handle).catch(() => false);
        if (!granted) {
          fileState.autoSave = false;
        }
      }
    }

    setEditorCode(text, false);
    updateLocalFileUI();
    syncState(true);
  } catch (err) {
    console.error('Failed to read local file:', err);
  }
}

async function openLocalFile() {
  if (fileState.isDirty) {
    const proceed = window.confirm(
      `You have unsaved changes in "${fileState.name}". Open another file anyway?`
    );
    if (!proceed) return;
  }

  if (typeof window.showOpenFilePicker === 'function') {
    try {
      const [handle] = await window.showOpenFilePicker({ multiple: false });
      if (!handle) return;
      const file = await handle.getFile();
      await loadFileIntoEditor(file, handle);
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      console.error('Failed to open file via File System Access API:', err);
    }
  }

  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.click();
  }
}

async function saveLocalFileAs() {
  if (!editor) return false;
  const content = editor.getValue();
  const ext = window.kroki.getEngineExtension(currentEngine);
  const suggestedName = fileState.name || `diagram.${ext}`;

  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({ suggestedName });
      if (!handle) return false;
      await writeToFileHandle(handle, content);
      fileState.handle = handle;
      fileState.name = handle.name || suggestedName;
      fileState.savedContent = content;
      fileState.isDirty = false;
      baselineContent = content;
      flashSaveButton();
      updateLocalFileUI();
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
      console.error('Failed to save file as:', err);
      return false;
    }
  }

  triggerFallbackDownload(suggestedName, content);
  fileState.name = suggestedName;
  fileState.savedContent = content;
  fileState.isDirty = false;
  baselineContent = content;
  flashSaveButton();
  updateLocalFileUI();
  return true;
}

async function saveLocalFile() {
  if (!editor) return false;
  const content = editor.getValue();

  if (fileState.handle) {
    try {
      isSavingInProgress = true;
      updateLocalFileUI();
      await writeToFileHandle(fileState.handle, content);
      fileState.savedContent = content;
      fileState.isDirty = false;
      baselineContent = content;
      flashSaveButton();
      return true;
    } catch (err) {
      if (err && err.name === 'AbortError') return false;
      console.error('Failed to write to file handle:', err);
    } finally {
      isSavingInProgress = false;
      updateLocalFileUI();
    }
  }

  return saveLocalFileAs();
}

function toggleVimMode() {
  isVimMode = !isVimMode;
  localStorage.setItem('disperse-vim-mode', isVimMode);
  
  const editorContainer = document.getElementById('editor-container');
  if (editor) {
    if (isVimMode) {
      editor.setKeyboardHandler('ace/keyboard/vim');
      editor.setTheme('ace/theme/tomorrow_night');
    } else {
      editor.setKeyboardHandler(null);
      const isDark = window.themeManager ? window.themeManager.isDark : false;
      editor.setTheme(isDark ? 'ace/theme/tomorrow_night' : 'ace/theme/chrome');
    }
  }
  const vimBtn = document.getElementById('editor-vim-mode');
  if (vimBtn) {
    vimBtn.classList.toggle('active', isVimMode);
  }
}

async function toggleAutoSave() {
  if (fileState.autoSave) {
    fileState.autoSave = false;
    updateLocalFileUI();
    return;
  }

  const supportsFileSystem =
    typeof window.showSaveFilePicker === 'function' || Boolean(fileState.handle);

  if (!supportsFileSystem) {
    window.alert(
      'Direct auto-save to disk requires a browser with File System Access API support (e.g., Chrome, Edge, Brave). You can still save manually with Ctrl+S.'
    );
    return;
  }

  if (!fileState.handle) {
    const saved = await saveLocalFileAs();
    if (!saved || !fileState.handle) return;
  } else {
    const granted = await ensureReadWritePermission(fileState.handle);
    if (!granted) return;
  }

  fileState.autoSave = true;
  updateLocalFileUI();

  if (fileState.isDirty) {
    await performAutoSave();
  }
}

function initFullscreen() {
  const btn = document.getElementById('fullscreen-btn');
  const iconMax = document.getElementById('fullscreen-icon-maximize');
  const iconMin = document.getElementById('fullscreen-icon-minimize');
  if (!btn) return;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    toggleFullscreen();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  const updateIcons = () => {
    if (document.fullscreenElement) {
      if (iconMax) iconMax.style.display = 'none';
      if (iconMin) iconMin.style.display = 'inline-block';
    } else {
      if (iconMax) iconMax.style.display = 'inline-block';
      if (iconMin) iconMin.style.display = 'none';
    }
  };

  document.addEventListener('fullscreenchange', updateIcons);
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
  initFullscreen();
  initSelects();
  initEditor();
  initSplitter();
  initExportSplitter();
  if (window.viewer) {
    window.viewer.init();
  }
  initSnippets();
  initProgressiveFileUI();

  await loadFromUrl();
  syncState(true);
  
  if (editor) {
    editor.focus();
  }

  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      syncState(true);
    });
  }

  window.addEventListener(
    'keydown',
    (e) => {
      // Ctrl/Cmd bindings
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        syncState(true);
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        openLocalFile();
      } else if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          saveLocalFileAs();
        } else {
          saveLocalFile();
        }
      }
      // Alt bindings
      else if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        // On Windows with NumLock ON, Shift+Numpad0 is translated by the OS into Insert with shiftKey=false
        const isShiftedNumpad0 = e.code === 'Numpad0' && (key === 'insert' || e.keyCode === 45);

        if (!e.shiftKey && !isShiftedNumpad0) {
          switch (key) {
            case 't': e.preventDefault(); document.getElementById('theme-btn')?.click(); break;
            case 'v': e.preventDefault(); document.getElementById('editor-vim-mode')?.click(); break;
            case 'a': e.preventDefault(); document.getElementById('file-autosave-btn')?.click(); break;
            case 'd': e.preventDefault(); document.getElementById('download-btn')?.click(); break;
            case '1': case '¡': e.preventDefault(); document.getElementById('split-max-editor')?.click(); break;
            case '2': case '™': e.preventDefault(); document.getElementById('split-reset')?.click(); break;
            case '3': case '£': e.preventDefault(); document.getElementById('split-max-viewer')?.click(); break;
            case '+': case '=': e.preventDefault(); document.getElementById('zoom-in')?.click(); break;
            case '-': e.preventDefault(); document.getElementById('zoom-out')?.click(); break;
            case '0': case 'º': e.preventDefault(); document.getElementById('zoom-fit')?.click(); break;
            case 'enter': e.preventDefault(); document.getElementById('maximize-preview')?.click(); break;
            case 'l': e.preventDefault(); document.getElementById('brand-link')?.click(); break;
            case 'i': e.preventDefault(); document.querySelector('button[data-input="out-image-text"]')?.click(); break;
            case 'e': e.preventDefault(); document.querySelector('button[data-input="out-editor-text"]')?.click(); break;
            case 'x': e.preventDefault(); if (toggleExportSection) toggleExportSection(); break;
          }
        } else { // Alt + Shift
          if (isShiftedNumpad0 || e.code === 'Digit0' || e.code === 'Numpad0' || e.keyCode === 48 || e.keyCode === 96 || e.keyCode === 45 || e.key === '0' || e.key === ')' || e.key === '=' || key === 'insert') {
            e.preventDefault(); document.getElementById('editor-font-fit')?.click();
          } else if (e.code === 'Equal' || e.code === 'NumpadAdd' || e.code === 'BracketRight' || e.keyCode === 187 || e.keyCode === 107 || e.key === '+') {
            e.preventDefault(); document.getElementById('editor-font-in')?.click();
          } else if (e.code === 'Minus' || e.code === 'NumpadSubtract' || e.code === 'Slash' || e.keyCode === 189 || e.keyCode === 109 || e.key === '_' || e.key === '-') {
            e.preventDefault(); document.getElementById('editor-font-out')?.click();
          }
        }
      }
    },
    true
  );

  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  // Editor font controls
  const btnFontIn = document.getElementById('editor-font-in');
  const btnFontOut = document.getElementById('editor-font-out');
  const btnFontFit = document.getElementById('editor-font-fit');
  const btnVimMode = document.getElementById('editor-vim-mode');

  if (btnVimMode) {
    btnVimMode.addEventListener('click', toggleVimMode);
  }

  if (btnFontIn && btnFontOut && btnFontFit) {
    const changeFontSize = (delta) => {
      if (!editor) return;
      let currentSize = parseInt(editor.getOption('fontSize')) || 14;
      let newSize = Math.max(8, Math.min(64, currentSize + delta));
      editor.setOption('fontSize', newSize + 'px');
    };

    btnFontIn.addEventListener('click', () => changeFontSize(2));
    btnFontOut.addEventListener('click', () => changeFontSize(-2));
    btnFontFit.addEventListener('click', () => {
      if (editor) editor.setOption('fontSize', '14px');
    });
  }

  // Local file controls in footer
  const fileOpenBtn = document.getElementById('file-open-btn');
  const fileSaveBtn = document.getElementById('file-save-btn');
  const fileSaveAsBtn = document.getElementById('file-save-as-btn');
  const fileAutoSaveBtn = document.getElementById('file-autosave-btn');
  const fileInput = document.getElementById('file-input');
  const outFileText = document.getElementById('out-file-text');

  if (fileOpenBtn) {
    fileOpenBtn.addEventListener('click', () => openLocalFile());
  }
  if (fileSaveBtn) {
    fileSaveBtn.addEventListener('click', () => saveLocalFile());
  }
  if (fileSaveAsBtn) {
    fileSaveAsBtn.addEventListener('click', () => saveLocalFileAs());
  }
  if (fileAutoSaveBtn) {
    fileAutoSaveBtn.addEventListener('click', () => toggleAutoSave());
  }
  if (outFileText) {
    outFileText.addEventListener('click', () => {
      if (!fileState.name) {
        openLocalFile();
      }
    });
  }
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        await loadFileIntoEditor(e.target.files[0], null);
        fileInput.value = '';
      }
    });
  }

  // Drag and drop functionality
  const dropOverlay = document.getElementById('drop-overlay');
  let dragCounter = 0;

  const isFileDrag = (e) => {
    if (!e.dataTransfer) return false;
    if (e.dataTransfer.types && e.dataTransfer.types.length > 0) {
      return Array.from(e.dataTransfer.types).some(
        (t) => t === 'Files' || t === 'application/x-moz-file'
      );
    }
    return Boolean(e.dataTransfer.files && e.dataTransfer.files.length > 0);
  };

  const showDropOverlay = () => {
    document.body.classList.add('drag-over');
    if (dropOverlay) dropOverlay.classList.add('active');
  };

  const hideDropOverlay = () => {
    dragCounter = 0;
    document.body.classList.remove('drag-over');
    if (dropOverlay) dropOverlay.classList.remove('active');
  };

  window.addEventListener(
    'dragenter',
    (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      showDropOverlay();
    },
    true
  );

  window.addEventListener(
    'dragover',
    (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      showDropOverlay();
    },
    true
  );

  window.addEventListener(
    'dragleave',
    (e) => {
      if (dragCounter === 0 && !document.body.classList.contains('drag-over')) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter = Math.max(0, dragCounter - 1);
      const leftWindow =
        !e.relatedTarget &&
        (e.clientX <= 0 ||
          e.clientY <= 0 ||
          e.clientX >= window.innerWidth ||
          e.clientY >= window.innerHeight);
      if (dragCounter === 0 || leftWindow) {
        hideDropOverlay();
      }
    },
    true
  );

  window.addEventListener(
    'drop',
    async (e) => {
      if (!isFileDrag(e) && !document.body.classList.contains('drag-over')) return;
      e.preventDefault();
      e.stopPropagation();
      hideDropOverlay();

      const droppedFile =
        e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0
          ? e.dataTransfer.files[0]
          : null;

      let handlePromise = null;
      if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const firstItem = e.dataTransfer.items[0];
        if (typeof firstItem.getAsFileSystemHandle === 'function') {
          handlePromise = firstItem.getAsFileSystemHandle().catch(() => null);
        }
      }

      if (fileState.isDirty) {
        const proceed = window.confirm(
          `You have unsaved changes in "${fileState.name}". Load dropped file anyway?`
        );
        if (!proceed) return;
      }

      let handle = null;
      if (handlePromise) {
        const resolved = await handlePromise;
        if (resolved && resolved.kind === 'file') {
          handle = resolved;
        }
      }

      if (handle) {
        const file = await handle.getFile();
        await loadFileIntoEditor(file, handle);
      } else if (droppedFile) {
        await loadFileIntoEditor(droppedFile, null);
      }
    },
    true
  );

  window.addEventListener('blur', hideDropOverlay);
});
