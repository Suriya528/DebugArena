/**
 * Compatibility entry point for the historical comprehensive verifier.
 *
 * It deliberately delegates to the maintained isolated suites instead of
 * relying on retired seeded accounts or a developer's localhost database.
 */
import { runCriticalFlowVerification } from '../verification/verify_critical_flows.js';
import { runJudgeVerification } from '../verification/verify_judge.js';
import { requireIsolatedVerification } from '../verification/safety.js';

async function runVerification(): Promise<void> {
  requireIsolatedVerification('Legacy comprehensive verification');
  console.log('[SAFE VERIFICATION] Running comprehensive isolated verification.');
  await runJudgeVerification();
  await runCriticalFlowVerification();
  console.log('[VERIFIED] Legacy comprehensive verification completed through the maintained isolated suites.');
}

runVerification().catch((error) => {
  console.error('Verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
