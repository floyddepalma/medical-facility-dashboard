import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateParams } from '../middleware/validation';
import { asyncHandler, AppError } from '../utils/error-handler';
import { Doctor } from '../types';

const router = Router();

// GET /api/doctors
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    let query = 'SELECT * FROM doctors WHERE active = true';
    const params: any[] = [];

    // Filter based on user role
    if (req.user!.role === 'doctor') {
      // Doctors can only see themselves
      query += ' AND id = $1';
      params.push(req.user!.doctorId);
    } else if (req.user!.role === 'medical_assistant') {
      // Medical assistants see their managed doctors
      if (req.user!.managedDoctorIds && req.user!.managedDoctorIds.length > 0) {
        query += ' AND id = ANY($1::uuid[])';
        params.push(req.user!.managedDoctorIds);
      } else {
        // No managed doctors
        return res.json({ doctors: [] });
      }
    }
    // Admins see all doctors (no filter)

    query += ' ORDER BY name';

    const result = await pool.query(query, params);

    const doctors: Doctor[] = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      specialization: row.specialization,
      active: row.active,
    }));

    res.json({ doctors });
  })
);

// GET /api/doctors/:id
router.get(
  '/:id',
  authenticateToken,
  validateParams(z.object({ id: z.string().uuid() })),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;

    // Check access
    if (req.user!.role === 'doctor' && req.user!.doctorId !== id) {
      throw new AppError('PERMISSION_DENIED', 'Access denied to this doctor', 403);
    }

    if (
      req.user!.role === 'medical_assistant' &&
      !req.user!.managedDoctorIds?.includes(id)
    ) {
      throw new AppError('PERMISSION_DENIED', 'Access denied to this doctor', 403);
    }

    const result = await pool.query('SELECT * FROM doctors WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Doctor not found', 404);
    }

    const doctor: Doctor = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      specialization: result.rows[0].specialization,
      active: result.rows[0].active,
    };

    res.json({ doctor });
  })
);

export default router;
