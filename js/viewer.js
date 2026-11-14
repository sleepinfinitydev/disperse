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
      excludeClass: 'panzoom-exclude'
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

const FORBIDDEN_SVG_TAGS = new Set([
  'script',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'applet',
  'audio',
  'video',
  'source',
  'track',
  'canvas',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'option',
  'meta',
  'link',
  'base',
  'noscript',
  'template',
  'portal',
  'marquee'
]);

const SMIL_ANIMATION_TAGS = new Set([
  'set',
  'animate',
  'animatetransform',
  'animatemotion',
  'animatecolor'
]);

const URI_ATTRIBUTES = new Set([
  'href',
  'xlink:href',
  'src',
  'action',
  'formaction',
  'data',
  'poster',
  'ping'
]);

function sanitizeCssText(cssText) {
  if (!cssText) return '';
  return String(cssText)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/@import\b[^;]*;?/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/(?:javascript|vbscript)\s*:/gi, '');
}

function isSafeSvgUri(rawVal, tagLower) {
  const normalized = String(rawVal || '')
    .replace(/[\u0000-\u0020]+/g, '')
    .toLowerCase();
  if (!normalized) return true;
  if (normalized.startsWith('#')) return true;
  if (tagLower === 'use' || tagLower === 'feimage') {
    return false;
  }
  if (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('file:')
  ) {
    return false;
  }
  if (normalized.startsWith('data:')) {
    if (tagLower === 'image' || tagLower === 'img') {
      return /^data:image\/(?:png|jpeg|jpg|gif|webp);base64,[a-z0-9+/=_-]+$/i.test(normalized);
    }
    return false;
  }
  if (tagLower === 'a') {
    return (
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('mailto:')
    );
  }
  return (
    normalized.startsWith('http://') ||
    normalized.startsWith('https://') ||
    !/^[a-z][a-z0-9+.-]*:/i.test(normalized)
  );
}

function sanitizeSvgTree(rootSvg) {
  const walker = rootSvg.ownerDocument.createTreeWalker(rootSvg, NodeFilter.SHOW_ELEMENT);
  const toRemove = [];
  let node = rootSvg;

  while (node) {
    const tagLower = (node.localName || node.tagName || '').toLowerCase();

    if (FORBIDDEN_SVG_TAGS.has(tagLower)) {
      toRemove.push(node);
    } else if (SMIL_ANIMATION_TAGS.has(tagLower)) {
      const targetAttr = (node.getAttribute('attributeName') || '').trim().toLowerCase();
      const smilVals = [
        node.getAttribute('to') || '',
        node.getAttribute('from') || '',
        node.getAttribute('by') || '',
        node.getAttribute('values') || ''
      ].join(' ');
      if (
        targetAttr.startsWith('on') ||
        URI_ATTRIBUTES.has(targetAttr) ||
        /(?:javascript|vbscript|data)\s*:/i.test(smilVals)
      ) {
        toRemove.push(node);
      }
    }

    if (!toRemove.includes(node)) {
      const attrs = Array.from(node.attributes || []);
      for (const attr of attrs) {
        const attrNameLower = attr.name.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
        const attrLocalLower = (attr.localName || attrNameLower).toLowerCase();

        if (
          attrNameLower.startsWith('on') ||
          attrLocalLower.startsWith('on') ||
          attrNameLower === 'srcdoc' ||
          attrNameLower === 'formaction' ||
          attrNameLower === 'ping'
        ) {
          node.removeAttributeNode(attr);
          continue;
        }

        if (URI_ATTRIBUTES.has(attrNameLower) || URI_ATTRIBUTES.has(attrLocalLower)) {
          if (!isSafeSvgUri(attr.value, tagLower)) {
            node.removeAttributeNode(attr);
            continue;
          }
          if (tagLower === 'a' && !String(attr.value || '').trim().startsWith('#')) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        } else if (attrNameLower === 'style') {
          const cleanStyle = sanitizeCssText(attr.value);
          if (cleanStyle.trim()) {
            node.setAttribute('style', cleanStyle);
          } else {
            node.removeAttributeNode(attr);
          }
        }
      }

      if (tagLower === 'style') {
        node.textContent = sanitizeCssText(node.textContent);
      }
    }

    node = walker.nextNode();
  }

  for (const badNode of toRemove) {
    if (badNode.parentNode) {
      badNode.parentNode.removeChild(badNode);
    }
  }
}

function parseAndSanitizeSvg(svgRaw) {
  const parser = new DOMParser();
  let xmlDoc = parser.parseFromString(String(svgRaw || ''), 'image/svg+xml');
  let svgNode = null;

  if (
    xmlDoc &&
    !xmlDoc.querySelector('parsererror') &&
    xmlDoc.documentElement &&
    (xmlDoc.documentElement.localName || xmlDoc.documentElement.tagName || '').toLowerCase() === 'svg'
  ) {
    svgNode = xmlDoc.documentElement;
  } else {
    const htmlDoc = parser.parseFromString(String(svgRaw || ''), 'text/html');
    svgNode = htmlDoc ? htmlDoc.querySelector('svg') : null;
  }

  if (!svgNode) {
    throw new Error('Invalid SVG response from rendering server');
  }

  sanitizeSvgTree(svgNode);
  return document.importNode(svgNode, true);
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
        const svgEl = parseAndSanitizeSvg(data);
        svgEl.style.maxWidth = '100%';
        svgEl.style.maxHeight = '100%';
        svgEl.style.width = 'auto';
        svgEl.style.height = 'auto';
        viewer.replaceChildren(svgEl);
        lastRenderedData.svgText = new XMLSerializer().serializeToString(svgEl);
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
  setPanzoomEnabled(enabled) {
    if (panzoomInstance && typeof panzoomInstance.setOptions === 'function') {
      panzoomInstance.setOptions({
        disablePan: !enabled,
        disableZoom: !enabled
      });
    }
  },
  cancelPending() {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
  }
};
