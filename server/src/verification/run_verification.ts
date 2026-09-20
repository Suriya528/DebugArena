/*
 * Standard, repeatable verification entry point.
 *
 * Set these before importing application modules. dotenv intentionally does
 * not override existing environment variables, so a developer's .env cannot
 * redirect this run to a configured database.
 */
process.env.DEBUGARENA_VERIFICATION_MODE = 'isolated';
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = '';

const target = process.argv[2] || 'all';
const allowedTargets = new Set(['all', 'critical', 'judge']);

if (!allowedTargets.has(target)) {
  throw new Error(`Unknown verification target "${target}". Use one of: ${[...allowedTargets].join(', ')}.`);
}

const failures: string[] = [];

async function run(): Promise<void> {
  if (target === 'all' || target === 'judge') {
    try {
      const { runJudgeVerification } = await import('./verify_judge.js');
      await runJudgeVerification();
    } catch (error) {
      failures.push(`online judge: ${(error as Error).message}`);
    }
  }

  if (target === 'all' || target === 'critical') {
    try {
      const { runCriticalFlowVerification } = await import('./verify_critical_flows.js');
      await runCriticalFlowVerification();
    } catch (error) {
      failures.push(`critical flows: ${(error as Error).message}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(`Verification failed:\n- ${failures.join('\n- ')}`);
  }

  console.log('[VERIFIED] Isolated verification completed successfully.');
}

await run();
