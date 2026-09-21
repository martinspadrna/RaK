// RaK 1.2 (1.155) – post-load audit orchestrace aplikace.

function runRakPostLoadAudits() {
  try { runPhaseOneFinalAudit(); } catch (err) { console.warn('Phase 1 final audit failed', err); }
  try { runPhaseTwoCalcScopeAudit(); } catch (err) { console.warn('Phase 2 calc scope audit failed', err); }
  try { runPhaseThreeLightweightAudit(); } catch (err) { console.warn('Phase 3 lightweight audit failed', err); }
  try { runPhaseFourCleanupManagerAudit(); } catch (err) { console.warn('Phase 4 cleanup manager audit failed', err); }
  try { runPhaseSevenDataOptimizationAudit(); } catch (err) { console.warn('Phase 7 data optimization audit failed', err); }
  try { runPhaseTenFinalStabilizationAudit(); } catch (err) { console.warn('Phase 10 final stabilization audit failed', err); }
  try { runLadaPerformanceAudit(); } catch (err) { console.warn('Láďův režim performance audit failed', err); }
}

try { if (typeof window.rakMarkModuleReady === 'function') window.rakMarkModuleReady('app-postload-audits.js', 'loaded', { source: 'dynamic-loader' }); } catch (err) {}
