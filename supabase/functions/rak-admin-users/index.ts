import { withSupabase } from "npm:@supabase/server@1.4.1";

const ALLOWED_ORIGIN = "https://skoda-spada.vercel.app";
const RAK_PRODUCTION_ORIGINS = new Set([ALLOWED_ORIGIN, "https://rak.vercel.app"]);

function isRaKPreviewOrigin(origin: string) {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === "https:" && /^(?:skoda-spada|rak)-[a-z0-9-]+-martinspadrnas-projects\.vercel\.app$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function originAllowed(req: Request) {
  const origin = String(req.headers.get("origin") || "").trim();
  return !origin || RAK_PRODUCTION_ORIGINS.has(origin) || isRaKPreviewOrigin(origin);
}

function responseHeaders(req: Request) {
  const headers: Record<string, string> = {
    "cache-control": "no-store, max-age=0",
    "content-type": "application/json; charset=utf-8",
    "vary": "Origin",
    "x-content-type-options": "nosniff",
  };
  const origin = String(req.headers.get("origin") || "").trim();
  if (RAK_PRODUCTION_ORIGINS.has(origin) || isRaKPreviewOrigin(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function jsonResponse(req: Request, status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders(req) });
}

function validAccountId(value: unknown) {
  const accountId = String(value || "").trim();
  return /^\d{4,12}$/.test(accountId) && accountId !== "9811" ? accountId : "";
}

const authenticatedFetch = withSupabase({ auth: "user" }, async (req, ctx) => {
  if (!originAllowed(req)) return jsonResponse(req, 403, { ok: false, error: "origin_not_allowed" });
  if (req.method !== "POST") return jsonResponse(req, 405, { ok: false, error: "method_not_allowed" });

  const { data: owner, error: ownerError } = await ctx.supabase.rpc("rak_admin_context");
  if (ownerError || !owner || (owner.role !== "owner" && owner.role !== "admin")) return jsonResponse(req, 403, { ok: false, error: "admin_permission_required" });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return jsonResponse(req, 400, { ok: false, error: "invalid_request" }); }

  const action = String(body.action || "");
  if (action === "change-own-password") {
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || currentPassword.length > 128 || newPassword.length < 6 || newPassword.length > 128) return jsonResponse(req, 400, { ok: false, error: "invalid_password_length" });
    if (currentPassword === newPassword) return jsonResponse(req, 400, { ok: false, error: "password_unchanged" });
    const accountEmail = `${String(owner.account_id || "").trim()}@admin.rak.local`;
    const { data: verified, error: verifyError } = await ctx.supabase.auth.signInWithPassword({ email: accountEmail, password: currentPassword });
    if (verifyError || String(verified?.user?.id || "") !== String(owner.user_id || "")) return jsonResponse(req, 403, { ok: false, error: "invalid_current_password" });
    const { error: updateError } = await ctx.supabaseAdmin.auth.admin.updateUserById(String(owner.user_id || ""), { password: newPassword });
    if (updateError) return jsonResponse(req, 500, { ok: false, error: "password_update_failed" });
    return jsonResponse(req, 200, { ok: true });
  }

  if (action === "list-admin-directory") {
    const { data: profiles, error: profilesError } = await ctx.supabaseAdmin.from("rak_admin_profiles").select("account_id,display_name,role,enabled").in("role", ["owner", "admin"]).order("account_id", { ascending: true });
    if (profilesError) return jsonResponse(req, 500, { ok: false, error: "admin_directory_load_failed" });
    return jsonResponse(req, 200, { ok: true, profiles: profiles || [] });
  }

  if (owner.role !== "owner") return jsonResponse(req, 403, { ok: false, error: "owner_permission_required" });

  if (action === "change-owner-password") {
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || currentPassword.length > 128 || newPassword.length < 6 || newPassword.length > 128) return jsonResponse(req, 400, { ok: false, error: "invalid_password_length" });
    if (currentPassword === newPassword) return jsonResponse(req, 400, { ok: false, error: "password_unchanged" });
    const ownerEmail = `${String(owner.account_id || "").trim()}@admin.rak.local`;
    const { data: verified, error: verifyError } = await ctx.supabase.auth.signInWithPassword({ email: ownerEmail, password: currentPassword });
    if (verifyError || String(verified?.user?.id || "") !== String(owner.user_id || "")) return jsonResponse(req, 403, { ok: false, error: "invalid_current_password" });
    const { error: updateError } = await ctx.supabaseAdmin.auth.admin.updateUserById(String(owner.user_id || ""), { password: newPassword });
    if (updateError) return jsonResponse(req, 500, { ok: false, error: "password_update_failed" });
    return jsonResponse(req, 200, { ok: true });
  }

  const accountId = validAccountId(body.accountId);
  const displayName = String(body.displayName || "").trim().slice(0, 120);
  const password = String(body.password || "");
  const enabled = body.enabled !== false;
  if (!accountId || !displayName) return jsonResponse(req, 400, { ok: false, error: "invalid_admin_profile" });
  if (password && (password.length < 6 || password.length > 128)) return jsonResponse(req, 400, { ok: false, error: "invalid_password_length" });

  try {
    const { data: existing, error: lookupError } = await ctx.supabaseAdmin.from("rak_admin_profiles").select("user_id,account_id,display_name,role,enabled").eq("account_id", accountId).maybeSingle();
    if (lookupError) throw lookupError;
    let userId = String(existing?.user_id || "");
    if (!userId) {
      if (!password) return jsonResponse(req, 400, { ok: false, error: "password_required_for_new_admin" });
      const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({ email: `${accountId}@admin.rak.local`, password, email_confirm: true, app_metadata: { rak_account_id: accountId, rak_role: "admin" }, user_metadata: { display_name: displayName } });
      if (createError) throw createError;
      userId = String(created?.user?.id || "");
      if (!userId) throw new Error("auth_user_create_missing_id");
    } else if (password) {
      const { error: updateError } = await ctx.supabaseAdmin.auth.admin.updateUserById(userId, { password, app_metadata: { rak_account_id: accountId, rak_role: "admin" }, user_metadata: { display_name: displayName } });
      if (updateError) throw updateError;
    }
    const { data: profile, error: profileError } = await ctx.supabaseAdmin.from("rak_admin_profiles").upsert({ user_id: userId, account_id: accountId, display_name: displayName, role: "admin", enabled, created_by: owner.user_id, updated_at: new Date().toISOString() }, { onConflict: "account_id" }).select("account_id,display_name,role,enabled").single();
    if (profileError) throw profileError;
    return jsonResponse(req, 200, { ok: true, profile });
  } catch {
    return jsonResponse(req, 500, { ok: false, error: "admin_user_save_failed" });
  }
});

export default {
  fetch(req: Request, context: unknown) {
    if (req.method === "OPTIONS") {
      if (!originAllowed(req)) return jsonResponse(req, 403, { ok: false, error: "origin_not_allowed" });
      return new Response(null, { status: 204, headers: { ...responseHeaders(req), "access-control-allow-headers": "authorization, apikey, content-type", "access-control-allow-methods": "POST, OPTIONS", "access-control-max-age": "600" } });
    }
    return authenticatedFetch(req, context);
  },
};
