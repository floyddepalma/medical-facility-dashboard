import { Router, Response } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { asyncHandler, AppError } from '../utils/error-handler';
import { ActionItem } from '../types';
import { broadcastEvent } from '../services/websocket-server';

const router = Router();

const querySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  urgency: z.enum(['urgent', 'normal', 'low']).optional(),
  doctorId: z.string().uuid().optional(),
  type: z.string().optional(),
});

// GET /api/actions
router.get(
  '/',
  authenticateToken,
  validateQuery(querySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, urgency, doctorId, type } = req.query as any;

    let query = `
      SELECT *,
             EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) * 1000 as time_waiting
      FROM action_items
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND status = $${paramCount++}`;
      params.push(status);
    } else {
      // Default to non-completed items
      query += ` AND status != 'completed'`;
    }

    if (urgency) {
      query += ` AND urgency = $${paramCount++}`;
      params.push(urgency);
    }

    if (doctorId) {
      query += ` AND doctor_id = $${paramCount++}`;
      params.push(doctorId);
    }

    if (type) {
      query += ` AND type = $${paramCount++}`;
      params.push(type);
    }

    query += ` ORDER BY 
                CASE urgency 
                  WHEN 'urgent' THEN 1 
                  WHEN 'normal' THEN 2 
                  WHEN 'low' THEN 3 
                END,
                created_at ASC`;

    const result = await pool.query(query, params);

    const actions: ActionItem[] = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      urgency: row.urgency,
      title: row.title,
      description: row.description,
      context: row.context,
      reasoning: row.reasoning,
      doctorId: row.doctor_id,
      roomId: row.room_id,
      equipmentId: row.equipment_id,
      status: row.status,
      assignedTo: row.assigned_to,
      createdAt: row.created_at,
      createdBy: row.created_by,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      timeWaiting: parseFloat(row.time_waiting),
    }));

    res.json({ actions });
  })
);

const createActionSchema = z.object({
  type: z.enum(['policy_conflict', 'equipment_issue', 'agent_request', 'manual', 'room_issue']),
  urgency: z.enum(['urgent', 'normal', 'low']),
  title: z.string().min(1).max(255),
  description: z.string().min(1),
  context: z.record(z.any()).optional(),
  reasoning: z.string().optional(),
  doctorId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
});

// POST /api/actions
router.post(
  '/',
  authenticateToken,
  validateBody(createActionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const action = req.body;

    const result = await pool.query(
      `INSERT INTO action_items 
       (type, urgency, title, description, context, reasoning, doctor_id, room_id, equipment_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        action.type,
        action.urgency,
        action.title,
        action.description,
        JSON.stringify(action.context || {}),
        action.reasoning,
        action.doctorId,
        action.roomId,
        action.equipmentId,
        'pending',
        req.user!.id,
      ]
    );

    const created = result.rows[0];

    // Broadcast via WebSocket
    broadcastEvent('actions', 'action:created', created);

    res.status(201).json({ action: created });
  })
);

const updateActionSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  assignedTo: z.string().uuid().optional(),
  notes: z.string().optional(),
});

// PUT /api/actions/:id
router.put(
  '/:id',
  authenticateToken,
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(updateActionSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, assignedTo, notes } = req.body;

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);

      if (status === 'completed') {
        updates.push(`completed_at = $${paramCount++}`);
        params.push(new Date());
        updates.push(`completed_by = $${paramCount++}`);
        params.push(req.user!.id);
      }
    }

    if (assignedTo) {
      updates.push(`assigned_to = $${paramCount++}`);
      params.push(assignedTo);
    }

    if (notes) {
      // Append notes to context
      updates.push(`context = context || $${paramCount++}::jsonb`);
      params.push(JSON.stringify({ notes: [notes] }));
    }

    if (updates.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No updates provided', 400);
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE action_items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Action item not found', 404);
    }

    // Broadcast via WebSocket
    broadcastEvent('actions', 'action:updated', result.rows[0]);

    res.json({ action: result.rows[0] });
  })
);

// DELETE /api/actions/:id
router.delete(
  '/:id',
  authenticateToken,
  validateParams(z.object({ id: z.string().uuid() })),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM action_items WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Action item not found', 404);
    }

    // Broadcast via WebSocket
    broadcastEvent('actions', 'action:deleted', { id });

    res.json({ message: 'Action item deleted', id });
  })
);

export default router;
