import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AuthenticatedRequest, AuthPayload } from './auth.js';
import { Event } from '../models/Event.js';

export interface TenantContextRequest extends AuthenticatedRequest {
  activeCollegeId?: string;
  activeEventId?: string;
}

export async function tenantContext(req: TenantContextRequest, res: Response, next: NextFunction): Promise<void> {
  // Early JWT token decode if authorization header is present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ') && !req.user) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, ENV.JWT_SECRET) as AuthPayload;
    } catch (e) {}
  }

  const isSuperAdmin = req.user?.role === 'super_admin';

  // 1. Resolve College ID: authenticated user's assigned collegeId strictly takes precedence
  if (req.user?.collegeId && !isSuperAdmin) {
    req.activeCollegeId = req.user.collegeId.toString();
  } else {
    const collegeHeader = (req.headers['x-college-id'] as string) || (req.query.collegeId as string);
    if (collegeHeader) {
      req.activeCollegeId = collegeHeader;
    } else if (req.user?.collegeId) {
      req.activeCollegeId = req.user.collegeId.toString();
    }
  }

  // 2. Resolve Event ID: authenticated user's assigned eventId strictly takes precedence
  if (req.user?.eventId && !isSuperAdmin) {
    req.activeEventId = req.user.eventId.toString();
  } else {
    const eventHeader = (req.headers['x-event-id'] as string) || (req.query.eventId as string);
    if (eventHeader) {
      req.activeEventId = eventHeader;
    } else if (req.user?.eventId) {
      req.activeEventId = req.user.eventId.toString();
    }
  }

  // 3. Fallback to active event within the tenant's college if activeCollegeId is set
  if (!req.activeEventId && req.activeCollegeId) {
    try {
      const tenantEvent = await Event.findOne({
        collegeId: req.activeCollegeId,
        status: { $in: ['live', 'ready', 'registration'] }
      }).sort({ createdAt: -1 });
      if (tenantEvent) {
        req.activeEventId = tenantEvent._id.toString();
      }
    } catch (e) {}
  }

  next();
}
