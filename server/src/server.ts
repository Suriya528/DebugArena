import http from 'http';
import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import { initSocketIO } from './services/socketService.js';
import { startServerTimerSweep } from './services/timerService.js';
import { authRouter } from './routes/auth.js';
import { participantRouter } from './routes/participant.js';
import { adminRouter } from './routes/admin.js';
import { adminEventRouter } from './routes/adminEvent.js';
import { tenantContext } from './middleware/tenantContext.js';

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(tenantContext as any);

// Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'DebugArena API', timestamp: new Date() });
});

// Mount Routes
app.use('/api/auth', authRouter);
app.use('/api/participant', participantRouter);
app.use('/api/admin', adminRouter);
app.use('/api/admin/events', adminEventRouter);

// Initialize Socket.io
initSocketIO(server);

// Start Server
async function bootstrap() {
  await connectDB();

  // If database has no rounds or users, automatically seed default data
  const { Round } = await import('./models/Round.js');
  const roundCount = await Round.countDocuments();
  if (roundCount === 0) {
    console.log('🌱 Database is empty. Auto-seeding initial competition data...');
    const { seedData } = await import('./scripts/seed.js');
    await seedData();
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
