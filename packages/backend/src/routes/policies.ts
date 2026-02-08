/**
 * Policy Routes
 * 
 * CRUD + validation for scheduling policies.
 * Used by the dashboard UI and Cara Agent (via Open CLAW).
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db/connection';
import { authenticateToken } from '../middleware/auth';
import { broadcastEvent } from '../services/websocket-server';
import {
  validatePolicy,
  explainPolicy,
  Policy,
  PolicyType,
  POLICY_TYPE_LABELS,
  POLICY_TYPE_DESCRIPTIONS,
} from '../types/policy-schema';

const router = Router();

// =============================================================================
// GET /api/policies - List policies (optionally filtered by doctorId)
// =============================================================================

router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { doctorId, policyType, active } = req.query;

    let query = `
      SELECT p.*, d.name as doctor_name
      FROM policies p
      JOIN doctors d ON p.doctor_id = d.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 1;

    // Filter by doctor
    if (doctorId) {
      query += ` AND p.doctor_id = $${paramIdx++}`;
      params.push(doctorId);
    } else if (user.role === 'doctor' && user.doctorId) {
      query += ` AND p.doctor_id = $${paramIdx++}`;
      params.push(user.doctorId);
    }

    // Filter by type
    if (policyType) {
      query += ` AND p.policy_type = $${paramIdx++}`;
      params.push(policyType);
    }

    // Filter by active status
    if (active !== undefined) {
      query += ` AND p.is_active = $${paramIdx++}`;
      params.push(active === 'true');
    }

    query += ' ORDER BY p.priority DESC, p.created_at DESC';

    const result = await pool.query(query, params);

    const policies = result.rows.map(mapRowToPolicy);
    res.json({ policies });
  } catch (err) {
    console.error('Error fetching policies:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch policies' } });
  }
});

// =============================================================================
// GET /api/policies/types - List available policy types with descriptions
// =============================================================================

router.get('/types', authenticateToken, (_req: Request, res: Response) => {
  const types = Object.entries(POLICY_TYPE_LABELS).map(([key, label]) => ({
    type: key,
    label,
    description: POLICY_TYPE_DESCRIPTIONS[key as PolicyType],
  }));
  res.json({ types });
});

// =============================================================================
// GET /api/policies/:id - Get single policy
// =============================================================================

router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, d.name as doctor_name
       FROM policies p
       JOIN doctors d ON p.doctor_id = d.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    }

    res.json({ policy: mapRowToPolicy(result.rows[0]) });
  } catch (err) {
    console.error('Error fetching policy:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch policy' } });
  }
});

// =============================================================================
// GET /api/policies/:id/explain - Human-readable explanation
// =============================================================================

router.get('/:id/explain', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT p.*, d.name as doctor_name FROM policies p JOIN doctors d ON p.doctor_id = d.id WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    }

    const policy = mapRowToPolicy(result.rows[0]);
    const explanation = explainPolicy(policy);

    res.json({
      policyId: policy.id,
      label: policy.label,
      type: policy.policyType,
      typeLabel: POLICY_TYPE_LABELS[policy.policyType],
      explanation,
      isActive: policy.isActive,
      doctorName: result.rows[0].doctor_name,
    });
  } catch (err) {
    console.error('Error explaining policy:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to explain policy' } });
  }
});

// =============================================================================
// POST /api/policies - Create policy
// =============================================================================

router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { doctorId, policyType, label, policyData, priority } = req.body;

    if (!doctorId || !policyType || !label || !policyData) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'doctorId, policyType, label, and policyData are required' },
      });
    }

    // Validate policy data
    const validation = validatePolicy({ ...policyData, policyType });
    if (!validation.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid policy data', details: validation.errors },
      });
    }

    const result = await pool.query(
      `INSERT INTO policies (doctor_id, policy_type, label, policy_data, priority, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [doctorId, policyType, label, JSON.stringify(policyData), priority || 5, user.name || user.email || 'system']
    );

    const policy = mapRowToPolicy(result.rows[0]);

    // Broadcast
    broadcastEvent('facility', 'policy:created', policy);

    res.status(201).json({ policy });
  } catch (err) {
    console.error('Error creating policy:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create policy' } });
  }
});

// =============================================================================
// PUT /api/policies/:id - Update policy
// =============================================================================

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { id } = req.params;
    const { label, policyData, isActive, priority } = req.body;

    // Check exists
    const existing = await pool.query('SELECT * FROM policies WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    }

    // Validate if policyData changed
    if (policyData) {
      const policyType = existing.rows[0].policy_type;
      const validation = validatePolicy({ ...policyData, policyType });
      if (!validation.success) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: 'Invalid policy data', details: validation.errors },
        });
      }
    }

    const updates: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (label !== undefined) { updates.push(`label = $${idx++}`); params.push(label); }
    if (policyData !== undefined) { updates.push(`policy_data = $${idx++}`); params.push(JSON.stringify(policyData)); }
    if (isActive !== undefined) { updates.push(`is_active = $${idx++}`); params.push(isActive); }
    if (priority !== undefined) { updates.push(`priority = $${idx++}`); params.push(priority); }

    updates.push(`updated_at = NOW()`);
    updates.push(`last_modified_by = $${idx++}`);
    params.push(user.name || user.email || 'system');
    params.push(id);

    const result = await pool.query(
      `UPDATE policies SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    const policy = mapRowToPolicy(result.rows[0]);
    broadcastEvent('facility', 'policy:updated', policy);

    res.json({ policy });
  } catch (err) {
    console.error('Error updating policy:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update policy' } });
  }
});

// =============================================================================
// DELETE /api/policies/:id - Delete policy
// =============================================================================

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM policies WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Policy not found' } });
    }

    broadcastEvent('facility', 'policy:deleted', { id });
    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error('Error deleting policy:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete policy' } });
  }
});

// =============================================================================
// POST /api/policies/check - Validate a scheduling action against policies
// =============================================================================

router.post('/check', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { doctorId, startTime, duration } = req.body;

    if (!doctorId || !startTime || !duration) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'doctorId, startTime, and duration are required' },
      });
    }

    const start = new Date(startTime);
    const dayOfWeek = start.getDay();
    const timeStr = start.toTimeString().slice(0, 5); // HH:MM
    const dateStr = start.toISOString().slice(0, 10); // YYYY-MM-DD

    // Get all active policies for this doctor
    const result = await pool.query(
      `SELECT * FROM policies WHERE doctor_id = $1 AND is_active = true ORDER BY priority DESC`,
      [doctorId]
    );

    const conflicts: any[] = [];
    let isValid = true;

    for (const row of result.rows) {
      const policy = mapRowToPolicy(row);
      const data = policy.policyData as any;

      switch (policy.policyType) {
        case 'AVAILABILITY': {
          // Check if the time falls within availability windows
          const days = data.recurrence?.daysOfWeek || [];
          if (days.length > 0 && !days.includes(dayOfWeek)) {
            conflicts.push({
              policyId: policy.id,
              policyType: 'AVAILABILITY',
              policyLabel: policy.label,
              severity: 'error',
              reason: `Doctor is not available on this day`,
              canOverride: false,
            });
            isValid = false;
          }
          const windows = data.timeWindows || [];
          const inWindow = windows.some((w: any) => timeStr >= w.start && timeStr < w.end);
          if (windows.length > 0 && !inWindow) {
            conflicts.push({
              policyId: policy.id,
              policyType: 'AVAILABILITY',
              policyLabel: policy.label,
              severity: 'error',
              reason: `Time ${timeStr} is outside working hours (${windows.map((w: any) => `${w.start}-${w.end}`).join(', ')})`,
              canOverride: false,
            });
            isValid = false;
          }
          break;
        }
        case 'BLOCK': {
          const windows = data.timeWindows || [];
          const blocked = windows.some((w: any) => timeStr >= w.start && timeStr < w.end);
          if (blocked) {
            conflicts.push({
              policyId: policy.id,
              policyType: 'BLOCK',
              policyLabel: policy.label,
              severity: 'error',
              reason: `Time is blocked: ${data.reason || 'blocked period'}`,
              canOverride: data.allowOverride || false,
            });
            isValid = false;
          }
          break;
        }
        case 'OVERRIDE': {
          if (data.date === dateStr && data.action === 'block') {
            const windows = data.timeWindows || [];
            const blocked = windows.some((w: any) => timeStr >= w.start && timeStr < w.end);
            if (blocked) {
              conflicts.push({
                policyId: policy.id,
                policyType: 'OVERRIDE',
                policyLabel: policy.label,
                severity: 'error',
                reason: `Override: ${data.reason || 'blocked'}`,
                canOverride: false,
              });
              isValid = false;
            }
          }
          break;
        }
        case 'CAPACITY': {
          // Check daily capacity
          if (data.maxAppointmentsPerDay) {
            const countResult = await pool.query(
              `SELECT COUNT(*) FROM appointments 
               WHERE doctor_id = $1 AND DATE(start_time) = DATE($2) AND status = 'scheduled'`,
              [doctorId, start]
            );
            const count = parseInt(countResult.rows[0].count);
            if (count >= data.maxAppointmentsPerDay) {
              conflicts.push({
                policyId: policy.id,
                policyType: 'CAPACITY',
                policyLabel: policy.label,
                severity: 'warning',
                reason: `Daily capacity reached (${count}/${data.maxAppointmentsPerDay})`,
                canOverride: true,
              });
            }
          }
          break;
        }
        case 'BOOKING_WINDOW': {
          const now = new Date();
          const hoursUntil = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (data.minAdvanceHours && hoursUntil < data.minAdvanceHours) {
            conflicts.push({
              policyId: policy.id,
              policyType: 'BOOKING_WINDOW',
              policyLabel: policy.label,
              severity: 'warning',
              reason: `Minimum ${data.minAdvanceHours}h advance booking required`,
              canOverride: true,
            });
          }
          break;
        }
      }
    }

    res.json({
      valid: isValid && conflicts.filter(c => c.severity === 'error').length === 0,
      conflicts,
      reasoning: conflicts.length === 0
        ? 'No policy conflicts found'
        : `Found ${conflicts.length} conflict(s)`,
    });
  } catch (err) {
    console.error('Error checking policies:', err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to check policies' } });
  }
});

// =============================================================================
// Helpers
// =============================================================================

function mapRowToPolicy(row: any): Policy {
  return {
    id: row.id,
    doctorId: row.doctor_id,
    policyType: row.policy_type as PolicyType,
    label: row.label,
    policyData: row.policy_data,
    isActive: row.is_active,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    lastModifiedBy: row.last_modified_by,
  };
}

export default router;
