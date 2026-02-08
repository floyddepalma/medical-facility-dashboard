import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { webhookRouter } from './routes/webhook';
import { healthRouter } from './routes/health';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/health', healthRouter);
app.use('/webhook', webhookRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log('✓ Cara agent started');
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Dashboard URL: ${process.env.DASHBOARD_URL}`);
  console.log(`✓ AI Model: ${process.env.MODEL}`);
  console.log(`✓ Agent: ${process.env.AGENT_NAME || 'Cara'}`);
});
