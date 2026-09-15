// RaK 1.6 – runtime hotfix pro generátor: solo-mill balance používal monthKey bez lokálního parametru.
(function installRakGeneratorMonthKeyRuntimeFix() {
  function resolveActiveMonthKey(explicitMonthKey) {
    const explicit = String(explicitMonthKey || '').trim();
    if (explicit) return explicit;
    try {
      const wizard = window.__rakRotationGeneratorWizard;
      const wizardMonth = String(wizard && wizard.monthKey || '').trim();
      if (wizardMonth) return wizardMonth;
    } catch (err) {}
    try {
      const selected = String(window.app && window.app.selectedMonth || '').trim();
      if (selected) return selected;
    } catch (err) {}
    return '';
  }

  function patchGeneratorMonthKey() {
    const original = window.adminRotationGeneratorBalanceSoloMill;
    if (typeof original !== 'function') return false;
    if (original.__rakGeneratorMonthKeyHotfixWrapped) return true;

    const wrapped = function adminRotationGeneratorBalanceSoloMillMonthKeyHotfix(month, model, explicitMonthKey) {
      const activeMonthKey = resolveActiveMonthKey(explicitMonthKey);
      const hadOwnMonthKey = Object.prototype.hasOwnProperty.call(window, 'monthKey');
      const previousMonthKey = window.monthKey;
      try {
        window.monthKey = activeMonthKey;
        return original(month, model);
      } finally {
        try {
          if (hadOwnMonthKey) window.monthKey = previousMonthKey;
          else delete window.monthKey;
        } catch (err) {}
      }
    };
    wrapped.__rakGeneratorMonthKeyHotfixWrapped = true;
    wrapped.__rakGeneratorMonthKeyHotfixOriginal = original;
    window.adminRotationGeneratorBalanceSoloMill = wrapped;
    return true;
  }

  window.setupRakGeneratorMonthKeyHotfix = patchGeneratorMonthKey;
  window.addEventListener('rak:feature-ready', (event) => {
    const feature = String(event && event.detail && event.detail.feature || '').trim();
    if (feature === 'admin') patchGeneratorMonthKey();
  });
  setTimeout(patchGeneratorMonthKey, 0);
})();
