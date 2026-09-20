# RaK 1.7.67 – regression boundaries

- Both actual editor markup branches (`data-daymod-section=hard` and `soft`) calculate `--rak-grid-width` from the number of machines using the same 84+52×N formula.
- Final CSS must override both the older generic 54px/52px and MO-only 48px/46px rules. It must not touch Absence.
- The historical 1.7.66 Chromium probe must remain active, but accept the new geometry. A new Chromium probe compares every measured cell/input/gap of TO and MO at the same 390px viewport.
- `load-online` must skip DOM rerender after cancellation, missing response or network failure. On failed remote load, the editor remains dirty and a verified local draft is retained.
- Forced online reload must not apply stale local cache before a successful remote fetch.
- Central navigation also checks the dirty guard when opening another app-menu view.
- No changes to `main`, production Supabase, or the technical package version.