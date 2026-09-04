import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { Event } from '../models/Event.js';

export interface TenantContextRequest extends AuthenticatedRequest {
  activeCollegeId?: string;
  activeEventId?: string;
}

export async function tenantContext(req: TenantContextRequest, res: Response, next: NextFunction): Promise<void> {
  // Extract college and event from headers, query, or authenticated user
  const eventHeader = (req.headers['x-event-id'] as string) || (req.query.eventId as string);
  const collegeHeader = (req.headers['x-college-id'] as string) || (req.query.collegeId as string);

  if (eventHeader) {
    req.activeEventId = eventHeader;
  } else if (req.user?.eventId) {
    req.activeEventId = req.user.eventId;
  }

  if (collegeHeader) {
    req.activeCollegeId = collegeHeader;
  } else if (req.user?.collegeId) {
    req.activeCollegeId = req.user.collegeId;
  }

  // If no active event is specified, attempt to resolve the default active or live event
  if (!req.activeEventId) {
    try {
      const defaultEvent = await Event.findOne({ status: { $in: ['live', 'ready', 'registration'] } }).sort({ createdAt: -1 });
      if (defaultEvent) {
        req.activeEventId = defaultEvent._id.toString();
        req.activeCollegeId = defaultEvent.collegeId.toString();
      }
    } catch (e) {}
  }

  next();
}
