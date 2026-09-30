# RaK 1.8.8 – production rollout runbook

This runbook is preparation only. Do not execute any production mutation without Martin's explicit approval for the concrete production step.

## Immutable references at preparation time

- development before final CI/doc close: resolve live before use; do not trust this document as a mutable pointer.
- production Supabase project: `bkqamcbkiwumsvelahxr`
- TEST Supabase project: `cgshssdjgzzuprlwnabl`
- production Vercel project: `prj_Pv7eNEt5qGg2GX9l365fJnc0YUMF`
- current production alias must be re-read immediately before rollout.
- production migration baseline at preparation time: `20260924105811`.

## Stop gates

Stop immediately if any of these is false:

1. New 1.8.8 development exact-SHA CI is green.
2. New release candidate is based on the live development HEAD and current main, is only ahead of main, and its production-target PR CI is green.
3. Production preflight matches the expected migration baseline or the difference has been explicitly reconciled.
4. Current production deployment/alias and current `rak-admin-users` rollback source are captured.
5. Maintenance window for admin writes is active.
6. `http` extension and the four calendar Vault secret names are ready before the private-calendar migration.
7. Rollback SQL has already been transaction-tested on TEST.

## Production prerequisites

Run `supabase/ops/production_preflight_188.sql` read-only first.

Then, only with production approval:

1. Run `supabase/ops/production_calendar_prerequisite_188.sql`.
2. Securely copy the four TEST calendar secret values into PROD Vault using current Supabase Vault APIs. Never put the values in Git, chat, logs, artifacts, or the runbook.
3. Required secret names:
   - `rak_calendar_kalirna_a_ics`
   - `rak_calendar_kalirna_b_ics`
   - `rak_calendar_kalirna_c_ics`
   - `rak_calendar_kalirna_d_ics`
4. Re-run the preflight and require `http` installed plus all four secret names present.

## Pending production migrations

Apply in repository timestamp order. Do not skip a failure.

1. `20260924153000_rak_account_ui_preferences_cas_17084.sql`
2. `20260924164526_rak_login_shift_team_v3_17089.sql`
3. `20260924194000_rak_owner_complete_backup_chunked_v2_17098.sql`
4. `20260924201500_rak_bug_report_optional_screenshot_17099.sql`
5. `20260925110000_rak_revision_cas_stage_17102.sql`
6. `20260925123000_rak_revision_cas_cutover_17102.sql`
7. `20260926033000_rak_unplanned_absence_generator_17111.sql`
8. `20260926081926_rak_unplanned_reason_catalog_17115.sql`
9. `20260926093641_rak_unplanned_kalirna_generator_17115.sql` (intentional no-op history alignment)
10. `20260926094214_rak_unplanned_kalirna_reflow_17116.sql`
11. `20260928091455_rak_cas_nonretryable_conflicts_17138.sql`
12. `20260928212500_rak_unplanned_kalirna_direct_cell_17148.sql`
13. `20260929022427_rak_calendar_private_feed_17149.sql`
14. `20260929023449_rak_login_calendar_assignment_v4_17149.sql`
15. `20260929141619_rak_calendar_selection_account_sync_17153.sql`
16. `20260929163000_rak_calendar_hidden_account_sync_17160.sql`
17. `20260930112049_rak_unplanned_change_cas_nonretryable_188.sql`

The 1.7.102 cutover disables the two legacy v2 writers used by production frontend 1.7.83. Therefore the complete migration sequence must run inside the coordinated maintenance window and must be followed promptly by the new frontend release. Do not perform the full DB sequence hours or days before the frontend alias switch.

## Edge Function

Deploy only the current release-candidate version of:

`supabase/functions/rak-admin-users/index.ts`

Requirements:

- `verify_jwt=true`
- source must equal the exact source tested on TEST.
- do not deploy `rak-p15-restore-export` to production; it is TEST-only.

At preparation time the production `rak-admin-users` source is bit-for-bit equal to the file currently on `main`. That file is the rollback source. Re-verify this immediately before rollout.

## Database postcheck

Run `supabase/ops/production_postcheck_188.sql`.

Require at minimum:

- all new relations/functions exist;
- `http` is installed;
- all four Vault names are present;
- every listed CAS function reports no retryable `40001` and has `P0001`;
- the two legacy v2 writers are in the intentional upgrade-required cutover state;
- account UI preferences RLS/direct-client revocations are intact.

Then run Supabase security and performance advisors and compare against the captured pre-rollout baseline. Do not require historical warnings to disappear; fail on new unexplained security regressions.

## Frontend release

Only after DB + Edge Function postchecks are green:

1. Use the approved new 1.8.8 release candidate, not obsolete PR #6.
2. Merge to `main` only after Martin explicitly approves that merge.
3. Use the manual production release workflow with exact `expected_sha` and `expected_development_sha`.
4. Let the workflow build and verify an unaliased production candidate.
5. Move the production alias only after immutable candidate verification succeeds.
6. Verify the public production alias and exact deployed SHA.

## Physical production smoke

After alias switch, verify at minimum:

- login;
- Home;
- Rotace;
- Kalkulačky;
- Více;
- first Administrace open;
- change-own-password on an authorized deputy/test account;
- Ověřit oprávnění;
- machine settings CAS save;
- rotation-month CAS save;
- dashboard calendars, including zero-active state;
- account-scoped calendar selection/hidden state;
- unplanned absence;
- unplanned Kalírna;
- bug report with optional screenshot;
- owner complete backup.

## Rollback

If frontend release fails after DB cutover:

1. Return Vercel production alias to the exact pre-rollout deployment.
2. Run `supabase/ops/rollback_188_restore_legacy_v2_writers.sql` so frontend 1.7.83 can write again.
3. Verify both restored v2 writers return `legacy_v2=true` and increment revision state.
4. If needed, redeploy the captured pre-rollout `rak-admin-users` source from `main` with `verify_jwt=true`.
5. Do not drop the new additive DB tables/functions merely to restore the old frontend.
6. Record exact live migration history, Vercel alias and Edge Function version in `RAK_HANDOFF.md`.

If a migration itself fails mid-sequence, stop. Do not apply the next migration until live schema and migration history have been reconciled.
