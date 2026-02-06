import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { asyncHandler, AppError } from '../utils/error-handler';
import { Task } from '../types';
import { Response } from 'express';

const router = Router();

const querySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
  assignee: z.string().optional(),
  doctorId: z.string().uuid().optional(),
  type: z.string().optional(),
});

// GET /api/tasks
router.get(
  '/',
  authenticateToken,
  validateQuery(querySchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status, assignee, doctorId, type } = req.query as any;

    let query = `
      SELECT 
        t.*,
        u.name as assignee_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee = u.id::text
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      query += ` AND t.status = $${paramCount++}`;
      params.push(status);
    } else {
      // Default to non-completed tasks
      query += ` AND t.status IN ('pending', 'in_progress')`;
    }

    if (assignee) {
      query += ` AND t.assignee = $${paramCount++}`;
      params.push(assignee);
    }

    if (doctorId) {
      query += ` AND t.doctor_id = $${paramCount++}`;
      params.push(doctorId);
    }

    if (type) {
      query += ` AND t.type = $${paramCount++}`;
      params.push(type);
    }

    query += ' ORDER BY t.start_time DESC';

    const result = await pool.query(query, params);

    const tasks: Task[] = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      assignee: row.assignee === 'agent' ? 'agent' : (row.assignee_name || row.assignee),
      status: row.status,
      doctorId: row.doctor_id,
      roomId: row.room_id,
      equipmentId: row.equipment_id,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      notes: row.notes || [],
      createdBy: row.created_by,
    }));

    res.json({ tasks });
  })
);

// GET /api/tasks/history
router.get(
  '/history',
  authenticateToken,
  validateQuery(
    z.object({
      date: z.string().date().optional(),
      limit: z.string().transform(Number).optional(),
    })
  ),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { date, limit } = req.query as any;

    let query = `
      SELECT 
        t.*,
        u.name as assignee_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee = u.id::text
      WHERE t.status = 'completed'
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (date) {
      query += ` AND DATE(t.start_time) = $${paramCount++}`;
      params.push(date);
    } else {
      // Default to today
      query += ` AND DATE(t.start_time) = CURRENT_DATE`;
    }

    query += ` ORDER BY t.end_time DESC`;

    if (limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(limit);
    }

    const result = await pool.query(query, params);

    const tasks: Task[] = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      assignee: row.assignee === 'agent' ? 'agent' : (row.assignee_name || row.assignee),
      status: row.status,
      doctorId: row.doctor_id,
      roomId: row.room_id,
      equipmentId: row.equipment_id,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      notes: row.notes || [],
      createdBy: row.created_by,
    }));

    res.json({ tasks });
  })
);

const createTaskSchema = z.object({
  type: z.string().min(1),
  description: z.string().min(1),
  assignee: z.string().min(1),
  doctorId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional(),
  equipmentId: z.string().uuid().optional(),
});

// POST /api/tasks
router.post(
  '/',
  authenticateToken,
  validateBody(createTaskSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const task = req.body;

    const result = await pool.query(
      `INSERT INTO tasks 
       (type, description, assignee, doctor_id, room_id, equipment_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        task.type,
        task.description,
        task.assignee,
        task.doctorId,
        task.roomId,
        task.equipmentId,
        'pending',
        req.user!.id,
      ]
    );

    // Broadcast via WebSocket
    // broadcastTaskCreated(result.rows[0]);

    res.status(201).json({ task: result.rows[0] });
  })
);

const updateTaskSchema = z.object({
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional(),
  assignee: z.string().optional(),
  notes: z.string().optional(),
});

// PUT /api/tasks/:id
router.put(
  '/:id',
  authenticateToken,
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(updateTaskSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, assignee, notes } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${paramCount++}`);
      params.push(status);

      if (status === 'completed' || status === 'failed' || status === 'cancelled') {
        updates.push(`end_time = $${paramCount++}`);
        params.push(new Date());
      }
    }

    if (assignee) {
      updates.push(`assignee = $${paramCount++}`);
      params.push(assignee);
    }

    if (notes) {
      // Append note to notes array
      updates.push(`notes = notes || $${paramCount++}::jsonb`);
      params.push(JSON.stringify([notes]));
    }

    if (updates.length === 0) {
      throw new AppError('VALIDATION_ERROR', 'No updates provided', 400);
    }

    params.push(id);
    const result = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Task not found', 404);
    }

    // Calculate duration if completed
    if (result.rows[0].end_time && result.rows[0].start_time) {
      const duration = Math.floor(
        (new Date(result.rows[0].end_time).getTime() - new Date(result.rows[0].start_time).getTime()) / 1000
      );
      await pool.query('UPDATE tasks SET duration = $1 WHERE id = $2', [duration, id]);
      result.rows[0].duration = duration;
    }

    // Broadcast via WebSocket
    // broadcastTaskUpdated(result.rows[0]);

    res.json({ task: result.rows[0] });
  })
);

export default router;
