document.addEventListener('DOMContentLoaded', () => {
  const exportSection = document.getElementById('export-section');
  const toggleBtn = document.getElementById('toggle-export-btn');
  const toggleIcon = toggleBtn?.querySelector('i');
  let isManuallyToggled = false;

  function setCollapsed(collapsed) {
    if (collapsed) {
      exportSection.classList.add('collapsed');
      if (toggleBtn) {
        toggleBtn.innerHTML = '<i data-lucide="chevron-up"></i>';
        if (window.lucide) lucide.createIcons({ root: toggleBtn });
      }
    } else {
      exportSection.classList.remove('collapsed');
      if (toggleBtn) {
        toggleBtn.innerHTML = '<i data-lucide="chevron-down"></i>';
        if (window.lucide) lucide.createIcons({ root: toggleBtn });
      }
    }
  }

  toggleBtn?.addEventListener('click', () => {
    isManuallyToggled = true;
    const isCollapsed = exportSection.classList.contains('collapsed');
    setCollapsed(!isCollapsed);
  });

  // Watch for preview maximization
  const btnMaximizePreview = document.getElementById('maximize-preview');
  if (btnMaximizePreview) {
    btnMaximizePreview.addEventListener('click', () => {
      // Small delay to allow the layout to compute sizes
      setTimeout(() => {
        const editorContainer = document.getElementById('editor-container');
        const isVertical = window.innerWidth <= 900;
        const currentSizeStr = isVertical ? editorContainer.style.height : editorContainer.style.width;
        const parsedPct = parseFloat(currentSizeStr);
        
        // If parsedPct is 0, the preview is maximized.
        if (parsedPct === 0) {
          if (!exportSection.classList.contains('collapsed')) {
            setCollapsed(true);
            isManuallyToggled = false; // System triggered
          }
        } else {
          // Restored
          if (!isManuallyToggled && exportSection.classList.contains('collapsed')) {
            setCollapsed(false);
          }
        }
      }, 50);
    });
  }
});
