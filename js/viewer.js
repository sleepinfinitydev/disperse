let panzoomInstance = null;
let currentAbortController = null;
let lastRenderedData = {
  format: 'svg',
  engine: 'd2',
  svgText: '',
  blobUrl: ''
};

function initViewer() {
  const viewer = document.getElementById('viewer');
  const viewerContainer = document.getElementById('viewer-container');
  const errorBox = document.getElementById('viewer-error');

  if (errorBox) {
    ['pointerdown', 'mousedown', 'touchstart'].forEach((evtName) => {
      errorBox.addEventListener(evtName, (e) => {
        e.stopPropagation();
      });
    });
  }

  if (typeof Panzoom === 'function' && viewer) {
    panzoomInstance = Panzoom(viewer, {
      maxScale: 12,
      minScale: 0.1,
      step: 0.25,
      canvas: true,
      excludeClass: 'viewer-error'
    });

    if (viewerContainer) {
      viewerContainer.addEventListener(
        'wheel',
        (e) => {
          if (!panzoomInstance) return;
          if (viewerContainer.classList.contains('wysiwyg-active')) return;
          if (e.target && e.target.closest('#viewer-error, .viewer-actions, #wysiwyg-container')) {
            return;
          }
          panzoomInstance.zoomWithWheel(e);
        },
        { passive: false }
      );
    }
  }

  const zoomInBtn = document.getElementById('zoom-in');
  const zoomOutBtn = document.getElementById('zoom-out');
  const zoomFitBtn = document.getElementById('zoom-fit');
  const downloadBtn = document.getElementById('download-btn');

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.wysiwyg && window.wysiwyg.isActive()) {
        window.wysiwyg.zoomIn();
        return;
      }
      if (panzoomInstance) panzoomInstance.zoomIn();
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.wysiwyg && window.wysiwyg.isActive()) {
        window.wysiwyg.zoomOut();
        return;
      }
      if (panzoomInstance) panzoomInstance.zoomOut();
    });
  }
  if (zoomFitBtn) {
    zoomFitBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.wysiwyg && window.wysiwyg.isActive()) {
        window.wysiwyg.zoomFit();
        return;
      }
      if (panzoomInstance) panzoomInstance.reset();
    });
  }
  if (downloadBtn) {
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.wysiwyg && window.wysiwyg.isActive()) {
        const formatSelect = document.getElementById('format-select');
        window.wysiwyg.download(formatSelect ? formatSelect.value : 'svg');
        return;
      }
      downloadDiagram();
    });
  }
}

function showViewerError(message) {
  const viewer = document.getElementById('viewer');
  const loading = document.getElementById('loading');
  const errorBox = document.getElementById('viewer-error');
  const errorText = document.getElementById('viewer-error-text');

  if (loading) loading.style.display = 'none';
  if (viewer) {
    viewer.innerHTML = '';
    viewer.style.opacity = '1';
  }
  if (errorText) {
    errorText.textContent = (message || 'Syntax or rendering error').trim();
  }
  if (errorBox) {
    errorBox.style.display = 'flex';
  }
}

function hideViewerError() {
  const errorBox = document.getElementById('viewer-error');
  const errorText = document.getElementById('viewer-error-text');
  if (errorBox) errorBox.style.display = 'none';
  if (errorText) errorText.textContent = '';
}

function updateViewer(url, format, engine) {
  const viewer = document.getElementById('viewer');
  const loading = document.getElementById('loading');

  if (!viewer) return;

  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();

  if (loading) loading.style.display = 'flex';
  viewer.style.opacity = '0.35';

  fetch(url, { signal: currentAbortController.signal })
    .then(async (res) => {
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `HTTP ${res.status} (${res.statusText || 'Error'})`);
      }
      if (format === 'svg') {
        return res.text();
      }
      return res.blob();
    })
    .then((data) => {
      if (lastRenderedData.blobUrl) {
        URL.revokeObjectURL(lastRenderedData.blobUrl);
        lastRenderedData.blobUrl = '';
      }

      hideViewerError();
      viewer.innerHTML = '';
      lastRenderedData.format = format;
      lastRenderedData.engine = engine || 'diagram';

      if (format === 'svg') {
        lastRenderedData.svgText = data;
        viewer.innerHTML = data;
        const svgEl = viewer.querySelector('svg');
        if (svgEl) {
          svgEl.style.maxWidth = '100%';
          svgEl.style.maxHeight = '100%';
          svgEl.style.width = 'auto';
          svgEl.style.height = 'auto';
        }
      } else {
        lastRenderedData.svgText = '';
        const blobUrl = URL.createObjectURL(data);
        lastRenderedData.blobUrl = blobUrl;
        const img = document.createElement('img');
        img.src = blobUrl;
        img.alt = '';
        img.draggable = false;
        viewer.appendChild(img);
      }

      if (loading) loading.style.display = 'none';
      viewer.style.opacity = '1';
      if (panzoomInstance) {
        panzoomInstance.reset({ animate: false });
      }
    })
    .catch((err) => {
      if (err && err.name === 'AbortError') return;
      showViewerError(err && err.message ? err.message : 'Unable to render diagram');
    });
}

function downloadDiagram() {
  const format = lastRenderedData.format || 'svg';
  const engine = lastRenderedData.engine || 'diagram';
  let downloadUrl = '';
  let revokeAfter = false;

  if (format === 'svg') {
    let source = lastRenderedData.svgText;
    if (!source) {
      const svgEl = document.querySelector('#viewer svg');
      if (!svgEl) return;
      source = new XMLSerializer().serializeToString(svgEl);
    }
    if (!source.includes('xmlns="http://www.w3.org/2000/svg"')) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    downloadUrl = URL.createObjectURL(blob);
    revokeAfter = true;
  } else {
    if (!lastRenderedData.blobUrl) return;
    downloadUrl = lastRenderedData.blobUrl;
  }

  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `disperse-${engine}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  if (revokeAfter) {
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }
}

window.viewer = {
  init: initViewer,
  update: updateViewer,
  download: downloadDiagram,
  showError: showViewerError,
  hideError: hideViewerError,
  cancelPending() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }
};
