/**
 * Guardrails shared by automated verification entry points.
 *
 * Verification is opt-in: a script must explicitly set this value before it
 * can create its in-memory database. This keeps a checked-in or local .env
 * file from ever directing automated checks at a real MongoDB deployment.
 */
export const ISOLATED_VERIFICATION_MODE = 'isolated';

export function isIsolatedVerificationMode(): boolean {
  return process.env.DEBUGARENA_VERIFICATION_MODE === ISOLATED_VERIFICATION_MODE;
}

export function isVerificationEntryPoint(): boolean {
  return process.argv.slice(1).some((entry) =>
    /(?:^|[\\/])(?:verify_[^\\/]+|browser_verify)\.(?:ts|js|mjs|cjs)$/i.test(entry)
  );
}

export function requireIsolatedVerification(context: string): void {
  if (!isIsolatedVerificationMode()) {
    throw new Error(
      `[SAFE VERIFICATION] ${context} refused to run. Use the standard npm test command, which sets DEBUGARENA_VERIFICATION_MODE=isolated.`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`[SAFE VERIFICATION] ${context} cannot run with NODE_ENV=production.`);
  }
}

export function assertIsolatedMongoConnection(uri: string): void {
  if (!isIsolatedVerificationMode()) return;

  let host = '';
  try {
    host = new URL(uri).hostname.toLowerCase();
  } catch {
    throw new Error('[SAFE VERIFICATION] Invalid MongoDB URI supplied during isolated verification.');
  }

  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new Error(
      `[SAFE VERIFICATION] Refusing non-local MongoDB host "${host}" during isolated verification.`
    );
  }
}

/**
 * Legacy HTTP/browser checks may not import the database connector. Restrict
 * them to an explicit loopback verification server and require its health
 * marker before they can send any mutating requests.
 */
export function assertLoopbackVerificationUrl(rawUrl: string, context: string): void {
  requireIsolatedVerification(context);

  let host = '';
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    throw new Error(`[SAFE VERIFICATION] ${context} received an invalid URL.`);
  }

  if (host !== '127.0.0.1' && host !== 'localhost' && host !== '::1') {
    throw new Error(`[SAFE VERIFICATION] ${context} refuses non-loopback URL host "${host}".`);
  }
}
