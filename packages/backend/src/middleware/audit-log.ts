import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { pool } from '../db/connection';

const STATE_CHANGING_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

export async function auditLog(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Only log state-changing operations
  if (!STATE_CHANGING_METHODS.includes(req.method)) {
    next();
    return;
  }

  // Skip if no authenticated user
  if (!req.user) {
    next();
    return;
  }

  // Capture response to log after completion
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    // Log the action
    logAction(req, res.statusCode, body).catch((err) => {
      console.error('Failed to write audit log:', err);
    });

    return originalJson(body);
  };

  next();
}

async function logAction(
  req: AuthRequest,
  statusCode: number,
  responseBody: any
): Promise<void> {
  if (!req.user) return;

  // Extract resource information from URL
  const pathParts = req.path.split('/').filter(Boolean);
  const resourceType = pathParts[1] || 'unknown'; // e.g., 'rooms', 'tasks', 'actions'
  const resourceId = pathParts[2] || null;

  const actionType = `${req.method}_${resourceType}`;

  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action_type, resource_type, resource_id, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        actionType,
        resourceType,
        resourceId,
        JSON.stringify({
          method: req.method,
          path: req.path,
          statusCode,
          body: filterSensitiveData(req.body),
          query: req.query,
        }),
        new Date(),
      ]
    );
  } catch (err) {
    console.error('Error writing audit log:', err);
  }
}

function filterSensitiveData(data: any): any {
  if (!data) return data;

  const filtered = { ...data };
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

  for (const field of sensitiveFields) {
    if (field in filtered) {
      filtered[field] = '[REDACTED]';
    }
  }

  return filtered;
}
