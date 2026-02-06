import { Router } from 'express';
import { z } from 'zod';
import { pool, getRedisClient } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { asyncHandler, AppError } from '../utils/error-handler';
import { FacilityStatus, Room, Equipment } from '../types';

const router = Router();

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '10');

// GET /api/facility/status
router.get(
  '/status',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const redis = await getRedisClient();
    
    // Try cache first
    const cached = await redis.get('facility:status');
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Calculate facility status
    const status = await calculateFacilityStatus();

    // Cache the result
    await redis.setEx('facility:status', CACHE_TTL, JSON.stringify(status));

    res.json(status);
  })
);

// GET /api/rooms
router.get(
  '/rooms',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await pool.query(
      `SELECT r.*, 
              json_agg(
                json_build_object(
                  'id', e.id,
                  'name', e.name,
                  'type', e.type,
                  'status', e.status
                )
              ) FILTER (WHERE e.id IS NOT NULL) as equipment
       FROM rooms r
       LEFT JOIN equipment e ON e.room_id = r.id
       GROUP BY r.id
       ORDER BY r.name`
    );

    const rooms: Room[] = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status,
      currentDoctorId: row.current_doctor_id,
      currentPatientId: row.current_patient_id,
      equipment: row.equipment || [],
      estimatedAvailableAt: row.estimated_available_at,
      lastUpdated: row.last_updated,
    }));

    res.json({ rooms });
  })
);

const updateRoomStatusSchema = z.object({
  status: z.enum(['available', 'occupied', 'needs_cleaning', 'maintenance']),
  currentDoctorId: z.string().uuid().optional(),
  currentPatientId: z.string().optional(),
  estimatedAvailableAt: z.string().datetime().optional(),
});

// PUT /api/rooms/:id/status
router.put(
  '/rooms/:id/status',
  authenticateToken,
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(updateRoomStatusSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { status, currentDoctorId, currentPatientId, estimatedAvailableAt } = req.body;

    const result = await pool.query(
      `UPDATE rooms 
       SET status = $1, 
           current_doctor_id = $2, 
           current_patient_id = $3,
           estimated_available_at = $4,
           last_updated = $5
       WHERE id = $6
       RETURNING *`,
      [status, currentDoctorId, currentPatientId, estimatedAvailableAt, new Date(), id]
    );

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Room not found', 404);
    }

    // Invalidate cache
    const redis = await getRedisClient();
    await redis.del('facility:status');

    // Broadcast update via WebSocket (will implement later)
    // broadcastRoomUpdate(result.rows[0]);

    res.json({ room: result.rows[0] });
  })
);

// GET /api/equipment
router.get(
  '/equipment',
  authenticateToken,
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await pool.query(
      `SELECT * FROM equipment ORDER BY name`
    );

    const equipment: Equipment[] = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      roomId: row.room_id,
      status: row.status,
      lastMaintenanceDate: row.last_maintenance_date,
      nextMaintenanceDate: row.next_maintenance_date,
    }));

    res.json({ equipment });
  })
);

const updateEquipmentSchema = z.object({
  status: z.enum(['operational', 'in_use', 'needs_maintenance', 'offline']).optional(),
  lastMaintenanceDate: z.string().date().optional(),
  nextMaintenanceDate: z.string().date().optional(),
});

// PUT /api/equipment/:id
router.put(
  '/equipment/:id',
  authenticateToken,
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(updateEquipmentSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, idx) => `${field} = $${idx + 1}`).join(', ');

    const result = await pool.query(
      `UPDATE equipment SET ${setClause} WHERE id = $${fields.length + 1} RETURNING *`,
      [...values, id]
    );

    if (result.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Equipment not found', 404);
    }

    const equipment = result.rows[0];

    // Create action item if equipment needs maintenance or is offline
    if (equipment.status === 'needs_maintenance' || equipment.status === 'offline') {
      await pool.query(
        `INSERT INTO action_items (type, urgency, title, description, equipment_id, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          'equipment_issue',
          equipment.status === 'offline' ? 'urgent' : 'normal',
          `Equipment ${equipment.name} requires attention`,
          `Equipment status: ${equipment.status}`,
          equipment.id,
          'pending',
          req.user!.id,
        ]
      );
    }

    // Invalidate cache
    const redis = await getRedisClient();
    await redis.del('facility:status');

    res.json({ equipment });
  })
);

async function calculateFacilityStatus(): Promise<FacilityStatus> {
  // Get room counts
  const roomsResult = await pool.query(`
    SELECT 
      type,
      status,
      COUNT(*) as count
    FROM rooms
    GROUP BY type, status
  `);

  const roomCounts: any = {
    examinationRooms: { total: 0, available: 0, occupied: 0, needsCleaning: 0 },
    treatmentRooms: { total: 0, available: 0, occupied: 0, needsCleaning: 0 },
  };

  for (const row of roomsResult.rows) {
    const key = row.type === 'examination' ? 'examinationRooms' : 'treatmentRooms';
    roomCounts[key].total += parseInt(row.count);
    
    if (row.status === 'available') roomCounts[key].available += parseInt(row.count);
    if (row.status === 'occupied') roomCounts[key].occupied += parseInt(row.count);
    if (row.status === 'needs_cleaning') roomCounts[key].needsCleaning += parseInt(row.count);
  }

  // Get equipment counts
  const equipmentResult = await pool.query(`
    SELECT status, COUNT(*) as count
    FROM equipment
    GROUP BY status
  `);

  const equipmentCounts: any = {
    operational: 0,
    inUse: 0,
    needsMaintenance: 0,
    offline: 0,
  };

  for (const row of equipmentResult.rows) {
    if (row.status === 'operational') equipmentCounts.operational = parseInt(row.count);
    if (row.status === 'in_use') equipmentCounts.inUse = parseInt(row.count);
    if (row.status === 'needs_maintenance') equipmentCounts.needsMaintenance = parseInt(row.count);
    if (row.status === 'offline') equipmentCounts.offline = parseInt(row.count);
  }

  // Get patient counts
  const patientResult = await pool.query(`
    SELECT status, COUNT(*) as count
    FROM patient_flow
    WHERE status != 'completed'
    GROUP BY status
  `);

  const patientCounts: any = {
    waiting: 0,
    inExamination: 0,
    inTreatment: 0,
    checkingOut: 0,
  };

  for (const row of patientResult.rows) {
    if (row.status === 'waiting') patientCounts.waiting = parseInt(row.count);
    if (row.status === 'in_examination') patientCounts.inExamination = parseInt(row.count);
    if (row.status === 'in_treatment') patientCounts.inTreatment = parseInt(row.count);
    if (row.status === 'checking_out') patientCounts.checkingOut = parseInt(row.count);
  }

  // Get action item counts
  const actionResult = await pool.query(`
    SELECT urgency, COUNT(*) as count
    FROM action_items
    WHERE status != 'completed'
    GROUP BY urgency
  `);

  const actionCounts: any = { urgent: 0, normal: 0, low: 0 };

  for (const row of actionResult.rows) {
    actionCounts[row.urgency] = parseInt(row.count);
  }

  return {
    timestamp: new Date(),
    operatingHours: {
      open: '08:00',
      close: '18:00',
    },
    patientCounts,
    roomSummary: roomCounts,
    equipmentSummary: equipmentCounts,
    actionItemCounts: actionCounts,
  };
}

export default router;
