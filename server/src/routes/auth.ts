import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { College } from '../models/College.js';
import { ENV } from '../config/env.js';
import { authenticate, AuthenticatedRequest, AuthPayload } from '../middleware/auth.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = await User.findOne({ username: username.toLowerCase().trim() });
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
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        collegeId: user.collegeId,
        eventId: user.eventId,
        department: user.department,
        regNo: user.regNo
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
    const user = await User.findById(req.user?.userId).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error fetching profile' });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', authenticate, (_req: Request, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/google
// Authenticates or provisions an administrator with a verified real-world Google account
authRouter.post('/google', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential, mockEmail, name, collegeName, collegeCode } = req.body;

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
        res.status(400).json({ error: 'Google email is not verified. Real existing email required.' });
        return;
      }

      // Audience check if configured in production
      if (ENV.GOOGLE_CLIENT_ID && payload.aud !== ENV.GOOGLE_CLIENT_ID) {
        res.status(401).json({ error: 'Google token audience mismatch (confused deputy protection).' });
        return;
      }

      verifiedEmail = payload.email.toLowerCase().trim();
      verifiedName = payload.name || verifiedEmail.split('@')[0];
      googleId = payload.sub;
    } else if (ENV.NODE_ENV !== 'production' && mockEmail) {
      // Strict Production Guard: Mock email allowed ONLY in non-production environments
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(mockEmail)) {
        res.status(400).json({ error: 'Invalid real-world email format.' });
        return;
      }
      verifiedEmail = mockEmail.toLowerCase().trim();
      verifiedName = name || mockEmail.split('@')[0];
      googleId = `mock-google-${verifiedEmail.replace(/[^a-zA-Z0-9]/g, '')}`;
    } else {
      res.status(400).json({ error: 'Google credential ID token is required in production.' });
      return;
    }

    // Lookup user by verified email or googleId
    let user = await User.findOne({ $or: [{ email: verifiedEmail }, { googleId }] });
    if (!user) {
      user = await User.findOne({ username: verifiedEmail.split('@')[0] });
    }

    if (user) {
      // Privilege Escalation Guard: Existing participants cannot take over admin role via Google auth
      if (user.role === 'participant') {
        res.status(403).json({ error: 'This email is already associated with a participant account. Admin portal access denied.' });
        return;
      }
      // Existing User linking
      user.email = verifiedEmail;
      user.authProvider = 'google';
      user.googleId = googleId;
      await user.save();
    } else {
      // New Admin Sign-Up Flow: Assign college_admin role
      let baseUsername = verifiedEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
      if (baseUsername.length < 3) baseUsername = 'admin_' + baseUsername;
      let uniqueUsername = baseUsername;
      let counter = 1;
      while (await User.exists({ username: uniqueUsername })) {
        uniqueUsername = `${baseUsername}_${counter++}`;
      }

      // Resolve or create College
      let college: any = null;
      if (collegeName) {
        const resolvedCode = (collegeCode || collegeName.substring(0, 5)).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'COLL';
        college = await College.findOne({ code: resolvedCode });
        if (!college) {
          college = await College.create({
            name: collegeName.trim(),
            code: resolvedCode
          });
        }
      } else {
        // Find first college or create default institutional tenant
        college = await College.findOne();
        if (!college) {
          college = await College.create({
            name: `${verifiedName}'s Institute`,
            code: `COL${Date.now().toString().slice(-4)}`
          });
        }
      }

      user = await User.create({
        username: uniqueUsername,
        name: verifiedName,
        email: verifiedEmail,
        authProvider: 'google',
        googleId,
        role: 'college_admin',
        collegeId: college._id
      });
    }

    if (user.isDisqualified) {
      res.status(403).json({ error: 'Account suspended.' });
      return;
    }

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
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        collegeId: user.collegeId,
        eventId: user.eventId
      }
    });
  } catch (err: any) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Failed to authenticate with Google' });
  }
});
