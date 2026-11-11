function hexToRgb(hex) {
  const clean = (hex || '#0080c0').replace('#', '');
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [0, 128 / 255, 192 / 255];
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return [r, g, b];
}

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

// Accurate sRGB [0..1] to OKLCH { L, C, H }
function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bVal = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  const C = Math.sqrt(a * a + bVal * bVal);
  let H = (Math.atan2(bVal, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  return { L, C, H };
}

function updateTheme(hexColor, isDark) {
  const [r, g, b] = hexToRgb(hexColor);
  const { C: baseC, H: baseH } = rgbToOklch(r, g, b);

  const root = document.documentElement;
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const Hp = Number.isFinite(baseH) ? Number(baseH.toFixed(2)) : 240;
  const Hs = Number(((Hp + 30) % 360).toFixed(2));
  const Ht = Number(((Hp + 180) % 360).toFixed(2));
  const Hq = Number(((Hp + 210) % 360).toFixed(2));

  // Keep user's chroma vivid within spec range (0.14 - 0.18), or subtle if greyscale chosen
  const Caccent = baseC < 0.02 ? 0.02 : Math.min(0.18, Math.max(0.14, Number(baseC.toFixed(3))));
  const Csurface = baseC < 0.01 ? 0.005 : (isDark ? 0.025 : 0.015);
  const Cborder = baseC < 0.01 ? 0.01 : (isDark ? 0.04 : 0.03);

  const LbgMain = isDark ? 0.17 : 0.965;
  const LbgPanel = isDark ? 0.21 : 0.99;
  const LbgSurface = isDark ? 0.25 : 0.935;
  const LtextMain = isDark ? 0.92 : 0.20;
  const LtextMuted = isDark ? 0.72 : 0.45;
  const Lborder = isDark ? 0.32 : 0.86;
  const Laccent = isDark ? 0.73 : 0.53;
  const LaccentHover = isDark ? 0.79 : 0.46;

  root.style.setProperty('--hue-primary', `${Hp}`);
  root.style.setProperty('--hue-secondary', `${Hs}`);
  root.style.setProperty('--hue-tertiary', `${Ht}`);
  root.style.setProperty('--hue-quaternary', `${Hq}`);

  root.style.setProperty('--bg-main', `oklch(${LbgMain} ${Csurface} ${Hp})`);
  root.style.setProperty('--bg-panel', `oklch(${LbgPanel} ${Csurface} ${Hp})`);
  root.style.setProperty('--bg-surface', `oklch(${LbgSurface} ${Csurface} ${Hs})`);
  root.style.setProperty('--text-main', `oklch(${LtextMain} 0.02 ${Hp})`);
  root.style.setProperty('--text-muted', `oklch(${LtextMuted} 0.03 ${Hs})`);
  root.style.setProperty('--border-color', `oklch(${Lborder} ${Cborder} ${Hp})`);

  const colorP = `oklch(${Laccent} ${Caccent} ${Hp})`;
  const colorS = `oklch(${Laccent} ${Caccent} ${Hs})`;
  const colorT = `oklch(${Laccent} ${Caccent} ${Ht})`;
  const colorQ = `oklch(${Laccent} ${Caccent} ${Hq})`;

  root.style.setProperty('--color-primary', colorP);
  root.style.setProperty('--color-primary-hover', `oklch(${LaccentHover} ${Caccent} ${Hp})`);
  root.style.setProperty('--color-secondary', colorS);
  root.style.setProperty('--color-tertiary', colorT);
  root.style.setProperty('--color-quaternary', colorQ);
  root.style.setProperty('--selection-bg', `oklch(${isDark ? 0.35 : 0.88} ${Math.min(0.08, Caccent)} ${Hp})`);
  root.style.setProperty('--preferred-color', hexColor);

  updateBrandIcon(colorP, colorS, colorT, colorQ);

  const colorSwatch = document.getElementById('color-swatch');
  if (colorSwatch) {
    colorSwatch.style.backgroundColor = hexColor;
  }

  const iconLight = document.getElementById('theme-icon-light');
  const iconDark = document.getElementById('theme-icon-dark');
  if (iconLight && iconDark) {
    iconLight.style.display = isDark ? 'none' : 'inline-flex';
    iconDark.style.display = isDark ? 'inline-flex' : 'none';
  }

  if (window.editor && typeof window.editor.setTheme === 'function') {
    const isVim = localStorage.getItem('disperse-vim-mode') === 'true';
    window.editor.setTheme((isDark || isVim) ? 'ace/theme/tomorrow_night' : 'ace/theme/chrome');
  }

  if (window.wysiwyg && typeof window.wysiwyg.setTheme === 'function') {
    window.wysiwyg.setTheme(isDark ? 'dark' : 'light');
  }

  try {
    localStorage.setItem('disperse-color', hexColor);
    localStorage.setItem('disperse-theme', isDark ? 'dark' : 'light');
  } catch (_) {
    // Ignore storage errors in private mode
  }
}

function updateBrandIcon(cP, cS, cT, cQ) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" fill="none"><line x1="4" y1="32" x2="18" y2="32" stroke="${cP}" stroke-width="4" stroke-linecap="round"/><path d="M30 22 L52 10" stroke="${cP}" stroke-width="3.5" stroke-linecap="round"/><path d="M33 28 L54 24" stroke="${cS}" stroke-width="3.5" stroke-linecap="round"/><path d="M33 36 L54 40" stroke="${cT}" stroke-width="3.5" stroke-linecap="round"/><path d="M30 42 L52 54" stroke="${cQ}" stroke-width="3.5" stroke-linecap="round"/><polygon points="14,14 36,32 14,50" fill="${cP}" fill-opacity="0.18" stroke="${cP}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="54" cy="10" r="5" fill="${cP}"/><circle cx="56" cy="24" r="5" fill="${cS}"/><circle cx="56" cy="40" r="5" fill="${cT}"/><circle cx="54" cy="54" r="5" fill="${cQ}"/></svg>`;
  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  const logoEl = document.getElementById('brand-logo');
  if (logoEl) logoEl.src = dataUrl;

  const faviconEl = document.getElementById('app-favicon');
  if (faviconEl) faviconEl.href = dataUrl;
}

window.themeManager = {
  isDark: false,
  color: '#0080c0',
  init() {
    const colorPicker = document.getElementById('color-picker');
    const colorBtn = document.getElementById('color-swatch');
    const themeBtn = document.getElementById('theme-btn');

    let savedColor = '#0080c0';
    let savedTheme = 'light';
    try {
      savedColor = localStorage.getItem('disperse-color') || '#0080c0';
      savedTheme = localStorage.getItem('disperse-theme') || 'light';
    } catch (_) {}

    this.color = savedColor;
    this.isDark = savedTheme === 'dark';

    if (colorPicker) {
      colorPicker.value = this.color;
      const onColorChange = (e) => {
        this.color = e.target.value;
        updateTheme(this.color, this.isDark);
      };
      colorPicker.addEventListener('input', onColorChange);
      colorPicker.addEventListener('change', onColorChange);
    }

    if (colorBtn && colorPicker) {
      colorBtn.addEventListener('click', () => {
        colorPicker.click();
      });
    }

    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.isDark = !this.isDark;
        updateTheme(this.color, this.isDark);
      });
    }

    updateTheme(this.color, this.isDark);
  }
};
