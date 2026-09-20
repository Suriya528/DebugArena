/**
 * Compatibility entry point for the historical judge verifier.
 *
 * The maintained verifier performs real local program execution, classifies
 * unavailable compilers/runtimes as ENVIRONMENT BLOCKED, and never connects to
 * a configured MongoDB deployment.
 */
import { runJudgeVerification } from '../verification/verify_judge.js';
import { requireIsolatedVerification } from '../verification/safety.js';

async function runVerification(): Promise<void> {
  requireIsolatedVerification('Legacy online judge verification');
  console.log('[SAFE VERIFICATION] Running isolated online judge verification.');
  await runJudgeVerification();
  console.log('[VERIFIED] Legacy online judge verification completed.');
}

runVerification().catch((error) => {
  console.error('Judge verification failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
