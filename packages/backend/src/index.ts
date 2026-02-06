import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';

// Load environment variables first
dotenv.config();

import { pool, closeConnections } from './db/connection';
import { auditLog } from './middleware/audit-log';
import { startPeriodicSync } from './services/google-calendar-sync';
import { initializeWebSocketServer } from './services/websocket-server';

// Import routes
import authRoutes from './routes/auth';
import facilityRoutes from './routes/facility';
import actionsRoutes from './routes/actions';
import tasksRoutes from './routes/tasks';
import metricsRoutes from './routes/metrics';
import doctorsRoutes from './routes/doctors';
import chatRoutes from './routes/chat';
import webhookRoutes from './routes/webhooks';
import { createCalendarRouter } from './routes/calendar';

// Import services
import { clawAgent, facilityBroadcaster } from './services/claw-agent-client';

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
app.use('/api/webhooks', webhookRoutes);
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

// Helper function to collect facility status
async function getFacilityStatus() {
  const [rooms, equipment, tasks, actions] = await Promise.all([
    pool.query('SELECT id, name, type, status, current_doctor_id FROM rooms'),
    pool.query('SELECT id, name, type, status FROM equipment'),
    pool.query('SELECT id, type, status, assignee FROM tasks WHERE status != \'completed\''),
    pool.query('SELECT id, type, urgency, title FROM action_items WHERE status = \'pending\''),
  ]);

  return {
    timestamp: new Date().toISOString(),
    facilityId: 'facility-001',
    rooms: rooms.rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      currentDoctorId: r.current_doctor_id,
    })),
    equipment: equipment.rows.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      status: e.status,
    })),
    patients: {
      waiting: 0,
      inExamination: 0,
      inTreatment: 0,
      checkingOut: 0,
    },
    tasks: tasks.rows.map(t => ({
      id: t.id,
      type: t.type,
      status: t.status,
      assignee: t.assignee,
    })),
    actionItems: actions.rows.map(a => ({
      id: a.id,
      type: a.type,
      urgency: a.urgency,
      title: a.title,
    })),
  };
}

// Start server
async function start() {
  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✓ Database connected');

    // Create HTTP server (needed for WebSocket)
    const server = http.createServer(app);

    // Initialize WebSocket server
    const wsServer = initializeWebSocketServer(server);
    (global as any).wsServer = wsServer;

    // Check CLAW agent connection
    const clawHealthy = await clawAgent.ping();
    if (clawHealthy) {
      console.log('✓ CLAW agent connected');
      
      // Start facility status broadcaster
      facilityBroadcaster.start(getFacilityStatus);
      console.log('✓ Facility status broadcaster started');
    } else {
      console.warn('⚠ CLAW agent offline - will retry automatically');
    }

    // Start Google Calendar sync (if configured)
    const syncInterval = startPeriodicSync(pool, 5);
    if (syncInterval) {
      // Store sync interval for cleanup
      (global as any).syncInterval = syncInterval;
    }

    server.listen(PORT, () => {
      console.log(`✓ Server running on port ${PORT}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`✓ WebSocket server ready at ws://localhost:${PORT}/ws`);
      console.log(`✓ Webhook endpoints ready at /api/webhooks`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  // Stop WebSocket server
  const wsServer = (global as any).wsServer;
  if (wsServer) {
    wsServer.shutdown();
  }
  
  facilityBroadcaster.stop();
  if ((global as any).syncInterval) {
    clearInterval((global as any).syncInterval);
  }
  await closeConnections();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  
  // Stop WebSocket server
  const wsServer = (global as any).wsServer;
  if (wsServer) {
    wsServer.shutdown();
  }
  
  facilityBroadcaster.stop();
  if ((global as any).syncInterval) {
    clearInterval((global as any).syncInterval);
  }
  await closeConnections();
  process.exit(0);
});

start();
