import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
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
      name: user.name
    };

    const token = jwt.sign(payload, ENV.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
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
