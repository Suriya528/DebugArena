import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';

export interface AuthPayload {
  userId: string;
  username: string;
  role: 'participant' | 'admin';
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: 'participant' | 'admin') {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: `Forbidden: Requires ${role} role` });
      return;
    }
    next();
  };
}

export async function checkNotDisqualified(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.user || req.user.role !== 'participant') {
    next();
    return;
  }
  const user = await User.findById(req.user.userId);
  if (!user || user.isDisqualified) {
    res.status(403).json({
      error: 'You have been disqualified from the competition',
      reason: user?.disqualificationReason || 'Violation of competition rules'
    });
    return;
  }
  next();
}
