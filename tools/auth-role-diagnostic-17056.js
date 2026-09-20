// RaK 1.7.56. Injected into the built admin renderer by the development stage.
// A real, user-initiated role probe. Never print, persist or transmit a JWT except
// as an Authorization header to the configured isolated TEST Supabase origin.
async function rakRunLiveAuthDiagnostic() {
  const status = document.getElementById('rakLiveAuthDiagnosticStatus');
  if (!status) return;
  if (status.dataset.running === '1') return;
  const setStatus = (message, ok) => {
    status.textContent = message;
    status.dataset.result = ok === true ? 'pass' : ok === false ? 'fail' : 'pending';
  };
  status.dataset.running = '1';
  setStatus('Ověřuji přihlášení a práva pouze pro tento účet…', null);
  try {
    if (!navigator.onLine || typeof rakAdminCanOpenAdmin !== 'function' || !rakAdminCanOpenAdmin()
        || !app || app.adminAuthVersion !== 2) {
      setStatus('Nelze ověřit: vyžaduje online přihlášení správce přes Supabase Auth.', false);
      return;
    }
    const config = window.SUPABASE_CONFIG || {};
    const origin = String(config.url || '').replace(/\/$/, '');
    if (origin !== 'https://cgshssdjgzzuprlwnabl.supabase.co' || !String(config.publishableKey || '').startsWith('sb_publishable_')) {
      setStatus('Kontrola zastavena: nepovolená databáze nebo chybějící veřejný klíč.', false);
      return;
    }
    const bridge = window.RotationSupabaseBridge;
    const token = bridge && typeof bridge.getAdminAccessToken === 'function'
      ? await bridge.getAdminAccessToken() : '';
    if (!token || token.length < 100) {
      setStatus('Platná administrátorská relace není dostupná. Přihlas se znovu.', false);
      return;
    }
    async function probe(endpoint, method = 'POST', payload) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      try {
        return await fetch(origin + endpoint, {
          method,
          cache: 'no-store',
          signal: controller.signal,
          headers: {
            apikey: config.publishableKey,
            Authorization: 'Bearer ' + token,
            ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
          },
          ...(method === 'POST' ? { body: JSON.stringify(payload || {}) } : {})
        });
      } finally {
        clearTimeout(timeout);
      }
    }
    // GoTrue verifies the cryptographic signature and current Auth identity.
    const authResponse = await probe('/auth/v1/user', 'GET');
    if (!authResponse.ok) {
      setStatus('NEPROŠLO: Supabase Auth zamítl přihlašovací token.', false);
      return;
    }
    const authenticatedUser = await authResponse.json();
    const contextResponse = await probe('/rest/v1/rpc/rak_admin_context');
    if (!contextResponse.ok) {
      setStatus('NEPROŠLO: databáze odmítla administrátorskou relaci.', false);
      return;
    }
    const context = await contextResponse.json();
    const role = String(context && context.role || '');
    if (!['owner', 'admin'].includes(role)
        || String(context.user_id || '') !== String(authenticatedUser.id || '')
        || String(context.account_id || '') !== String(app.adminAccountId || '')
        || !String(context.session_id || '')) {
      setStatus('NEPROŠLO: ověřená identita, aktuální účet a role spolu nesouhlasí.', false);
      return;
    }
    // This read-only RPC must work for both owner and administrator.
    const adminResponse = await probe('/rest/v1/rpc/rak_admin_list_audit_v2', 'POST', { p_limit: 1 });
    if (!adminResponse.ok) {
      setStatus('NEPROŠLO: oprávněná administrátorská čtecí akce byla odmítnuta.', false);
      return;
    }
    await adminResponse.body?.cancel();
    // Owner-only read-only RPC is our positive/negative privilege boundary.
    const ownerResponse = await probe('/rest/v1/rpc/rak_owner_list_admin_profiles');
    const privilegePass = role === 'owner' ? ownerResponse.ok : [401, 403].includes(ownerResponse.status);
    await ownerResponse.body?.cancel();
    if (!privilegePass) {
      setStatus('NEPROŠLO: práva vlastníka neodpovídají ověřené roli.', false);
      return;
    }
    setStatus('PROŠLO: skutečný Auth token, vazba na účet, administrátorské čtení a oddělení práv vlastníka (' + (role === 'owner' ? 'vlastník' : 'administrátor') + '). Ostatní role je nutné otestovat jejich vlastním přihlášením.', true);
  } catch (_error) {
    // Never expose fetch headers, JWT, private RPC payloads or error objects.
    setStatus('Kontrola nedokončena: chyba spojení nebo odpovědi. Žádná data nebyla změněna.', false);
  } finally {
    status.dataset.running = '0';
  }
}
