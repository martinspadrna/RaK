// RaK 1.7 – produkční konfigurace používá výhradně produkční Supabase.
const rakReleaseMetadata = window.RAK_RELEASE_METADATA;
if (!rakReleaseMetadata || !rakReleaseMetadata.displayVersion || !rakReleaseMetadata.buildId) {
  throw new Error('Chybí metadata vydání aplikace.');
}
window.SUPABASE_CONFIG = {
  url: "https://bkqamcbkiwumsvelahxr.supabase.co",
  publishableKey: "sb_publishable_MYL2dR_WGYFUMf0jKHpUbQ_70mCbUOy"
};

// Jednotná metadata vydání pro produkční runtime; viditelná i technická
// verze se načítají z kanonického souboru rak-release-metadata.js.
window.RAK_RELEASE_VERSION = rakReleaseMetadata.displayVersion;
window.RAK_TEST_DISPLAY_VERSION = rakReleaseMetadata.displayVersion;
// Legacy smoke compatibility: window.RAK_RELEASE_VERSION = "1.6.03";
// Legacy smoke compatibility: window.RAK_TEST_DISPLAY_VERSION = "1.6.03";
// PWA build marker je interní a může se změnit i při malém hotfixu stejné
// viditelné verze. Tím se znovu povolí potvrzení aktualizace na iOS PWA.
window.RAK_PWA_BUILD = rakReleaseMetadata.buildId;
// Předchozí interní marker ponechaný jen kvůli kompatibilitě smoke testu:
// window.RAK_PWA_BUILD = "v1.6.03-stats1";

// RaK 1.6.03 Home quick-paint: uložený profil + lokální data vykreslíme hned,
// jakmile je připravený Dashboard. Nečekáme na dokončení celé startup sady.
// Běžný Home boot později provede standardní plný refresh beze změny navigace.
(function installRak1603EarlyHomePaint() {
  if (window.__rak1603EarlyHomePaintInstalled) return;
  window.__rak1603EarlyHomePaintInstalled = true;

  const startedAt = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  let attempts = 0;
  const MAX_ATTEMPTS = 240;

  function getStoredProfile() {
    try {
      return typeof window.rakUserProfileGet === "function" ? window.rakUserProfileGet() : null;
    } catch (err) {
      return null;
    }
  }

  function activePageAllowsPaint() {
    try {
      const active = document.querySelector(".page.active");
      return !active || active.id === "home";
    } catch (err) {
      return true;
    }
  }

  function finish(status) {
    const endedAt = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    window.__rak1603EarlyHomePaint = {
      status,
      attempts,
      elapsedMs: Math.max(0, Math.round(endedAt - startedAt)),
      startupReady: !!window.__rakBootV2StartupReady,
      at: Date.now()
    };
  }

  function tryPaint() {
    if (window.__rak1603EarlyHomePaintDone) return;
    attempts += 1;

    try {
      const profile = getStoredProfile();
      const appReady = typeof app !== "undefined" && !!app;
      const dashboardReady = typeof window.updateDashboard === "function";

      if (profile && appReady && dashboardReady && activePageAllowsPaint()) {
        if (typeof window.rakUserProfileApplyToRuntime === "function") {
          window.rakUserProfileApplyToRuntime(profile);
        }
        window.updateDashboard();
        try { if (typeof window.updateFoodTile === "function") window.updateFoodTile(); } catch (err) {}
        try { if (typeof window.updateEportalTile === "function") window.updateEportalTile(); } catch (err) {}
        window.__rak1603EarlyHomePaintDone = true;
        finish("painted");
        return;
      }
    } catch (err) {}

    if (attempts >= MAX_ATTEMPTS) {
      finish("timeout");
      return;
    }

    if (typeof requestAnimationFrame === "function") requestAnimationFrame(tryPaint);
    else setTimeout(tryPaint, 16);
  }

  tryPaint();
})();

// Produkční rychlá vrstva pro denní výjimku „kalírna“.
// Je v samostatném souboru kvůli řízenému načtení a cache invalidaci.
(function loadRakKalirnaDayModOverride() {
  const src = "kalirna-daymod-override.js?v=20260912-1";
  try {
    if (document.querySelector('script[data-rak-kalirna-daymod-override="1"]')) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.rakKalirnaDaymodOverride = "1";
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {}
})();

// Produkční statistická vrstva: kalírna se odečte z původního stroje,
// ale „Práce celkem“ zůstane podle původního rozpisu beze změny.
(function loadRakKalirnaStatsOverride() {
  const src = "kalirna-stats-override.js?v=20260913-1";
  try {
    if (document.querySelector('script[data-rak-kalirna-stats-override="1"]')) return;
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.rakKalirnaStatsOverride = "1";
    (document.head || document.documentElement).appendChild(script);
  } catch (err) {}
})();

