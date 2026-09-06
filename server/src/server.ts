import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { ENV, validateProductionEnv } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocketIO } from './services/socketService.js';
import { startServerTimerSweep } from './services/timerService.js';
import { authLimiter, codeRunLimiter, apiGlobalLimiter } from './middleware/rateLimiter.js';
import { authRouter } from './routes/auth.js';
import { participantRouter } from './routes/participant.js';
import { adminRouter } from './routes/admin.js';
import { adminEventRouter } from './routes/adminEvent.js';
import { adminQuestionBankRouter } from './routes/adminQuestionBank.js';
import { adminControlRoomRouter } from './routes/adminControlRoom.js';
import { adminAnalyticsRouter } from './routes/adminAnalytics.js';
import { certificateRouter } from './routes/certificate.js';
import { timeSyncRouter } from './routes/timeSync.js';
import { tenantContext } from './middleware/tenantContext.js';

const app = express();
const server = http.createServer(app);

// Reverse Proxy & NAT Guard: Enables accurate client IP extraction from X-Forwarded-For
app.set('trust proxy', 1);

// Production-Hardened CORS Configuration
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Permit server-to-server, curl, mobile, and non-browser clients
    if (!origin) return callback(null, true);

    if (ENV.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (ENV.CLIENT_ORIGINS.includes(origin) || ENV.CLIENT_ORIGINS.includes('*')) {
      return callback(null, true);
    }

    return callback(new Error(`CORS Policy: Origin '${origin}' is not permitted.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-college-id', 'x-event-id']
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(tenantContext as any);

// Health Check (Always open and unthrottled)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'DebugArena API', timestamp: new Date() });
});

// Rate Limiting Guards
app.use('/api', apiGlobalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/participant/run-code', codeRunLimiter);

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/time', timeSyncRouter);
app.use('/api/participant', participantRouter);
app.use('/api/certificates', certificateRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/events', adminEventRouter);
app.use('/api/admin/questions/bank', adminQuestionBankRouter);
app.use('/api/admin/control-room', adminControlRoomRouter);
app.use('/api/admin/analytics', adminAnalyticsRouter);

// Initialize Socket.io
initSocketIO(server);

// Start Server
async function bootstrap() {
  // Validate production safety constraints before touching storage
  validateProductionEnv();

  await connectDB();

  // Seeding Guard: In production, never auto-populate test data on boot
  const { Round } = await import('./models/Round.js');
  const roundCount = await Round.countDocuments();
  if (roundCount === 0) {
    if (ENV.NODE_ENV === 'production') {
      console.log('⚠️ [Production Guard] Database has 0 rounds. Automatic test seeding is disabled in production.');
      console.log('ℹ️ Run "npm run seed" manually or configure events via the Admin Event Builder.');
    } else {
      console.log('🌱 Database is empty. Auto-seeding initial competition data...');
      const { seedData } = await import('./scripts/seed.js');
      await seedData();
    }
  }

  startServerTimerSweep();

  server.listen(ENV.PORT, () => {
    console.log(`🚀 DebugArena Backend Server running on http://localhost:${ENV.PORT}`);
    console.log(`🔌 Socket.io ready for live monitoring`);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal bootstrap error:', err);
  process.exit(1);
});

export { app, server };
