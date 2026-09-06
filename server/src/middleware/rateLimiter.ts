import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ENV } from '../config/env.js';

const isProduction = ENV.NODE_ENV === 'production';

/**
 * Brute-force protection for authentication endpoints (login, register).
 * Enforces 15 attempts/minute in production (100 in dev/test to facilitate rapid verification).
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProduction ? 15 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts from this IP. Please wait 60 seconds before retrying.',
    retryAfterSeconds: 60
  },
  handler: (_req: Request, res: Response, _next, options) => {
    res.status(429).json(options.message);
  }
});

/**
 * Sandboxed code execution rate limiter to prevent server compute denial-of-service.
 * Limits /api/participant/run-code to 25 executions/minute in production (120 in dev/test).
 * Note: Does not throttle debounced code autosaves (/api/participant/save-answer).
 */
export const codeRunLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProduction ? 25 : 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Execution rate limit exceeded. You may execute code up to 25 times per minute.',
    retryAfterSeconds: 60
  },
  handler: (_req: Request, res: Response, _next, options) => {
    res.status(429).json(options.message);
  }
});

/**
 * General API rate limiter applied to /api/* routes to defend against volumetric flood attacks.
 * Automatically skips health checks and Socket.io polling.
 */
export const apiGlobalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProduction ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req: Request) => {
    // Never throttle health check or status pings
    return req.path === '/health' || req.path === '/api/health';
  },
  message: {
    error: 'Traffic threshold exceeded. Please slow down your requests.',
    retryAfterSeconds: 60
  },
  handler: (_req: Request, res: Response, _next, options) => {
    res.status(429).json(options.message);
  }
});
