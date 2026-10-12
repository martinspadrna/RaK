# RaK v2.0.2 — prepared TEST → main rollout

Preparation only. Martin requested a test version ready for a future main transfer. No production DB, Edge Function, main ref or production alias is changed by this preparation. Re-read all live refs before any later approved rollout.

## Candidate and validation

Verified TEST source: `05029ee224f96ac021726ed8dfebfe6b2392c2b0`; candidate branch `release/v2.0.2-test-candidate`; CI #911 / `38165217440` attempt1 SUCCESS; READY `dpl_94zskQZjN9H9B8jPfab9rdpQXfgq`. Latest development documentation HEAD at readiness precheck: `6d807856a24feee9ffda312cc16536fec033cce9`. This is still TEST config, not a main-ready release branch.

The current release is `2.0.2`, build `v2.0.2-release1`; exact source SHA, CI, immutable deployment and artifact digest are recorded in the latest v2 entry in `RAK_HANDOFF.md` after TEST verification. Require those proofs, not merely a visible version string. Keep the existing performance/size gates unchanged.

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

## Readiness audit — 11 October 2026

Verdict: verified TEST and performance PASS; **not yet ready for direct merge/publish**. This audit is not production authorization.

- Exact production main remains `915a75793207b4125a0489dd8e5c824696f227ab`, READY deployment `dpl_FgKhWdcrPPfPBva3gynH9A2SuhsF`, DB head `20260930112049` and Edge versions17/15/3/2 unchanged.
- Read-only production checks confirm overview table absent, role constraint without foreman and N not accepted; TEST has all three. Forward migrations above are still required. Session/role helper hashes match TEST; auth/users/devices and the expected old reason catalog exist. Nonretryable CAS is intact on both. Production owner9811 is enabled and remains owner.
- TEST deployed rak-admin-users source exactly matches candidate repository source; production source still lacks foreman support. Both retain owner-profile protection. Capture/restore current production source and deploy only this exact function with JWT=true as part of a later approved rollout.
- Preserve production-only files when preparing a branch based on main. Development deletes the manual production-release workflow and its contract test, removes main PR validation/production target selection, and omits main:false from Vercel deploymentEnabled. Restore/preserve audited manual release and exact-SHA main PR/full validation, main automatic deployment disabled. Current development security tests assume TEST config: make target-aware checks before a production-bound candidate is validated, retaining every security invariant. Do not merge TEST config directly.
- Development has a reviewed Preview replay compatibility patch to historical migration20260512071249 and its lock. Production candidate must preserve the original applied SQL/hash from main; keep Preview replay adaptation isolated to TEST, adapting corresponding history checks without weakening immutability. No applied production migration was changed by this audit.
- Reconcile the known existing production restore-export inventory separately; it is not a v2 deployment target. No bulk Edge operations. Physical Safari/new-device sign-in and v2 operational acceptance remain a separate owner check.

### Direct main versus TEST performance

Twenty counterbalanced rounds per version, each with a new Chromium process/context for cold start and same-context cached reload; viewport390×844, exact canonical outputs, all HTTPS blocked and SW disabled identically. No account credentials or backend mutations. Controlled frontend comparison, not physical Safari or real CDN/network latency. Two clean production-target main builds passed (165files, digest c945fe2d09cbc559c334975c3d35fe5756656208eb6aa0dead5f6ac932f6fb5c); two clean TEST source builds were already verified by #911 (166files, digest c65d8d1ce1fe81406297e0df6c20b79ca27fcfc83286af0868649a0394ed7db1).

| Metric (ms) | main median / P90 | TEST median / P90 |
| --- | --- | --- |
| Cold first paint | 272 / 304 | 248 / 308 |
| Cold navigation bound | 68 / 94 | 67 / 101 |
| Cold startup ready | 541 / 636 | 538 / 598 |
| Warm first paint | 128 / 148 | 128 / 136 |
| Warm navigation bound | 38 / 41 | 38 / 42 |
| Warm startup ready | 402 / 450 | 392 / 417 |

No repeatable frontend slowdown against current main observed; cold first-paint P90 difference4ms. Apply the unchanged existing median/P90 limits; do not infer a speedup from tiny differences. An earlier20-round shared-browser exploratory run showed cold FCP P90152ms(main)/248ms(TEST) despite medians112/104 and maxima252/264. Periodic outliers required the fresh-process confirmation above; exploratory evidence is not hidden or treated as a production gate pass. Diagnostic navigation-wall medians cold730/725ms, warm3048/3088ms; warm wall P903376/3220ms. Automated first-paint/readiness timestamps are the directly comparable application metrics; wall time includes browser navigation/wait overhead.

Remaining path: prepare exact production-bound release branch and draft PR, validate unchanged gates against that target, obtain physical acceptance and explicit approval for the concrete DB/function/main/alias steps, then execute the audited rollout and postchecks with captured rollback targets. No main, production DB/function or alias writes performed.
