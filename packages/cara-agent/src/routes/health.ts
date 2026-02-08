import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  res.json({
    status: 'ok',
    agent: process.env.AGENT_NAME || 'Cara',
    role: process.env.AGENT_ROLE || 'Medical Facility Operations Agent',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    model: process.env.MODEL
  });
});
