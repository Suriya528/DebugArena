import { Router, Request, Response } from 'express';

export const timeSyncRouter = Router();

// GET /api/time/sync
// Provides millisecond-accurate server time for monotonic assessment timer calibration
timeSyncRouter.get('/sync', (req: Request, res: Response) => {
  const now = Date.now();
  res.json({
    serverTime: now,
    iso: new Date(now).toISOString(),
    status: 'synchronized'
  });
});
