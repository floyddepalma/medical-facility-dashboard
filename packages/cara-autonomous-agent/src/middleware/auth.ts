import { Request, Response, NextFunction } from 'express';

export function authenticateRequest(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.CLAW_AUTH_TOKEN;

  if (!expectedToken) {
    console.error('[Auth] CLAW_AUTH_TOKEN not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  if (!authHeader) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  if (token !== expectedToken) {
    return res.status(403).json({ error: 'Invalid authentication token' });
  }

  next();
}
