import crypto from 'crypto';

/**
 * Generates a cryptographically secure URL-safe random token.
 * Default is 32 bytes (64 hex characters), providing 256 bits of entropy.
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Computes a deterministic SHA-256 hash of a token for secure database persistence.
 * Raw tokens are never stored directly in the database.
 */
export function hashToken(token: string): string {
  if (!token) return '';
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

/**
 * Constant-time comparison between a candidate token and a stored hash.
 * Protects against timing attacks.
 */
export function verifyToken(rawToken: string, storedHash: string): boolean {
  if (!rawToken || !storedHash) return false;
  const candidateHash = hashToken(rawToken);
  try {
    const candidateBuf = Buffer.from(candidateHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');
    if (candidateBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(candidateBuf, storedBuf);
  } catch {
    return false;
  }
}

const CIPHER_KEY = crypto
  .createHash('sha256')
  .update(process.env.JWT_SECRET || 'debugarena_secure_app_secret_key_2026')
  .digest();

/**
 * Encrypts a raw token using AES-256-GCM so authorized owners can retrieve links.
 * Plaintext tokens are NEVER stored directly in the database.
 */
export function encryptToken(token: string): string {
  if (!token) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', CIPHER_KEY, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted token for authorized event owners.
 */
export function decryptToken(cipherText?: string): string | null {
  if (!cipherText) return null;
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', CIPHER_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return null;
  }
}

