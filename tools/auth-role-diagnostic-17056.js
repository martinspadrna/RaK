// RAK_17135_ROLE_DIAGNOSTIC: signed TEST role probe shared by More and Admin service.
// Never print, persist or transmit a JWT except as the Authorization header to the
// explicitly allowlisted isolated TEST Supabase origin.
async function rakRunLiveAuthDiagnostic() {
  const status = document.getElementById('rakLiveAuthDiagnosticStatus');
  if (!status || status.dataset.running === '1') return;
  const setStatus = (message, ok) => {
    status.textContent = message;
    status.dataset.result = ok === true ? 'pass' : ok === false ? 'fail' : 'pending';
  };
  const diagnose = (operation, httpStatus) => {
    try {
      if (window.RAK_DIAGNOSTICS && typeof window.RAK_DIAGNOSTICS.diagnoseRejectedOperation === 'function') {
        return window.RAK_DIAGNOSTICS.diagnoseRejectedOperation(operation, { status: httpStatus });
      }
    } catch (_) {}
    return null;
  };
  status.dataset.running = '1';
  setStatus('Ověřuji podepsanou relaci a práva pouze pro tento účet…', null);
  try {
    if (!navigator.onLine
        || typeof rakAdminCanOpenShiftReport !== 'function'
        || !rakAdminCanOpenShiftReport()
        || !app
        || app.adminAuthVersion !== 2) {
      setStatus('Nelze ověřit: vyžaduje online ověřenou roli přes Supabase Auth.', false);
      return;
    }

    const config = window.SUPABASE_CONFIG || {};
    const origin = String(config.url || '').replace(/\/$/, '');
    if (origin !== 'https://cgshssdjgzzuprlwnabl.supabase.co'
        || !String(config.publishableKey || '').startsWith('sb_publishable_')) {
      setStatus('Kontrola zastavena: diagnostika je povolena pouze proti TEST databázi.', false);
      return;
    }

    const bridge = window.RotationSupabaseBridge;
    const token = bridge && typeof bridge.getSignedAdminAccessToken === 'function'
      ? await bridge.getSignedAdminAccessToken()
      : '';
    if (!token || token.length < 100) {
      setStatus('Platná podepsaná relace není dostupná. Přihlas se znovu.', false);
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

    const authResponse = await probe('/auth/v1/user', 'GET');
    if (!authResponse.ok) {
      setStatus('NEPROŠLO: Supabase Auth zamítl přihlašovací token.', false);
      return;
    }
    const authenticatedUser = await authResponse.json();

    const contextResponse = await probe('/rest/v1/rpc/rak_admin_context');
    if (!contextResponse.ok) {
      setStatus('NEPROŠLO: databáze odmítla ověřenou relaci.', false);
      return;
    }
    const context = await contextResponse.json();
    const role = String(context && context.role || '');
    if (!['owner', 'admin', 'deputy'].includes(role)
        || String(context.user_id || '') !== String(authenticatedUser.id || '')
        || String(context.account_id || '') !== String(app.adminAccountId || '')
        || String(app.adminRole || '') !== role
        || !String(context.session_id || '')) {
      setStatus('NEPROŠLO: ověřená identita, účet, relace a role spolu nesouhlasí.', false);
      return;
    }

    const adminResponse = await probe('/rest/v1/rpc/rak_admin_list_audit_v2', 'POST', { p_limit: 1 });
    let adminBoundaryPass = adminResponse.ok;
    if (role === 'deputy') {
      const rejected = diagnose('admin-audit-read', adminResponse.status);
      adminBoundaryPass = [401, 403].includes(adminResponse.status)
        && !!rejected
        && rejected.reason === 'permission-denied';
    }
    await adminResponse.body?.cancel();
    if (!adminBoundaryPass) {
      setStatus('NEPROŠLO: hranice administrátorského čtení neodpovídá ověřené roli.', false);
      return;
    }

    if (role !== 'deputy') {
      const rejectedWriteResponse = await probe('/rest/v1/rpc/rak_admin_save_rotation_v2', 'POST', {
        p_key: 'main',
        p_payload: [],
        p_meta: { source: 'live-auth-diagnostic-reject' },
        p_expected_revision: null
      });
      if (rejectedWriteResponse.ok) {
        await rejectedWriteResponse.body?.cancel();
        setStatus('NEPROŠLO: diagnostický neplatný zápis nebyl serverem odmítnut.', false);
        return;
      }
      const rejection = diagnose('rotation-save', rejectedWriteResponse.status);
      await rejectedWriteResponse.body?.cancel();
      if (!rejection || rejection.reason !== 'invalid-request') {
        setStatus('NEPROŠLO: zamítnutou operaci se nepodařilo bezpečně zařadit.', false);
        return;
      }
    }

    const ownerResponse = await probe('/rest/v1/rpc/rak_owner_list_admin_profiles');
    let ownerBoundaryPass = ownerResponse.ok;
    if (role !== 'owner') {
      const rejected = diagnose('owner-profile-read', ownerResponse.status);
      ownerBoundaryPass = [401, 403].includes(ownerResponse.status)
        && !!rejected
        && rejected.reason === 'permission-denied';
    }
    await ownerResponse.body?.cancel();
    if (!ownerBoundaryPass) {
      setStatus('NEPROŠLO: hranice práv vlastníka neodpovídá ověřené roli.', false);
      return;
    }

    const roleLabel = role === 'owner' ? 'vlastník' : role === 'admin' ? 'administrátor' : 'zástupce';
    setStatus('PROŠLO: skutečný podepsaný Auth token, účet, relace a role (' + roleLabel + ') odpovídají serveru; povolené i odmítnuté operace mají bezpečnou diagnostiku bez obsahu odpovědí.', true);
  } catch (_error) {
    setStatus('Kontrola nedokončena: chyba spojení nebo odpovědi. Žádná data nebyla změněna.', false);
  } finally {
    status.dataset.running = '0';
  }
}
