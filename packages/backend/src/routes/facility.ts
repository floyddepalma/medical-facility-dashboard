import { Router, Response } from 'express';
import { z } from 'zod';
import { pool, getRedisClient } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validation';
import { asyncHandler, AppError } from '../utils/error-handler';
import { FacilityStatus, Room, Equipment } from '../types';
import { broadcastEvent } from '../services/websocket-server';

const router = Router();

const CACHE_TTL = parseInt(process.env.CACHE_TTL || '10');

// GET /api/facility/status
router.get(
  '/status',
  authenticateToken,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const redis = await getRedisClient();
    
    // Try cache first (if Redis available)
    if (redis) {
      const cached = await redis.get('facility:status');
      if (cached) {
        res.json(JSON.parse(cached));
        return;
      }
    }

    // Calculate facility status
    const status = await calculateFacilityStatus();

    // Cache the result (if Redis available)
    if (redis) {
      await redis.setEx('facility:status', CACHE_TTL, JSON.stringify(status));
    }

    res.json(status);
  })
);

// GET /api/rooms
router.get(
  '/rooms',
  authenticateToken,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { status, currentDoctorId, currentPatientId, estimatedAvailableAt } = req.body;

    // Get current room status before update
    const currentRoom = await pool.query('SELECT status FROM rooms WHERE id = $1', [id]);
    const previousStatus = currentRoom.rows[0]?.status;

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

    // Track room utilization sessions
    if (previousStatus !== status) {
      if (status === 'occupied' && previousStatus !== 'occupied') {
        // Room became occupied - start a new session
        await pool.query(
          `INSERT INTO room_utilization (room_id, started_at, source)
           VALUES ($1, NOW(), 'vision')`,
          [id]
        );
      } else if (previousStatus === 'occupied' && status !== 'occupied') {
        // Room became available - end the current session
        await pool.query(
          `UPDATE room_utilization 
           SET ended_at = NOW(),
               duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
           WHERE room_id = $1 AND ended_at IS NULL`,
          [id]
        );
      }
    }

    // Invalidate cache
    const redis = await getRedisClient();
    if (redis) {
      await redis.del('facility:status');
    }

    // Broadcast update via WebSocket
    broadcastEvent('facility', 'room:updated', result.rows[0]);

    res.json({ room: result.rows[0] });
  })
);

// =============================================================================
// Room Utilization Analytics
// =============================================================================

// GET /api/facility/utilization - Get room utilization stats
router.get(
  '/utilization',
  authenticateToken,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    // Get today's utilization per room
    const todayStats = await pool.query(`
      SELECT 
        r.id as room_id,
        r.name as room_name,
        r.type as room_type,
        r.status as current_status,
        COALESCE(SUM(ru.duration_seconds), 0) as total_seconds_today,
        COUNT(ru.id) as session_count_today,
        COALESCE(AVG(ru.duration_seconds), 0) as avg_session_seconds
      FROM rooms r
      LEFT JOIN room_utilization ru ON r.id = ru.room_id 
        AND DATE(ru.started_at) = CURRENT_DATE
        AND ru.ended_at IS NOT NULL
      GROUP BY r.id, r.name, r.type, r.status
      ORDER BY r.name
    `);

    // Get current active sessions (rooms currently occupied)
    const activeSessions = await pool.query(`
      SELECT 
        room_id,
        started_at,
        EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER as current_duration_seconds
      FROM room_utilization
      WHERE ended_at IS NULL
    `);

    // Get hourly breakdown for today (for peak hours chart)
    const hourlyStats = await pool.query(`
      SELECT 
        EXTRACT(HOUR FROM started_at)::INTEGER as hour,
        COUNT(*) as session_count,
        SUM(duration_seconds) as total_seconds
      FROM room_utilization
      WHERE DATE(started_at) = CURRENT_DATE
        AND ended_at IS NOT NULL
      GROUP BY EXTRACT(HOUR FROM started_at)
      ORDER BY hour
    `);

    // Get hourly breakdown BY ROOM for stacked chart
    const hourlyByRoom = await pool.query(`
      SELECT 
        r.id as room_id,
        r.name as room_name,
        EXTRACT(HOUR FROM ru.started_at)::INTEGER as hour,
        COUNT(*) as session_count,
        SUM(ru.duration_seconds) as total_seconds
      FROM room_utilization ru
      JOIN rooms r ON r.id = ru.room_id
      WHERE DATE(ru.started_at) = CURRENT_DATE
        AND ru.ended_at IS NOT NULL
      GROUP BY r.id, r.name, EXTRACT(HOUR FROM ru.started_at)
      ORDER BY r.name, hour
    `);

    // Get AVERAGE hourly utilization across all historical days (for the background bars)
    const avgHourlyStats = await pool.query(`
      SELECT hour, ROUND(AVG(total_minutes))::INTEGER as avg_minutes, ROUND(AVG(session_count))::INTEGER as avg_sessions
      FROM (
        SELECT DATE(started_at) as day,
               EXTRACT(HOUR FROM started_at)::INTEGER as hour,
               SUM(duration_seconds) / 60.0 as total_minutes,
               COUNT(*) as session_count
        FROM room_utilization
        WHERE ended_at IS NOT NULL
        GROUP BY DATE(started_at), EXTRACT(HOUR FROM started_at)
      ) daily_hours
      GROUP BY hour
      ORDER BY hour
    `);

    // Build active sessions map
    const activeSessionsMap: Record<string, { startedAt: string; currentDuration: number }> = {};
    for (const session of activeSessions.rows) {
      activeSessionsMap[session.room_id] = {
        startedAt: session.started_at,
        currentDuration: session.current_duration_seconds
      };
    }

    // Build hourly data (fill in missing hours with 0)
    const hourlyData: { hour: number; sessions: number; minutes: number }[] = [];
    const avgHourlyData: { hour: number; avgSessions: number; avgMinutes: number }[] = [];
    for (let h = 0; h < 24; h++) {
      const hourData = hourlyStats.rows.find((r: any) => r.hour === h);
      hourlyData.push({
        hour: h,
        sessions: hourData ? parseInt(hourData.session_count) : 0,
        minutes: hourData ? Math.round(parseInt(hourData.total_seconds) / 60) : 0
      });
      
      const avgData = avgHourlyStats.rows.find((r: any) => r.hour === h);
      avgHourlyData.push({
        hour: h,
        avgSessions: avgData ? parseInt(avgData.avg_sessions) : 0,
        avgMinutes: avgData ? parseInt(avgData.avg_minutes) : 0
      });
    }

    // Build per-room hourly data for stacked chart
    const roomColors: Record<string, string> = {};
    const colorPalette = ['#0f4c75', '#6b9080', '#e07a3a', '#9b59b6', '#3498db'];
    let colorIndex = 0;
    
    // Get unique rooms and assign colors
    const uniqueRooms = [...new Set(hourlyByRoom.rows.map((r: any) => r.room_id))];
    for (const roomId of uniqueRooms) {
      roomColors[roomId as string] = colorPalette[colorIndex % colorPalette.length];
      colorIndex++;
    }

    // Build hourly by room structure
    const hourlyByRoomData: Record<number, Array<{ roomId: string; roomName: string; minutes: number; sessions: number; color: string }>> = {};
    for (let h = 0; h < 24; h++) {
      hourlyByRoomData[h] = [];
    }
    for (const row of hourlyByRoom.rows) {
      hourlyByRoomData[row.hour].push({
        roomId: row.room_id,
        roomName: row.room_name,
        minutes: Math.round(parseInt(row.total_seconds) / 60),
        sessions: parseInt(row.session_count),
        color: roomColors[row.room_id]
      });
    }

    // Calculate peak hour (only consider business hours 7am-7pm with actual activity)
    const businessHourData = hourlyData.filter(h => h.hour >= 7 && h.hour <= 19 && h.sessions > 0);
    const peakHour = businessHourData.length > 0
      ? businessHourData.reduce((max, curr) => curr.sessions > max.sessions ? curr : max)
      : { hour: 14, sessions: 0 }; // Default to 2pm if no data

    // Format hour in 12-hour time
    const formatHour = (hour: number): string => {
      if (hour === 0) return '12am';
      if (hour < 12) return `${hour}am`;
      if (hour === 12) return '12pm';
      return `${hour - 12}pm`;
    };

    res.json({
      rooms: todayStats.rows.map((row: any) => ({
        roomId: row.room_id,
        roomName: row.room_name,
        roomType: row.room_type,
        currentStatus: row.current_status,
        todayTotalSeconds: parseInt(row.total_seconds_today),
        todaySessionCount: parseInt(row.session_count_today),
        avgSessionSeconds: Math.round(parseFloat(row.avg_session_seconds)),
        activeSession: activeSessionsMap[row.room_id] || null,
        color: roomColors[row.room_id] || colorPalette[0]
      })),
      hourlyBreakdown: hourlyData,
      avgHourlyBreakdown: avgHourlyData,
      hourlyByRoom: hourlyByRoomData,
      roomColors,
      peakHour: {
        hour: peakHour.hour,
        sessions: peakHour.sessions,
        label: `${formatHour(peakHour.hour)} - ${formatHour(peakHour.hour + 1)}`
      },
      generatedAt: new Date().toISOString()
    });
  })
);

// GET /api/facility/utilization/history - Get historical utilization (last 7 days)
router.get(
  '/utilization/history',
  authenticateToken,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    const dailyStats = await pool.query(`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as session_count,
        SUM(duration_seconds) as total_seconds,
        AVG(duration_seconds) as avg_session_seconds
      FROM room_utilization
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND ended_at IS NOT NULL
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `);

    res.json({
      daily: dailyStats.rows.map((row: any) => ({
        date: row.date,
        sessionCount: parseInt(row.session_count),
        totalMinutes: Math.round(parseInt(row.total_seconds) / 60),
        avgSessionMinutes: Math.round(parseFloat(row.avg_session_seconds) / 60)
      }))
    });
  })
);

// GET /api/equipment
router.get(
  '/equipment',
  authenticateToken,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
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
  asyncHandler(async (req: AuthRequest, res: Response) => {
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
      const actionResult = await pool.query(
        `INSERT INTO action_items (type, urgency, title, description, equipment_id, status, created_by, created_at, time_waiting)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), 0)
         RETURNING *`,
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

      // Broadcast new action item
      broadcastEvent('actions', 'action:created', actionResult.rows[0]);
    }

    // Invalidate cache (if Redis available)
    const redis = await getRedisClient();
    if (redis) {
      await redis.del('facility:status');
    }

    // Broadcast equipment update
    broadcastEvent('facility', 'equipment:updated', equipment);

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
