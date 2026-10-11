# RaK v2.0.0 — prepared TEST → main rollout

Preparation only. Martin requested a test version ready for a future main transfer. No production DB, Edge Function, main ref or production alias is changed by this preparation. Re-read all live refs before any later approved rollout.

## Candidate and validation

The current release is `2.0.0`, build `v2.0.0-release1`; exact source SHA, CI, immutable deployment and artifact digest are recorded in the latest v2 entry in `RAK_HANDOFF.md` after TEST verification. Require those proofs, not merely a visible version string. Keep the existing performance/size gates unchanged.

Acceptance includes mobile food modal glass/current+next highlights, N absence, clean-device secured login, failed credentials and wrong-account denial, owner/foreman permissions, online overview recovery, drafts retained through a service-worker update. Automated browser auth uses fictional credentials and mocked network boundaries; physical Safari/new-device confirmation remains a separate acceptance check.

## Frozen production at preflight, 11 October 2026

- main: `915a75793207b4125a0489dd8e5c824696f227ab`.
- Vercel READY: `dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF`; immutable host `skoda-spada-ourw28jh8-martinspadrnas-projects.vercel.app`.
- stable production: `https://skoda-spada.vercel.app`.
- production Supabase: `bkqamcbkiwumsvelahxr`; actual migration head `20260930112049`.
- TEST Supabase: `cgshssdjgzzuprlwnabl`.
- actual production functions: `rak-absence-calendar` v17 JWT=true; `rak-admin-users` v15 JWT=true; `hradnik-sync` v3 JWT=false; `rak-p15-restore-export` v2 JWT=false.

The actual function inventory differs from older handoff expectations. In particular the TEST restore-export function is still present in production. Record and reconcile that discrepancy before declaring a production release approved; do not silently deploy/delete functions during this preparation. The migration lock is an older immutable history checkpoint, not the current live head.

## Forward database work needed on production

Already installed production migrations up to `20260930112049` must not be replayed or edited. Match actual remote histories/SQL when timestamped MCP application differs from the CLI-created filename. Required new migrations, in order:

1. `20261011105146_rak_shift_overview_account_cloud_1924.sql` — account-owned online overview storage/CAS/RLS.
2. `20261011124442_rak_foreman_role_shift_overview_1926.sql` — Mistr role, verified session context/device and owner/foreman overview access.
3. `20261011164201_rak_unplanned_sick_leave_v200.sql` — accept N while preserving legacy LEK and nonretryable P0001 CAS checks. Does not rewrite absence records.

Before applying, compare production function definitions with TEST, capture rollback state, inspect advisors and apply prerequisites from the existing production preflight as appropriate to the actual live schema. Do not blindly repeat the obsolete 1.8.8 full sequence. Afterward verify role/overview/CAS checks and anonymous rejection without changing real schedules. `VERIFY_TEST_200.sql` is an explicitly TEST-only rollback fixture, not a production data script.

Deploy only exact candidate `supabase/functions/rak-admin-users/index.ts` with JWT verification enabled for Mistr role management. Preserve owner account 9811 and all existing profiles/passwords. No bulk Edge Function deployment; no secret values in Git/logs. Capture current production function source before a later deployment.

## Frontend/main preparation

Prepare a release branch from the verified development source, based on the re-read current main history. Replace the TEST public Supabase config with the current production public config; preserve the v2 release metadata/module cache/build identity. Verify the complete candidate and absence of TEST references in production runtime. Open a draft PR to main for review. This PR is not authorization to merge or deploy.

The development workflow deploys preview only and cannot be reused to promote a production alias. Any future production release requires an approved exact SHA, green full candidate checks, verified unaliased deployment and a rollback deployment captured immediately before switching the stable alias. Never merge development's TEST config directly into main.

## Acceptance and rollback

Before approval: verify on Martin's iPhone/new device, then confirm live owner remains fully authorized on A outside the roster; Mistr sees their assigned shift and overview only; Rotace rules remain unchanged. Verify secured re-login, overview cloud load/save and N selected-day regeneration without affecting other days.

After an approved production switch, check the stable alias version/config/exact SHA and smoke login, Home, More, calculators, roster, overview and food modals. If frontend fails, restore the captured pre-release alias. Keep additive overview tables/data and N-compatible RPC: legacy LEK remains accepted. If the new account-management function fails, restore its captured source with JWT=true. Do not drop data, downgrade sessions or restore pre-CAS writers as a shortcut.
