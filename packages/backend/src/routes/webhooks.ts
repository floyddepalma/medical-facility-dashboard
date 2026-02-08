/**
 * Webhook Routes
 * 
 * Handles incoming webhooks from:
 * - OpenCV Monitor (vision events)
 * - Open CLAW Agent (task/action creation)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../db/connection';
import { broadcastEvent } from '../services/websocket-server';

const router = Router();

// =============================================================================
// Middleware: API Key Validation
// =============================================================================

const validateOpenCVKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-opencv-api-key'];
  if (apiKey !== process.env.OPENCV_API_KEY) {
    return res.status(401).json({ 
      error: { 
        code: 'AUTH_INVALID', 
        message: 'Invalid OpenCV API key' 
      } 
    });
  }
  next();
};

const validateClawKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-claw-api-key'];
  if (apiKey !== process.env.CLAW_API_KEY) {
    return res.status(401).json({ 
      error: { 
        code: 'AUTH_INVALID', 
        message: 'Invalid CLAW API key' 
      } 
    });
  }
  next();
};

// =============================================================================
// OpenCV Vision Event Webhook
// =============================================================================

interface VisionEvent {
  timestamp: string;
  eventType: 'room_occupancy' | 'equipment_status' | 'patient_arrival' | 'patient_departure';
  entityType: 'room' | 'equipment' | 'patient';
  entityId: string;
  data: {
    occupied?: boolean;
    doctorId?: string;
    status?: 'operational' | 'in_use' | 'needs_maintenance' | 'offline';
    patientStatus?: 'waiting' | 'in_examination' | 'in_treatment' | 'checking_out';
  };
  confidence: number;
  cameraId: string;
}

router.post('/opencv/event', validateOpenCVKey, async (req: Request, res: Response) => {
  const event: VisionEvent = req.body;
  const { timestamp, eventType, entityType, entityId, data, confidence, cameraId } = event;

  // Validate confidence threshold
  if (confidence < 0.8) {
    return res.json({ 
      success: true, 
      processed: false, 
      message: 'Confidence too low',
      eventId: `evt_${Date.now()}`
    });
  }

  try {
    // Handle room occupancy events
    if (eventType === 'room_occupancy' && entityType === 'room') {
      const newStatus = data.occupied ? 'occupied' : 'available';
      
      const result = await pool.query(
        `UPDATE rooms 
         SET status = $1, current_doctor_id = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [newStatus, data.doctorId || null, entityId]
      );

      // Broadcast via WebSocket
      broadcastEvent('facility', 'room:updated', result.rows[0]);

      console.log(`[OpenCV] Room ${entityId} → ${newStatus}`);
    }

    // Handle equipment status events
    if (eventType === 'equipment_status' && entityType === 'equipment') {
      const result = await pool.query(
        `UPDATE equipment 
         SET status = $1, updated_at = NOW() 
         WHERE id = $2
         RETURNING *`,
        [data.status, entityId]
      );

      // Broadcast via WebSocket
      broadcastEvent('facility', 'equipment:updated', result.rows[0]);

      // Create action item if equipment needs attention
      if (data.status === 'needs_maintenance' || data.status === 'offline') {
        const actionResult = await pool.query(
          `INSERT INTO action_items (type, urgency, title, description, status, created_by, equipment_id, created_at, time_waiting)
           VALUES ('equipment_issue', 'urgent', $1, $2, 'pending', 'opencv', $3, NOW(), 0)
           RETURNING *`,
          [
            `Equipment ${entityId} needs attention`,
            `Status changed to ${data.status} via computer vision monitoring`,
            entityId
          ]
        );

        // Broadcast new action item
        broadcastEvent('actions', 'action:created', actionResult.rows[0]);

        console.log(`[OpenCV] Created action item for equipment ${entityId}`);
      }

      console.log(`[OpenCV] Equipment ${entityId} → ${data.status}`);
    }

    // Handle patient arrival/departure events
    if (eventType === 'patient_arrival' || eventType === 'patient_departure') {
      // TODO: Update patient counts in facility status
      console.log(`[OpenCV] Patient event: ${eventType}`);
    }

    res.json({ 
      success: true, 
      processed: true, 
      eventId: `evt_${Date.now()}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[OpenCV] Error processing vision event:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Processing error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// CLAW Task Creation Webhook
// =============================================================================

interface ClawTaskCreation {
  type: string;
  description: string;
  priority: 'urgent' | 'normal' | 'low';
  assignee: 'staff' | 'agent';
  doctorId?: string;
  roomId?: string;
  equipmentId?: string;
  estimatedDuration?: number;
  reasoning: string;
}

router.post('/claw/task', validateClawKey, async (req: Request, res: Response) => {
  const task: ClawTaskCreation = req.body;
  const { type, description, priority, assignee, doctorId, roomId, equipmentId, reasoning } = task;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (
        type, description, priority, assignee, doctor_id, room_id, equipment_id, 
        status, created_by, notes, created_at, start_time
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'agent', $8, NOW(), NULL)
       RETURNING *`,
      [
        type, 
        description, 
        priority, 
        assignee, 
        doctorId || null, 
        roomId || null, 
        equipmentId || null,
        JSON.stringify([{ 
          text: reasoning, 
          timestamp: new Date().toISOString(), 
          author: 'agent' 
        }])
      ]
    );

    const createdTask = result.rows[0];

    // Broadcast via WebSocket
    broadcastEvent('tasks', 'task:created', createdTask);

    console.log(`[CLAW] Created task: ${type} (${priority})`);

    res.json({ 
      success: true, 
      taskId: createdTask.id, 
      createdAt: createdTask.created_at 
    });

  } catch (error) {
    console.error('[CLAW] Error creating task:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Task creation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// CLAW Action Item Creation Webhook
// =============================================================================

interface ClawActionCreation {
  type: 'policy_conflict' | 'equipment_issue' | 'agent_request' | 'escalation';
  urgency: 'urgent' | 'normal' | 'low';
  title: string;
  description: string;
  context: Record<string, any>;
  reasoning: string;
  suggestedActions?: string[];
  doctorId?: string;
  roomId?: string;
  equipmentId?: string;
}

router.post('/claw/action', validateClawKey, async (req: Request, res: Response) => {
  const action: ClawActionCreation = req.body;
  const { type, urgency, title, description, context, reasoning, doctorId, roomId, equipmentId } = action;

  try {
    // Merge context and reasoning
    const fullContext = {
      ...context,
      reasoning,
      suggestedActions: action.suggestedActions || []
    };

    const result = await pool.query(
      `INSERT INTO action_items (
        type, urgency, title, description, context, doctor_id, room_id, equipment_id,
        status, created_by, created_at, time_waiting
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'agent', NOW(), 0)
       RETURNING *`,
      [
        type,
        urgency,
        title,
        description,
        JSON.stringify(fullContext),
        doctorId || null,
        roomId || null,
        equipmentId || null
      ]
    );

    const createdAction = result.rows[0];

    // Broadcast via WebSocket
    broadcastEvent('actions', 'action:created', createdAction);

    console.log(`[CLAW] Created action item: ${title} (${urgency})`);

    res.json({ 
      success: true, 
      actionId: createdAction.id, 
      createdAt: createdAction.created_at 
    });

  } catch (error) {
    console.error('[CLAW] Error creating action item:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Action creation failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// =============================================================================
// CLAW Policy Query Webhook (for Cara agent to check scheduling policies)
// =============================================================================

router.get('/claw/policies', validateClawKey, async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.query;

    let query = `
      SELECT p.*, d.name as doctor_name
      FROM policies p
      JOIN doctors d ON p.doctor_id = d.id
      WHERE p.is_active = true
    `;
    const params: any[] = [];

    if (doctorId) {
      query += ' AND p.doctor_id = $1';
      params.push(doctorId);
    }

    query += ' ORDER BY p.priority DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      policies: result.rows.map(row => ({
        id: row.id,
        doctorId: row.doctor_id,
        doctorName: row.doctor_name,
        policyType: row.policy_type,
        label: row.label,
        policyData: row.policy_data,
        isActive: row.is_active,
        priority: row.priority,
      })),
    });
  } catch (error) {
    console.error('[CLAW] Error fetching policies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch policies' });
  }
});

// =============================================================================
// CLAW Calendar Query Webhook (for Cara agent to check appointments)
// =============================================================================

router.get('/claw/calendar', validateClawKey, async (req: Request, res: Response) => {
  try {
    const { doctorId, date } = req.query;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'doctorId is required' });
    }

    // Default to today if no date provided
    const targetDate = date ? `'${date}'::date` : 'CURRENT_DATE';

    // Timezone offset for display (CT = UTC-6)
    const TZ_OFFSET = 6;

    const [appointments, timeBlocks, doctor] = await Promise.all([
      pool.query(
        `SELECT id, patient_name, appointment_type, start_time, end_time, duration, status, notes
         FROM appointments
         WHERE doctor_id = $1
           AND DATE(start_time) = ${targetDate}
         ORDER BY start_time ASC`,
        [doctorId]
      ),
      pool.query(
        `SELECT id, start_time, end_time, reason, description
         FROM time_blocks
         WHERE doctor_id = $1
           AND DATE(start_time) = ${targetDate}
         ORDER BY start_time ASC`,
        [doctorId]
      ),
      pool.query(
        `SELECT name FROM doctors WHERE id = $1`,
        [doctorId]
      ),
    ]);

    // Format helper for times
    const formatTime = (isoStr: string) => {
      const d = new Date(isoStr);
      const local = new Date(d.getTime() - TZ_OFFSET * 60 * 60 * 1000);
      const h = local.getUTCHours();
      const m = local.getUTCMinutes();
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    };

    // Build Telegram-friendly formatted text
    const lines: string[] = [];
    const doctorName = doctor.rows[0]?.name || 'Doctor';
    
    lines.push(`📅 *${doctorName}'s Schedule*`);
    lines.push(`${date || 'Today'}`);
    lines.push(''); // Extra padding after header

    if (appointments.rows.length === 0 && timeBlocks.rows.length === 0) {
      lines.push('_No appointments or blocks scheduled_');
    } else {
      // Merge appointments and blocks, sort by time
      const allItems = [
        ...appointments.rows.map((a: any) => ({ ...a, itemType: 'appointment' })),
        ...timeBlocks.rows.map((b: any) => ({ ...b, itemType: 'block' })),
      ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      for (const item of allItems) {
        const startTime = formatTime(item.start_time);
        
        if (item.itemType === 'appointment') {
          const icon = item.status === 'scheduled' ? '🕐' : 
                      item.status === 'completed' ? '✅' : 
                      item.status === 'cancelled' ? '❌' : '📋';
          const urgentTag = item.appointment_type?.toLowerCase().includes('urgent') ? ' 🔴' : '';
          
          lines.push(`${icon} *${startTime}* — ${item.patient_name} — ${item.appointment_type} (${item.duration} min)${urgentTag}`);
        } else {
          const endTime = formatTime(item.end_time);
          const icon = item.reason === 'lunch' ? '🍽️' : 
                      item.reason === 'meeting' ? '👥' : 
                      item.reason === 'admin' ? '📋' : '🚫';
          const desc = item.description || item.reason;
          
          lines.push(`${icon} *${startTime}-${endTime}* — ${desc}`);
        }
        lines.push(''); // Blank line between items
      }
    }

    const formattedText = lines.join('\n');

    res.json({
      success: true,
      doctorId,
      date: date || 'today',
      formattedSchedule: formattedText,
      appointments: appointments.rows,
      timeBlocks: timeBlocks.rows,
    });
  } catch (error) {
    console.error('[CLAW] Error fetching calendar:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch calendar' });
  }
});

// =============================================================================
// CLAW Doctors Query Webhook (for Cara agent to look up doctors)
// =============================================================================

router.get('/claw/doctors', validateClawKey, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT id, name, specialization FROM doctors WHERE active = true ORDER BY name`
    );
    res.json({ success: true, doctors: result.rows });
  } catch (error) {
    console.error('[CLAW] Error fetching doctors:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch doctors' });
  }
});

// =============================================================================
// CLAW Morning Briefing (daily schedule + action items + facility status)
// =============================================================================

router.get('/claw/briefing', validateClawKey, async (req: Request, res: Response) => {
  try {
    const { doctorId } = req.query;

    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'doctorId is required' });
    }

    // Timezone offset for display (CT = UTC-6)
    const TZ_OFFSET = 6;

    // Get doctor info
    const doctorResult = await pool.query(
      'SELECT id, name, specialization FROM doctors WHERE id = $1 AND active = true',
      [doctorId]
    );
    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }
    const doctor = doctorResult.rows[0];

    // Get today's appointments
    const appointmentsResult = await pool.query(
      `SELECT patient_name, appointment_type, start_time, end_time, duration, status, notes
       FROM appointments
       WHERE doctor_id = $1 AND DATE(start_time) = CURRENT_DATE AND status = 'scheduled'
       ORDER BY start_time ASC`,
      [doctorId]
    );

    // Get today's time blocks
    const blocksResult = await pool.query(
      `SELECT start_time, end_time, reason, description
       FROM time_blocks
       WHERE doctor_id = $1 AND DATE(start_time) = CURRENT_DATE
       ORDER BY start_time ASC`,
      [doctorId]
    );

    // Get pending action items for this doctor (only doctor-relevant types)
    const actionsResult = await pool.query(
      `SELECT title, description, urgency, type, created_at
       FROM action_items
       WHERE (doctor_id = $1 OR doctor_id IS NULL) 
         AND status = 'pending'
         AND type IN ('policy_conflict', 'agent_request')
       ORDER BY CASE urgency WHEN 'urgent' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END, created_at DESC
       LIMIT 10`,
      [doctorId]
    );

    // Get pending tasks
    const tasksResult = await pool.query(
      `SELECT type, description, assignee, status
       FROM tasks
       WHERE (doctor_id = $1 OR doctor_id IS NULL) AND status IN ('pending', 'in_progress')
       ORDER BY start_time DESC
       LIMIT 10`,
      [doctorId]
    );

    // Get equipment issues
    const equipmentResult = await pool.query(
      `SELECT name, type, status FROM equipment WHERE status != 'operational'`
    );

    // Get room status
    const roomsResult = await pool.query(
      `SELECT name, type, status FROM rooms ORDER BY name`
    );

    // Format helper for times
    const formatTime = (isoStr: string) => {
      const d = new Date(isoStr);
      // Subtract TZ offset to get local time display
      const local = new Date(d.getTime() - TZ_OFFSET * 60 * 60 * 1000);
      const h = local.getUTCHours();
      const m = local.getUTCMinutes();
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    };

    // Build Telegram-friendly briefing
    const lines: string[] = [];
    lines.push(`☀️ *Good morning, ${doctor.name}!*\n`);

    // Schedule section
    lines.push(`📅 *TODAY'S SCHEDULE*`);
    lines.push(''); // Extra padding after header
    
    if (appointmentsResult.rows.length === 0 && blocksResult.rows.length === 0) {
      lines.push('_No appointments scheduled_\n');
    } else {
      // Merge appointments and blocks
      const allItems = [
        ...appointmentsResult.rows.map((a: any) => ({ ...a, itemType: 'appointment' })),
        ...blocksResult.rows.map((b: any) => ({ ...b, itemType: 'block' })),
      ].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

      for (const item of allItems) {
        const startTime = formatTime(item.start_time);
        
        if (item.itemType === 'appointment') {
          const urgentTag = item.appointment_type?.toLowerCase().includes('urgent') ? ' 🔴' : '';
          lines.push(`🕐 *${startTime}* — ${item.patient_name} — ${item.appointment_type} (${item.duration} min)${urgentTag}`);
        } else {
          const endTime = formatTime(item.end_time);
          const icon = item.reason === 'lunch' ? '🍽️' : item.reason === 'meeting' ? '👥' : '📋';
          lines.push(`${icon} *${startTime}-${endTime}* — ${item.description || item.reason}`);
        }
        lines.push(''); // Blank line between items
      }
      lines.push('');
    }

    // Action items needing attention
    if (actionsResult.rows.length > 0) {
      lines.push(`⚡ *ACTION ITEMS* (${actionsResult.rows.length})`);
      for (const action of actionsResult.rows) {
        const icon = action.urgency === 'urgent' ? '🔴' : action.urgency === 'normal' ? '🟡' : '🟢';
        lines.push(`${icon} ${action.title}`);
      }
      lines.push('');
    }

    // Equipment issues
    if (equipmentResult.rows.length > 0) {
      lines.push(`🔧 *EQUIPMENT ALERTS*`);
      for (const eq of equipmentResult.rows) {
        lines.push(`⚠️ ${eq.name} — ${eq.status}`);
      }
      lines.push('');
    }

    // Facility status
    const availableRooms = roomsResult.rows.filter((r: any) => r.status === 'available').length;
    const totalRooms = roomsResult.rows.length;
    lines.push(`🏥 *FACILITY STATUS*`);
    lines.push(`Rooms: ${availableRooms}/${totalRooms} available`);

    lines.push(`\n_Have a great day!_ 💪`);

    const briefingText = lines.join('\n');

    res.json({
      success: true,
      doctorId: doctor.id,
      doctorName: doctor.name,
      date: new Date().toISOString().slice(0, 10),
      briefing: briefingText,
      data: {
        appointmentCount: appointmentsResult.rows.length,
        appointments: appointmentsResult.rows,
        timeBlocks: blocksResult.rows,
        actionItems: actionsResult.rows,
        activeTasks: tasksResult.rows,
        equipmentIssues: equipmentResult.rows,
        roomsAvailable: availableRooms,
        roomsTotal: totalRooms,
      },
    });
  } catch (error) {
    console.error('[CLAW] Error generating briefing:', error);
    res.status(500).json({ success: false, message: 'Failed to generate briefing' });
  }
});

// =============================================================================
// Health Check
// =============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    webhooks: {
      opencv: '/api/webhooks/opencv/event',
      clawTask: '/api/webhooks/claw/task',
      clawAction: '/api/webhooks/claw/action',
      clawPolicies: '/api/webhooks/claw/policies',
      clawCalendar: '/api/webhooks/claw/calendar',
      clawDoctors: '/api/webhooks/claw/doctors',
      clawBriefing: '/api/webhooks/claw/briefing',
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
