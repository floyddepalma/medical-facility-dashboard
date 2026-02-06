import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import { pool, closeConnections } from './db/connection';
import { auditLog } from './middleware/audit-log';
import { startPeriodicSync } from './services/google-calendar-sync';

// Import routes
import authRoutes from './routes/auth';
import facilityRoutes from './routes/facility';
import actionsRoutes from './routes/actions';
import tasksRoutes from './routes/tasks';
import metricsRoutes from './routes/metrics';
import doctorsRoutes from './routes/doctors';
import chatRoutes from './routes/chat';
import { createCalendarRouter } from './routes/calendar';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Audit logging middleware (after auth, before routes)
app.use(auditLog);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/facility', facilityRoutes);
app.use('/api/actions', actionsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/calendar', createCalendarRouter(pool));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      retryable: false,
      timestamp: new Date(),
    },
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      retryable: true,
      timestamp: new Date(),
    },
  });
});

// Start server
async function start() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected');

    // Start Google Calendar sync (if configured)
    const syncInterval = startPeriodicSync(pool, 5);
    if (syncInterval) {
      // Store sync interval for cleanup
      (global as any).syncInterval = syncInterval;
    }

    app.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if ((global as any).syncInterval) {
    clearInterval((global as any).syncInterval);
  }
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  if ((global as any).syncInterval) {
    clearInterval((global as any).syncInterval);
  }
  await closeConnections();
  process.exit(0);
});

start();
