import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { College } from '../models/College.js';
import { ENV } from '../config/env.js';
import { authenticate, AuthenticatedRequest, AuthPayload } from '../middleware/auth.js';
import { sendPasskeyNotificationEmail } from '../services/emailService.js';

export const authRouter = Router();

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

// -------------------- PASSKEY AUTHENTICATION --------------------

// POST /api/auth/passkey/login
// Allows an organizer/administrator to sign in using their registered security passkey keyword
authRouter.post('/passkey/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { identifier, passkey } = req.body;
    if (!identifier || !passkey) {
      res.status(400).json({ error: 'Username/Email and Passkey are required' });
      return;
    }

    const cleanId = String(identifier).toLowerCase().trim();
    const cleanPasskey = String(passkey).trim();

    const user = await User.findOne({
      $or: [{ username: cleanId }, { email: cleanId }]
    });

    if (!user) {
      res.status(401).json({ error: 'No account found matching this identifier' });
      return;
    }

    if (user.role === 'participant') {
      res.status(403).json({ error: 'Passkey sign-in is reserved for competition organizers and administrators.' });
      return;
    }

    if (!user.hasPasskey || !user.passkeyHash) {
      res.status(401).json({
        error: 'No security passkey is configured for this account. Please sign in with your password and create a passkey in your profile.'
      });
      return;
    }

    const isMatch = await bcrypt.compare(cleanPasskey, user.passkeyHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid security passkey keyword.' });
      return;
    }

    if (user.isDisqualified) {
      res.status(403).json({
        error: 'You have been disqualified from the platform',
        reason: user.disqualificationReason || 'Security violation'
      });
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
        hasPasskey: true,
        needsOnboarding
      }
    });
  } catch (err: any) {
    console.error('Passkey login error:', err);
    res.status(500).json({ error: 'Server error during passkey verification' });
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

    const hashed = await bcrypt.hash(cleanPasskey, 10);
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
// Direct email/password registration for event organizers
authRouter.post('/register-admin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, collegeName, university } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address' });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }

    const existingUser = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanEmail.split('@')[0] }]
    });
    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
      return;
    }

    let baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
    if (baseUsername.length < 3) baseUsername = 'organizer_' + baseUsername;
    let uniqueUsername = baseUsername;
    let counter = 1;
    while (await User.exists({ username: uniqueUsername })) {
      uniqueUsername = `${baseUsername}_${counter++}`;
    }

    // If collegeName is provided during general registration, link college immediately
    let collegeId = undefined;
    if (collegeName && collegeName.trim().length >= 2) {
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
      collegeId = college._id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: uniqueUsername,
      name: name.trim(),
      email: cleanEmail,
      passwordHash,
      role: 'college_admin',
      authProvider: 'local',
      collegeId
    });

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
        collegeId: user.collegeId
      }
    });
  } catch (err: any) {
    console.error('Register admin error:', err);
    res.status(500).json({ error: 'Failed to create organizer account' });
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
        needsOnboarding
      }
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});
