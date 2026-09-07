import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { College } from '../models/College.js';
import { PasskeySignInSession } from '../models/PasskeySignInSession.js';
import { ENV } from '../config/env.js';
import { authenticate, AuthenticatedRequest, AuthPayload } from '../middleware/auth.js';
import { sendPasskeyNotificationEmail, sendPasskeyMagicSignInEmail } from '../services/emailService.js';

export const authRouter = Router();

// GET /api/auth/config
// Exposes public client auth configuration (Google OAuth Client ID, etc.)
authRouter.get('/config', (_req: Request, res: Response): void => {
  res.json({
    googleClientId: ENV.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ''
  });
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const identifier = username.toLowerCase().trim();
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }]
    });
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (!user.passwordHash) {
      res.status(401).json({ error: 'This account was created via Google Sign-In. Please use Google Login.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    if (user.isDisqualified) {
      res.status(403).json({
        error: 'You have been disqualified from the competition',
        reason: user.disqualificationReason || 'Rule violation'
      });
      return;
    }

    const needsOnboarding = !user.collegeId && user.role !== 'participant';

    const payload: AuthPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
      collegeId: user.collegeId ? user.collegeId.toString() : undefined,
      eventId: user.eventId ? user.eventId.toString() : undefined
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      needsOnboarding,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        eventId: user.eventId,
        department: user.department,
        regNo: user.regNo,
        hasPasskey: Boolean(user.hasPasskey),
        needsOnboarding
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select('-passwordHash -passkeyHash');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const needsOnboarding = !user.collegeId && user.role !== 'participant';
    res.json({
      needsOnboarding,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        eventId: user.eventId,
        department: user.department,
        regNo: user.regNo,
        hasPasskey: Boolean(user.hasPasskey),
        needsOnboarding,
        isDisqualified: user.isDisqualified,
        disqualificationReason: user.disqualificationReason
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// Helper to safely mask email address for privacy during account disambiguation
function maskEmailAddress(email: string): string {
  if (!email || !email.includes('@')) {
    if (email.length <= 3) return '***';
    return email.slice(0, 2) + '***' + email.slice(-1);
  }
  const [localPart, domain] = email.split('@');
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}***@${domain}`;
}

// -------------------- PASSKEY AUTHENTICATION --------------------

// POST /api/auth/passkey/login
// Allows an organizer/administrator to sign in using ONLY their security passkey keyword.
// If multiple accounts share the same passkey, requests email confirmation to disambiguate.
authRouter.post('/passkey/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { passkey, email, identifier } = req.body;
    if (!passkey || String(passkey).trim().length === 0) {
      res.status(400).json({ error: 'Security passkey keyword is required' });
      return;
    }

    const cleanPasskey = String(passkey).trim();
    const cleanId = (email || identifier) ? String(email || identifier).toLowerCase().trim() : null;

    // Generate Keyed HMAC blind-index for indexed lookup
    const lookupHash = crypto.createHmac('sha256', ENV.JWT_SECRET).update(cleanPasskey).digest('hex');

    // Query candidates matching the blind index who are non-participants with active passkeys
    let query: any = {
      passkeyLookupHash: lookupHash,
      hasPasskey: true,
      role: { $ne: 'participant' }
    };

    let candidates = await User.find(query);

    // Fallback: If no candidate was found by lookupHash (e.g. legacy passkeys created before blind-indexing)
    if (candidates.length === 0) {
      if (cleanId) {
        const directCandidate = await User.findOne({
          $or: [{ username: cleanId }, { email: cleanId }],
          hasPasskey: true,
          role: { $ne: 'participant' }
        });
        if (directCandidate?.passkeyHash && (await bcrypt.compare(cleanPasskey, directCandidate.passkeyHash))) {
          directCandidate.passkeyLookupHash = lookupHash;
          await directCandidate.save();
          candidates = [directCandidate];
        }
      } else {
        // Search legacy organizers with hasPasskey: true and no passkeyLookupHash
        const legacyCandidates = await User.find({
          hasPasskey: true,
          passkeyLookupHash: { $exists: false },
          role: { $ne: 'participant' }
        }).limit(25);

        for (const leg of legacyCandidates) {
          if (leg.passkeyHash && (await bcrypt.compare(cleanPasskey, leg.passkeyHash))) {
            leg.passkeyLookupHash = lookupHash;
            await leg.save();
            candidates.push(leg);
          }
        }
      }
    }

    // Cryptographic verification of bcrypt hash on candidates
    const verifiedCandidates: any[] = [];
    for (const cand of candidates) {
      if (cand.passkeyHash && (await bcrypt.compare(cleanPasskey, cand.passkeyHash))) {
        verifiedCandidates.push(cand);
      }
    }

    if (verifiedCandidates.length === 0) {
      res.status(401).json({
        error: 'Invalid security passkey keyword. Please verify your keyword or sign in with password.'
      });
      return;
    }

    // Resolve which user to log in:
    let targetUser: any = null;

    if (verifiedCandidates.length === 1) {
      targetUser = verifiedCandidates[0];
    } else {
      // Multiple accounts share this passkey!
      if (!cleanId) {
        // Disambiguation required: Return masked account previews with username and ask for confirmation
        res.status(200).json({
          requiresEmail: true,
          message: 'Multiple organizer accounts match this passkey keyword. Please select or confirm your registered email or username.',
          matchedCount: verifiedCandidates.length,
          maskedAccounts: verifiedCandidates.map(u => ({
            name: u.name,
            username: u.username,
            maskedEmail: maskEmailAddress(u.email || `${u.username}@debugarena.internal`)
          }))
        });
        return;
      }

      // Identifier was provided: match against verified candidates by email OR username
      targetUser = verifiedCandidates.find(
        u => u.email?.toLowerCase() === cleanId || u.username?.toLowerCase() === cleanId
      );

      if (!targetUser) {
        res.status(401).json({
          error: 'The provided email or username does not match any organizer account registered with this passkey keyword.'
        });
        return;
      }
    }

    if (targetUser.isDisqualified) {
      res.status(403).json({
        error: 'You have been disqualified from the platform',
        reason: targetUser.disqualificationReason || 'Security violation'
      });
      return;
    }

    const needsOnboarding = !targetUser.collegeId;

    // Direct 1-Step Passkey Sign-In: If organizer account was created without an external email,
    // authenticate immediately with JWT token without waiting for email link!
    const isInternalOrMissingEmail = !targetUser.email || targetUser.email.endsWith('@debugarena.internal');
    if (isInternalOrMissingEmail) {
      const payload: AuthPayload = {
        userId: targetUser._id.toString(),
        username: targetUser.username,
        role: targetUser.role,
        name: targetUser.name,
        collegeId: targetUser.collegeId ? targetUser.collegeId.toString() : undefined,
        eventId: targetUser.eventId ? targetUser.eventId.toString() : undefined
      };
      const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

      res.json({
        token,
        needsOnboarding,
        user: {
          id: targetUser._id,
          username: targetUser.username,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          collegeId: targetUser.collegeId,
          eventId: targetUser.eventId,
          hasPasskey: true,
          needsOnboarding
        }
      });
      return;
    }

    // Two-Factor Email Authorization Flow for accounts with registered email address
    const sessionId = crypto.randomBytes(32).toString('hex');
    const magicToken = crypto.randomBytes(32).toString('hex');

    await PasskeySignInSession.create({
      sessionId,
      token: magicToken,
      userId: targetUser._id,
      email: targetUser.email,
      username: targetUser.username,
      name: targetUser.name || targetUser.username,
      status: 'pending',
      needsOnboarding,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    });

    const clientOrigin = process.env.CLIENT_ORIGIN && process.env.CLIENT_ORIGIN !== 'http://localhost:5173'
      ? process.env.CLIENT_ORIGIN
      : (req.get('origin') || process.env.CLIENT_ORIGIN || 'http://localhost:5173');
    const signInUrl = `${clientOrigin}/verify-signin?token=${magicToken}&session=${sessionId}`;

    sendPasskeyMagicSignInEmail({
      to: targetUser.email,
      name: targetUser.name || targetUser.username,
      username: targetUser.username,
      signInUrl,
      expiresInMinutes: 15
    }).catch(err => console.warn('Background magic sign-in email dispatch error:', err));

    res.json({
      requiresEmailVerification: true,
      sessionId,
      maskedEmail: maskEmailAddress(targetUser.email),
      username: targetUser.username,
      devSignInUrl: process.env.NODE_ENV !== 'production' ? signInUrl : undefined,
      message: `A secure sign-in authorization link has been sent to ${maskEmailAddress(targetUser.email)}.`
    });
  } catch (err: any) {
    console.error('Passkey login error:', err);
    res.status(500).json({ error: 'Server error during passkey verification' });
  }
});

// GET /api/auth/passkey/session-status?sessionId=...
// Allows the waiting sign-in modal to automatically detect when the organizer clicks the email link
authRouter.get('/passkey/session-status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    const session = await PasskeySignInSession.findOne({ sessionId: String(sessionId) });
    if (!session) {
      res.status(404).json({ verified: false, expired: true, error: 'Session expired or not found' });
      return;
    }

    if (session.expiresAt < new Date()) {
      res.json({ verified: false, expired: true, error: 'Session expired' });
      return;
    }

    if (session.status === 'verified' && session.authToken) {
      const user = await User.findById(session.userId);
      res.json({
        verified: true,
        token: session.authToken,
        needsOnboarding: session.needsOnboarding,
        user: {
          id: user?._id || session.userId,
          username: user?.username || session.username,
          name: user?.name || session.name,
          email: user?.email || session.email,
          role: user?.role,
          collegeId: user?.collegeId,
          eventId: user?.eventId,
          hasPasskey: true,
          needsOnboarding: session.needsOnboarding
        }
      });
      return;
    }

    res.json({ verified: false, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check passkey session status' });
  }
});

// POST /api/auth/passkey/verify-magic-token
// Invoked when the organizer clicks the "Sign In to DebugArena" button in their authorization email
authRouter.post('/passkey/verify-magic-token', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, session: sessionParam, sessionId } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const effectiveSessionId = sessionParam || sessionId;
    const query: Record<string, any> = { token: String(token) };
    if (effectiveSessionId) query.sessionId = String(effectiveSessionId);

    const session = await PasskeySignInSession.findOne(query);
    if (!session) {
      res.status(400).json({ error: 'Invalid or expired sign-in link. Please request a new passkey sign-in link.' });
      return;
    }

    if (session.expiresAt < new Date()) {
      res.status(400).json({ error: 'This sign-in link has expired. Please initiate a new passkey sign-in.' });
      return;
    }

    const user = await User.findById(session.userId);
    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    if (user.isDisqualified) {
      res.status(403).json({ error: 'You have been disqualified from the platform.' });
      return;
    }

    const needsOnboarding = !user.collegeId;
    const payload: AuthPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
      collegeId: user.collegeId ? user.collegeId.toString() : undefined,
      eventId: user.eventId ? user.eventId.toString() : undefined
    };

    const authToken = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

    session.status = 'verified';
    session.authToken = authToken;
    session.needsOnboarding = needsOnboarding;
    await session.save();

    res.json({
      success: true,
      token: authToken,
      needsOnboarding,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        eventId: user.eventId,
        hasPasskey: true,
        needsOnboarding
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify sign-in link' });
  }
});

// POST /api/auth/passkey/resend-verification
authRouter.post('/passkey/resend-verification', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'Session ID is required' });
      return;
    }

    const session = await PasskeySignInSession.findOne({ sessionId: String(sessionId) });
    if (!session || session.status !== 'pending') {
      res.status(400).json({ error: 'Session not found or already verified' });
      return;
    }

    const freshToken = crypto.randomBytes(32).toString('hex');
    session.token = freshToken;
    session.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await session.save();

    const clientOrigin = process.env.CLIENT_ORIGIN && process.env.CLIENT_ORIGIN !== 'http://localhost:5173'
      ? process.env.CLIENT_ORIGIN
      : (req.get('origin') || process.env.CLIENT_ORIGIN || 'http://localhost:5173');
    const signInUrl = `${clientOrigin}/verify-signin?token=${freshToken}&session=${session.sessionId}`;

    await sendPasskeyMagicSignInEmail({
      to: session.email,
      name: session.name || session.username,
      username: session.username,
      signInUrl,
      expiresInMinutes: 15
    });

    res.json({
      success: true,
      message: 'A fresh sign-in link has been sent to your email.',
      devSignInUrl: process.env.NODE_ENV !== 'production' ? signInUrl : undefined
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend verification email' });
  }
});

// POST /api/auth/passkey/setup
// Authenticated organizers can set or update their custom passkey keyword (numeric, alphanumeric, symbols)
authRouter.post('/passkey/setup', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { passkey } = req.body;
    if (!passkey || String(passkey).trim().length < 3) {
      res.status(400).json({ error: 'Passkey keyword must be at least 3 characters long.' });
      return;
    }

    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const cleanPasskey = String(passkey).trim();
    const isUpdate = Boolean(user.hasPasskey);

    const lookupHash = crypto.createHmac('sha256', ENV.JWT_SECRET).update(cleanPasskey).digest('hex');
    const hashed = await bcrypt.hash(cleanPasskey, 10);

    user.passkeyLookupHash = lookupHash;
    user.passkeyHash = hashed;
    user.hasPasskey = true;
    user.passkeyUpdatedAt = new Date();
    if (!user.passkeyCreatedAt) {
      user.passkeyCreatedAt = new Date();
    }
    await user.save();

    // Send confirmation email to user's registered email
    const recipientEmail = user.email || (user.username.includes('@') ? user.username : '');
    if (recipientEmail) {
      sendPasskeyNotificationEmail({
        to: recipientEmail,
        name: user.name,
        passkeyKeyword: cleanPasskey,
        isUpdate
      }).catch(err => console.warn('Background email dispatch notice:', err));
    }

    res.json({
      success: true,
      message: `Passkey successfully ${isUpdate ? 'updated' : 'configured'}. Confirmation email dispatched.`,
      hasPasskey: true,
      updatedAt: user.passkeyUpdatedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to configure security passkey' });
  }
});

// GET /api/auth/passkey/status
// Check current passkey configuration status for authenticated user
authRouter.get('/passkey/status', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select('hasPasskey passkeyCreatedAt passkeyUpdatedAt');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({
      hasPasskey: Boolean(user.hasPasskey),
      createdAt: user.passkeyCreatedAt,
      updatedAt: user.passkeyUpdatedAt
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check passkey status' });
  }
});

// DELETE /api/auth/passkey
// Revoke/disable passkey for authenticated organizer
authRouter.delete('/passkey', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    user.hasPasskey = false;
    user.passkeyHash = undefined;
    user.passkeyLookupHash = undefined;
    await user.save();
    res.json({ success: true, message: 'Passkey successfully revoked' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to revoke passkey' });
  }
});

// Helper to auto-generate clean uppercase college codes without user friction
async function generateUniqueCollegeCode(name: string): Promise<string> {
  const clean = name.trim().toUpperCase().replace(/[^A-Z0-9\s]/g, '');
  const words = clean.split(/\s+/).filter(Boolean);
  let baseCode = '';
  if (words.length >= 2) {
    baseCode = words.map(w => w[0]).join('').slice(0, 6);
  } else if (words.length === 1) {
    baseCode = words[0].slice(0, 6);
  }
  if (!baseCode || baseCode.length < 2) {
    baseCode = 'COL';
  }

  let code = baseCode;
  let counter = 1;
  while (await College.exists({ code })) {
    code = `${baseCode}${counter++}`;
  }
  return code;
}

// POST /api/auth/register-admin
// Flexible registration for event organizers: supports Password-First or Passkey-First (email-optional) signup
authRouter.post('/register-admin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, passkey, collegeName, university } = req.body;
    if (!name || String(name).trim().length === 0) {
      res.status(400).json({ error: 'Full name is required' });
      return;
    }

    const cleanPasskey = passkey ? String(passkey).trim() : '';
    const isPasskeySignup = cleanPasskey.length >= 3;

    let cleanEmail: string | undefined = undefined;
    if (email && String(email).trim().length > 0) {
      cleanEmail = String(email).trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({ error: 'Please enter a valid email address' });
        return;
      }
      const existingEmailUser = await User.findOne({ email: cleanEmail });
      if (existingEmailUser) {
        res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
        return;
      }
    } else if (!isPasskeySignup) {
      res.status(400).json({ error: 'Work email is required for standard account registration.' });
      return;
    }

    if (!isPasskeySignup) {
      if (!password || password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long' });
        return;
      }
    }

    // Determine unique username from email or name
    let baseUsername = '';
    if (cleanEmail) {
      baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
    } else {
      baseUsername = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    }
    if (baseUsername.length < 3) baseUsername = 'organizer_' + (baseUsername || 'admin');
    let uniqueUsername = baseUsername;
    let counter = 1;
    while (await User.exists({ username: uniqueUsername })) {
      uniqueUsername = `${baseUsername}_${counter++}`;
    }

    // If collegeName is provided during registration, link or create college immediately
    let collegeId = undefined;
    let createdNewCollege = false;
    let collegeDoc: any = null;
    if (collegeName && collegeName.trim().length >= 2) {
      const trimmedName = collegeName.trim();
      const cleanUniversity = university?.trim() || '';
      collegeDoc = await College.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
      if (!collegeDoc) {
        const generatedCode = await generateUniqueCollegeCode(trimmedName);
        collegeDoc = await College.create({
          name: trimmedName,
          code: generatedCode,
          university: cleanUniversity
        });
        createdNewCollege = true;
      } else if (cleanUniversity && !collegeDoc.university) {
        collegeDoc.university = cleanUniversity;
        await collegeDoc.save();
      }
      collegeId = collegeDoc._id;
    }

    let passkeyHash: string | undefined = undefined;
    let passkeyLookupHash: string | undefined = undefined;
    let hasPasskey = false;

    if (isPasskeySignup) {
      passkeyLookupHash = crypto.createHmac('sha256', ENV.JWT_SECRET).update(cleanPasskey).digest('hex');
      passkeyHash = await bcrypt.hash(cleanPasskey, 10);
      hasPasskey = true;
    }

    // Passwords: Use provided password or generate secure random fallback for passkey-only users
    const effectivePassword = (password && password.length >= 6)
      ? password
      : crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(effectivePassword, 10);

    const user = await User.create({
      username: uniqueUsername,
      name: name.trim(),
      email: cleanEmail || undefined, // undefined avoids MongoDB unique sparse index empty-string collision!
      passwordHash,
      passkeyHash,
      passkeyLookupHash,
      hasPasskey,
      passkeyCreatedAt: hasPasskey ? new Date() : undefined,
      passkeyUpdatedAt: hasPasskey ? new Date() : undefined,
      role: 'college_admin',
      authProvider: isPasskeySignup ? 'passkey' : 'local',
      collegeId
    });

    if (createdNewCollege && collegeDoc) {
      collegeDoc.createdBy = user._id;
      await collegeDoc.save();
    }

    if (hasPasskey && user.email) {
      sendPasskeyNotificationEmail({
        to: user.email,
        name: user.name,
        passkeyKeyword: cleanPasskey,
        isUpdate: false
      }).catch(err => console.warn('Background email dispatch notice on register:', err));
    }

    const payload: AuthPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
      collegeId: collegeId ? collegeId.toString() : undefined
    };
    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({
      token,
      needsOnboarding: !collegeId,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        hasPasskey,
        collegeId: user.collegeId,
        needsOnboarding: !collegeId
      }
    });
  } catch (err: any) {
    console.error('Register admin error:', err);
    res.status(500).json({ error: err.message || 'Failed to create organizer account' });
  }
});

// POST /api/auth/onboarding
// Post-signup onboarding: configures the organizer's institution without requiring a cryptic code
authRouter.post('/onboarding', authenticate, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { collegeName, university } = req.body;
    if (!collegeName || collegeName.trim().length < 2) {
      res.status(400).json({ error: 'Please enter a valid institution / college name' });
      return;
    }

    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const trimmedName = collegeName.trim();
    const cleanUniversity = university?.trim() || '';
    let college = await College.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });
    if (!college) {
      const generatedCode = await generateUniqueCollegeCode(trimmedName);
      college = await College.create({
        name: trimmedName,
        code: generatedCode,
        university: cleanUniversity
      });
    } else if (cleanUniversity && !college.university) {
      college.university = cleanUniversity;
      await college.save();
    }

    user.collegeId = college._id;
    await user.save();

    const payload: AuthPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
      collegeId: college._id.toString()
    };
    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      success: true,
      token,
      college,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        hasPasskey: Boolean(user.hasPasskey),
        collegeId: user.collegeId
      }
    });
  } catch (err: any) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Failed to complete institution onboarding' });
  }
});

// POST /api/auth/google
// Authenticates or provisions an administrator with a verified Google account
authRouter.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, mockEmail, name } = req.body;

    let verifiedEmail: string;
    let verifiedName: string;
    let googleId: string;

    if (credential) {
      // Live Google Tokeninfo verification
      const googleRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
      );
      if (!googleRes.ok) {
        res.status(401).json({ error: 'Invalid Google authentication token' });
        return;
      }
      const payload: any = await googleRes.json();

      // Enforce verified real-world existing email
      if (payload.email_verified !== 'true' && payload.email_verified !== true) {
        res.status(400).json({ error: 'Google email is not verified' });
        return;
      }

      // Audience check if configured in production
      if (ENV.GOOGLE_CLIENT_ID && payload.aud !== ENV.GOOGLE_CLIENT_ID) {
        res.status(401).json({ error: 'Google token audience mismatch' });
        return;
      }

      verifiedEmail = payload.email.toLowerCase().trim();
      verifiedName = payload.name || verifiedEmail.split('@')[0];
      googleId = payload.sub;
    } else if (ENV.NODE_ENV !== 'production' && mockEmail) {
      // Development mock fallback
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(mockEmail)) {
        res.status(400).json({ error: 'Invalid email format' });
        return;
      }
      verifiedEmail = mockEmail.toLowerCase().trim();
      verifiedName = name || mockEmail.split('@')[0];
      googleId = `mock-google-${verifiedEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
    } else {
      res.status(400).json({ error: 'Google credential is required' });
      return;
    }

    // Lookup user by verified email, googleId, or username
    let user = await User.findOne({ $or: [{ email: verifiedEmail }, { googleId }] });
    if (!user) {
      user = await User.findOne({ username: verifiedEmail.split('@')[0] });
    }

    let isNewUser = false;
    if (user) {
      if (user.role === 'participant') {
        res.status(403).json({ error: 'This email is already associated with a participant account. Admin portal access denied.' });
        return;
      }
      user.email = verifiedEmail;
      user.authProvider = 'google';
      user.googleId = googleId;
      await user.save();
    } else {
      isNewUser = true;
      let baseUsername = verifiedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
      if (baseUsername.length < 3) baseUsername = 'admin_' + baseUsername;
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (await User.exists({ username: uniqueUsername })) {
        uniqueUsername = `${baseUsername}_${counter++}`;
      }

      user = await User.create({
        username: uniqueUsername,
        name: verifiedName,
        email: verifiedEmail,
        authProvider: 'google',
        googleId,
        role: 'college_admin'
      });
    }

    if (user.isDisqualified) {
      res.status(403).json({ error: 'Account suspended.' });
      return;
    }

    const needsOnboarding = isNewUser || !user.collegeId;

    const payload: AuthPayload = {
      userId: user._id.toString(),
      username: user.username,
      role: user.role,
      name: user.name,
      collegeId: user.collegeId ? user.collegeId.toString() : undefined,
      eventId: user.eventId ? user.eventId.toString() : undefined
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      needsOnboarding,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        eventId: user.eventId,
        hasPasskey: Boolean(user.hasPasskey),
        needsOnboarding
      }
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});
