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
// Health Check
// =============================================================================

router.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy',
    webhooks: {
      opencv: '/api/webhooks/opencv/event',
      clawTask: '/api/webhooks/claw/task',
      clawAction: '/api/webhooks/claw/action'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;
