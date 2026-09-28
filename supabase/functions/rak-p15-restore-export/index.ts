import { createClient } from "npm:@supabase/supabase-js@2.110.7";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6.2.12";

const ISSUER = "https://token.actions.githubusercontent.com";
const AUDIENCE = "rak-p15-restore-drill";
const EXPECTED_REPOSITORY = "martinspadrna/RaK";
const EXPECTED_REPOSITORY_ID = "1228382519";
const EXPECTED_OWNER_ID = "279808341";
const EXPECTED_REF = "refs/heads/development";
const EXPECTED_WORKFLOW_REF =
  "martinspadrna/RaK/.github/workflows/rak-development-validation.yml@refs/heads/development";
const JWKS = createRemoteJWKSet(new URL(ISSUER + "/.well-known/jwks"));

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
    },
  });
}

async function authorize(req: Request) {
  const raw = String(req.headers.get("authorization") || "");
  const match = raw.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new Error("missing_oidc_token");
  const { payload } = await jwtVerify(match[1], JWKS, {
    issuer: ISSUER,
    audience: AUDIENCE,
    algorithms: ["RS256"],
  });
  if (String(payload.repository || "") !== EXPECTED_REPOSITORY) throw new Error("repository_not_allowed");
  if (String(payload.repository_id || "") !== EXPECTED_REPOSITORY_ID) throw new Error("repository_id_not_allowed");
  if (String(payload.repository_owner_id || "") !== EXPECTED_OWNER_ID) throw new Error("owner_id_not_allowed");
  if (String(payload.ref || "") !== EXPECTED_REF) throw new Error("ref_not_allowed");
  if (String(payload.workflow_ref || "") !== EXPECTED_WORKFLOW_REF) throw new Error("workflow_not_allowed");
  if (!["push", "workflow_dispatch"].includes(String(payload.event_name || ""))) throw new Error("event_not_allowed");
  if (String(payload.runner_environment || "") !== "github-hosted") throw new Error("runner_not_allowed");
  return payload;
}

const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
if (!url || !serviceKey) throw new Error("missing_supabase_runtime_credentials");

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  try {
    await authorize(req);
  } catch {
    return json(401, { ok: false, error: "oidc_not_authorized" });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const action = String(body.action || "");
  if (action === "manifest") {
    const { data, error } = await supabase.rpc("rak_owner_complete_backup_manifest_v2");
    return error ? json(500, { ok: false, error: "manifest_failed" }) : json(200, data);
  }

  if (action === "table") {
    const table = String(body.table || "");
    if (!/^[a-z_][a-z0-9_]*$/i.test(table) || table === "rak_admin_secrets") {
      return json(400, { ok: false, error: "invalid_table" });
    }
    const { data, error } = await supabase.rpc("rak_owner_complete_backup_table_v2", { p_table: table });
    return error ? json(500, { ok: false, error: "table_failed" }) : json(200, data);
  }

  if (action === "migrations") {
    const { data, error } = await supabase.rpc("rak_owner_complete_backup_migrations_v1");
    return error ? json(500, { ok: false, error: "migrations_failed" }) : json(200, data);
  }

  if (action === "storage-object") {
    const bucket = String(body.bucket || "");
    const name = String(body.name || "");
    if (!bucket || !name || bucket.includes("..") || name.split("/").some((part) => !part || part === "." || part === "..")) {
      return json(400, { ok: false, error: "invalid_storage_path" });
    }
    const { data, error } = await supabase.storage.from(bucket).download(name);
    if (error || !data) return json(500, { ok: false, error: "storage_download_failed" });
    return new Response(await data.arrayBuffer(), {
      status: 200,
      headers: {
        "content-type": "application/octet-stream",
        "cache-control": "no-store, max-age=0",
        "x-content-type-options": "nosniff",
      },
    });
  }

  return json(400, { ok: false, error: "invalid_action" });
});
