// RaK 1.6 – development používá oddělenou testovací Supabase.
window.SUPABASE_CONFIG = {
  url: "https://cgshssdjgzzuprlwnabl.supabase.co",
  publishableKey: "sb_publishable_v7jeuZC-MNUEO5nfE5xcUQ_Pu9pT-X_"
};

// Development-only viditelná testovací verze. Produkční main dál zobrazuje
// veřejnou verzi RaK 1.6; každý další testovací balík budeme číslovat
// 1.6.01, 1.6.02, 1.6.03… aby bylo v O aplikaci hned vidět, co běží.
window.RAK_RELEASE_VERSION = "1.6.02";
window.RAK_TEST_DISPLAY_VERSION = "1.6.02";
// PWA build marker se v testovací větvi zvedá s každým testovacím buildem,
// aby se znovu povolilo potvrzení aktualizace a nezůstalo potlačené po minulé verzi.
window.RAK_PWA_BUILD = "v1.6.02";

// Development-only ochrana proti přenesení starého admin odemčení v běžícím
// PWA runtime při přepnutí z produkční Supabase na testovací. Maže pouze
// autorizační příznaky administrace; běžné přihlášení uživatele zůstává.
(function rakTestResetStaleAdminRuntime() {
  const staleSessionKeys = [
    "adminUnlockedSession",
    "adminPinSession",
    "adminAuthPinSession",
    "adminAccountIdSession",
    "adminOwnerSession",
    "adminPromptedAccountSession"
  ];

  try {
    staleSessionKeys.forEach((key) => sessionStorage.removeItem(key));
    localStorage.removeItem("adminUnlocked");
  } catch (err) {}

  let attempts = 0;
  const resetRuntimeOnce = function () {
    attempts += 1;
    try {
      if (typeof app !== "undefined" && app) {
        app.adminUnlocked = false;
        app.adminPin = "";
        app.adminAccountId = "";
        app.adminIsOwner = false;
        app.adminAuthVersion = 0;
        window.__rakTestAdminRuntimeReset = true;
        return;
      }
    } catch (err) {}
    if (attempts < 120) setTimeout(resetRuntimeOnce, 25);
  };
  resetRuntimeOnce();
})();

// Test-only owner bootstrap: testovací Auth začíná bez uživatele 9811.
// První úspěšné zadání hesla vytvoří účet přímo v test Supabase; databázový
// trigger ho potvrdí a přiřadí owner profil. Produkční RaK tento soubor na
// main větvi nemění a fallback je navíc omezený přesně na test URL + 9811.
(function installRakTestOwnerBootstrap() {
  const TEST_URL = "https://cgshssdjgzzuprlwnabl.supabase.co";
  const OWNER_EMAIL = "9811@admin.rak.local";
  const library = window.supabase;
  if (!library || typeof library.createClient !== "function" || library.__rakTestOwnerBootstrapInstalled) return;

  const originalCreateClient = library.createClient.bind(library);
  library.createClient = function rakTestCreateClient(url, key, options) {
    const client = originalCreateClient(url, key, options);
    const normalizedUrl = String(url || "").replace(/\/$/, "");
    if (normalizedUrl !== TEST_URL || !client || !client.auth || typeof client.auth.signInWithPassword !== "function") return client;
    if (client.auth.__rakTestOwnerBootstrapPatched) return client;

    const originalSignIn = client.auth.signInWithPassword.bind(client.auth);
    const originalSignUp = typeof client.auth.signUp === "function" ? client.auth.signUp.bind(client.auth) : null;
    client.auth.signInWithPassword = async function rakTestSignInWithBootstrap(credentials) {
      const first = await originalSignIn(credentials);
      if (!first || !first.error || !originalSignUp) return first;

      const email = String(credentials && credentials.email || "").trim().toLowerCase();
      const password = String(credentials && credentials.password || "");
      if (email !== OWNER_EMAIL || !password) return first;

      try {
        await originalSignUp({ email: OWNER_EMAIL, password });
      } catch (err) {}
      return await originalSignIn({ email: OWNER_EMAIL, password });
    };

    try {
      Object.defineProperty(client.auth, "__rakTestOwnerBootstrapPatched", { value: true, configurable: false });
    } catch (err) {
      client.auth.__rakTestOwnerBootstrapPatched = true;
    }
    return client;
  };

  try {
    Object.defineProperty(library, "__rakTestOwnerBootstrapInstalled", { value: true, configurable: false });
  } catch (err) {
    library.__rakTestOwnerBootstrapInstalled = true;
  }
})();

// Development-only rychlá vrstva pro denní výjimku „kalírna“.
// Je v samostatném souboru, aby produkční main zůstal beze změny.
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
