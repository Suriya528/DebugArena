import dotenv from 'dotenv';
dotenv.config();

export const DEFAULT_DEV_JWT_SECRET = 'debugarena-super-secure-jwt-secret-key-2026';

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || DEFAULT_DEV_JWT_SECRET,
  PISTON_URL: process.env.PISTON_URL || 'https://emkc.org/api/v2/piston',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean),
  NODE_ENV: process.env.NODE_ENV || 'development',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || ''
};

/**
 * Validates enterprise configuration safeguards in production environments.
 * Throws a fatal descriptive error if production safety constraints are violated.
 */
export function validateProductionEnv(): void {
  if (ENV.NODE_ENV !== 'production') {
    return;
  }

  if (!ENV.MONGODB_URI) {
    throw new Error(
      '[FATAL] Production configuration error: MONGODB_URI is required when NODE_ENV=production. Ephemeral in-memory database is strictly disabled.'
    );
  }

  const rawSecret = process.env.JWT_SECRET;
  if (!rawSecret || rawSecret === DEFAULT_DEV_JWT_SECRET) {
    throw new Error(
      '[FATAL] Production security error: Default development JWT_SECRET cannot be used in production. Please set a unique, high-entropy JWT_SECRET in environment variables.'
    );
  }

  if (rawSecret.length < 32) {
    throw new Error(
      '[FATAL] Production security error: JWT_SECRET must be at least 32 characters long in production for cryptographic integrity.'
    );
  }
}
