# System Integration Design

## Overview

This document defines the technical design for integrating the Dashboard, Open CLAW Agent, CareSync MCP Server, and OpenCV Monitoring system into a unified medical facility management platform.

## Component Naming Convention

To maintain clarity across the codebase:

- **CareSync MCP** - The Model Context Protocol server for scheduling policies
- **CareSync Dashboard** - The web-based operational management interface
- **Open CLAW** - The autonomous AI agent
- **OpenCV Monitor** - The computer vision monitoring system

File naming:
- `caresync-mcp-client.ts` - MCP client implementation
- `claw-agent-client.ts` - Open CLAW client implementation
- `opencv-webhook-handler.ts` - OpenCV event handler

## API Contracts

### 1. OpenCV → Dashboard

**Endpoint:** `POST /api/webhooks/opencv/event`

**Authentication:** API Key in header `X-OpenCV-API-Key`

**Request Schema:**
```typescript
interface VisionEvent {
  timestamp: string;           // ISO 8601
  eventType: 'room_occupancy' | 'equipment_status' | 'patient_arrival' | 'patient_departure';
  entityType: 'room' | 'equipment' | 'patient';
  entityId: string;            // Room ID, Equipment ID, or Patient ID
  data: {
    // For room_occupancy
    occupied?: boolean;
    doctorId?: string;
    
    // For equipment_status
    status?: 'operational' | 'in_use' | 'needs_maintenance' | 'offline';
    
    // For patient events
    patientStatus?: 'waiting' | 'in_examination' | 'in_treatment' | 'checking_out';
  };
  confidence: number;          // 0.0 to 1.0
  cameraId: string;
}
```

**Response Schema:**
```typescript
interface VisionEventResponse {
  success: boolean;
  eventId: string;
  processed: boolean;
  message?: string;
}
```

**Example:**
```json
POST /api/webhooks/opencv/event
X-OpenCV-API-Key: opencv_key_123

{
  "timestamp": "2026-02-06T14:30:00Z",
  "eventType": "room_occupancy",
  "entityType": "room",
  "entityId": "room-3",
  "data": {
    "occupied": true,
    "doctorId": "doc-smith-123"
  },
  "confidence": 0.95,
  "cameraId": "cam-hallway-2"
}
```

### 2. Dashboard → Open CLAW

**Endpoint:** `POST /api/claw/facility-status`

**Authentication:** API Key in header `X-Dashboard-API-Key`

**Request Schema:**
```typescript
interface FacilityStatusUpdate {
  timestamp: string;
  facilityId: string;
  rooms: Array<{
    id: string;
    name: string;
    type: 'examination' | 'treatment';
    status: 'available' | 'occupied' | 'needs_cleaning' | 'maintenance';
    currentDoctorId?: string;
    estimatedAvailableAt?: string;
  }>;
  equipment: Array<{
    id: string;
    name: string;
    type: string;
    status: 'operational' | 'in_use' | 'needs_maintenance' | 'offline';
  }>;
  patients: {
    waiting: number;
    inExamination: number;
    inTreatment: number;
    checkingOut: number;
  };
  tasks: Array<{
    id: string;
    type: string;
    status: 'pending' | 'in_progress' | 'completed';
    assignee: string;
  }>;
  actionItems: Array<{
    id: string;
    type: string;
    urgency: 'urgent' | 'normal' | 'low';
    title: string;
  }>;
}
```

**Response Schema:**
```typescript
interface ClawAcknowledgment {
  success: boolean;
  receivedAt: string;
  actionsPlanned: number;
}
```

### 3. Open CLAW → Dashboard (Task Creation)

**Endpoint:** `POST /api/webhooks/claw/task`

**Authentication:** API Key in header `X-Claw-API-Key`

**Request Schema:**
```typescript
interface ClawTaskCreation {
  type: string;                // 'room_cleaning', 'equipment_check', etc.
  description: string;
  priority: 'urgent' | 'normal' | 'low';
  assignee: 'staff' | 'agent';
  doctorId?: string;
  roomId?: string;
  equipmentId?: string;
  estimatedDuration?: number;  // minutes
  reasoning: string;           // Why CLAW created this task
}
```

**Response Schema:**
```typescript
interface TaskCreationResponse {
  success: boolean;
  taskId: string;
  createdAt: string;
}
```

### 4. Open CLAW → Dashboard (Action Item Creation)

**Endpoint:** `POST /api/webhooks/claw/action`

**Authentication:** API Key in header `X-Claw-API-Key`

**Request Schema:**
```typescript
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
```

**Response Schema:**
```typescript
interface ActionCreationResponse {
  success: boolean;
  actionId: string;
  createdAt: string;
}
```

### 5. Dashboard → CareSync MCP

**Transport:** stdio (Model Context Protocol)

**MCP Tools:**

#### list_policies
```typescript
{
  name: "list_policies",
  description: "List all scheduling policies for a doctor",
  inputSchema: {
    type: "object",
    properties: {
      doctorId: { type: "string" },
      policyType: { 
        type: "string",
        enum: ["AVAILABILITY", "BLOCK", "OVERRIDE", "DURATION", "APPOINTMENT_TYPE", "BOOKING_WINDOW"]
      },
      active: { type: "boolean" }
    },
    required: ["doctorId"]
  }
}
```

#### check_scheduling
```typescript
{
  name: "check_scheduling",
  description: "Validate a scheduling action against policies",
  inputSchema: {
    type: "object",
    properties: {
      doctorId: { type: "string" },
      appointmentType: { type: "string" },
      startTime: { type: "string" },  // ISO 8601
      duration: { type: "number" }     // minutes
    },
    required: ["doctorId", "startTime", "duration"]
  }
}
```

#### create_policy
```typescript
{
  name: "create_policy",
  description: "Create a new scheduling policy",
  inputSchema: {
    type: "object",
    properties: {
      doctorId: { type: "string" },
      policyType: { type: "string" },
      config: { type: "object" },
      active: { type: "boolean" }
    },
    required: ["doctorId", "policyType", "config"]
  }
}
```

#### explain_policy
```typescript
{
  name: "explain_policy",
  description: "Get human-readable explanation of a policy",
  inputSchema: {
    type: "object",
    properties: {
      policyId: { type: "string" }
    },
    required: ["policyId"]
  }
}
```

## Implementation Files

### Backend Services

#### 1. `packages/backend/src/services/caresync-mcp-client.ts`

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class CareSyncMCPClient {
  private client: Client | null = null;
  private connected: boolean = false;

  async connect(): Promise<void> {
    const transport = new StdioClientTransport({
      command: process.env.CARESYNC_MCP_COMMAND || 'npx',
      args: (process.env.CARESYNC_MCP_ARGS || '-y,@caresync/mcp-server').split(','),
    });

    this.client = new Client({
      name: 'caresync-dashboard',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await this.client.connect(transport);
    this.connected = true;
    console.log('✓ Connected to CareSync MCP Server');
  }

  async listPolicies(doctorId: string, filters?: any): Promise<any[]> {
    if (!this.connected || !this.client) {
      throw new Error('CareSync MCP not connected');
    }
    
    const result = await this.client.callTool({
      name: 'list_policies',
      arguments: { doctorId, ...filters },
    });

    return JSON.parse(result.content[0].text);
  }

  async checkScheduling(action: any): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('CareSync MCP not connected');
    }
    
    const result = await this.client.callTool({
      name: 'check_scheduling',
      arguments: action,
    });

    return JSON.parse(result.content[0].text);
  }

  async createPolicy(policy: any): Promise<any> {
    if (!this.connected || !this.client) {
      throw new Error('CareSync MCP not connected');
    }
    
    const result = await this.client.callTool({
      name: 'create_policy',
      arguments: policy,
    });

    return JSON.parse(result.content[0].text);
  }

  async explainPolicy(policyId: string): Promise<string> {
    if (!this.connected || !this.client) {
      throw new Error('CareSync MCP not connected');
    }
    
    const result = await this.client.callTool({
      name: 'explain_policy',
      arguments: { policyId },
    });

    return result.content[0].text;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const careSyncMCP = new CareSyncMCPClient();
```

#### 2. `packages/backend/src/services/claw-agent-client.ts`

```typescript
import axios, { AxiosInstance } from 'axios';

export class ClawAgentClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.CLAW_AGENT_URL || 'http://localhost:8000';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${process.env.CLAW_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 5000,
    });
  }

  async sendFacilityStatus(status: any): Promise<void> {
    try {
      await this.client.post('/facility-status', status);
    } catch (error) {
      console.error('Failed to send facility status to CLAW:', error);
      throw error;
    }
  }

  async getRecommendation(context: string): Promise<string> {
    const response = await this.client.post('/query', { context });
    return response.data.recommendation;
  }

  async ping(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  async getStatus(): Promise<any> {
    const response = await this.client.get('/status');
    return response.data;
  }
}

export const clawAgent = new ClawAgentClient();
```

#### 3. `packages/backend/src/routes/webhooks.ts`

```typescript
import { Router } from 'express';
import { pool } from '../db/connection';
import { broadcastEvent } from '../services/websocket-server';

const router = Router();

// Middleware to validate API keys
const validateOpenCVKey = (req, res, next) => {
  const apiKey = req.headers['x-opencv-api-key'];
  if (apiKey !== process.env.OPENCV_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

const validateClawKey = (req, res, next) => {
  const apiKey = req.headers['x-claw-api-key'];
  if (apiKey !== process.env.CLAW_API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
};

// OpenCV vision event webhook
router.post('/opencv/event', validateOpenCVKey, async (req, res) => {
  const { timestamp, eventType, entityType, entityId, data, confidence } = req.body;

  // Validate confidence threshold
  if (confidence < 0.8) {
    return res.json({ success: true, processed: false, message: 'Confidence too low' });
  }

  try {
    // Update entity based on event type
    if (eventType === 'room_occupancy' && entityType === 'room') {
      await pool.query(
        `UPDATE rooms SET status = $1, current_doctor_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [data.occupied ? 'occupied' : 'available', data.doctorId, entityId]
      );

      // Broadcast room update
      broadcastEvent('room:updated', { roomId: entityId, status: data.occupied ? 'occupied' : 'available' });
    }

    if (eventType === 'equipment_status' && entityType === 'equipment') {
      await pool.query(
        `UPDATE equipment SET status = $1, updated_at = NOW() WHERE id = $2`,
        [data.status, entityId]
      );

      // Create action item if equipment needs maintenance
      if (data.status === 'needs_maintenance' || data.status === 'offline') {
        await pool.query(
          `INSERT INTO action_items (type, urgency, title, description, status, created_by)
           VALUES ('equipment_issue', 'urgent', $1, $2, 'pending', 'opencv')`,
          [`Equipment ${entityId} needs attention`, `Status: ${data.status}`]
        );
      }

      broadcastEvent('equipment:updated', { equipmentId: entityId, status: data.status });
    }

    res.json({ success: true, processed: true, eventId: `evt_${Date.now()}` });
  } catch (error) {
    console.error('Error processing vision event:', error);
    res.status(500).json({ success: false, message: 'Processing error' });
  }
});

// CLAW task creation webhook
router.post('/claw/task', validateClawKey, async (req, res) => {
  const { type, description, priority, assignee, doctorId, roomId, equipmentId, reasoning } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO tasks (type, description, priority, assignee, doctor_id, room_id, equipment_id, status, created_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'agent', $8)
       RETURNING *`,
      [type, description, priority, assignee, doctorId, roomId, equipmentId, JSON.stringify([{ text: reasoning, timestamp: new Date() }])]
    );

    const task = result.rows[0];
    broadcastEvent('task:created', task);

    res.json({ success: true, taskId: task.id, createdAt: task.created_at });
  } catch (error) {
    console.error('Error creating task from CLAW:', error);
    res.status(500).json({ success: false, message: 'Task creation failed' });
  }
});

// CLAW action item creation webhook
router.post('/claw/action', validateClawKey, async (req, res) => {
  const { type, urgency, title, description, context, reasoning, doctorId, roomId, equipmentId } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO action_items (type, urgency, title, description, context, doctor_id, room_id, equipment_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'agent')
       RETURNING *`,
      [type, urgency, title, description, JSON.stringify({ ...context, reasoning }), doctorId, roomId, equipmentId]
    );

    const action = result.rows[0];
    broadcastEvent('action:created', action);

    res.json({ success: true, actionId: action.id, createdAt: action.created_at });
  } catch (error) {
    console.error('Error creating action from CLAW:', error);
    res.status(500).json({ success: false, message: 'Action creation failed' });
  }
});

export default router;
```

### Environment Variables

Add to `packages/backend/.env`:

```env
# CareSync MCP Server
CARESYNC_MCP_COMMAND=npx
CARESYNC_MCP_ARGS=-y,@caresync/mcp-server

# Open CLAW Agent
CLAW_AGENT_URL=http://localhost:8000
CLAW_API_KEY=claw_secret_key_123

# OpenCV Monitor
OPENCV_API_KEY=opencv_secret_key_456

# Webhook Security
WEBHOOK_RATE_LIMIT=100  # requests per minute
```

## System Health Monitoring

### Health Check Endpoint

`GET /api/health`

```typescript
{
  "status": "healthy",
  "timestamp": "2026-02-06T14:30:00Z",
  "components": {
    "database": {
      "status": "connected",
      "latency": 5
    },
    "careSyncMCP": {
      "status": "connected",
      "lastCheck": "2026-02-06T14:29:30Z"
    },
    "clawAgent": {
      "status": "connected",
      "lastCheck": "2026-02-06T14:29:30Z"
    },
    "openCVMonitor": {
      "status": "receiving_events",
      "lastEvent": "2026-02-06T14:29:45Z"
    }
  }
}
```

## Demo Mode

For testing without external systems:

```typescript
// packages/backend/src/services/mock-integrations.ts

export class MockIntegrations {
  startOpenCVSimulation(callback: (event: any) => void) {
    setInterval(() => {
      const events = [
        { eventType: 'room_occupancy', entityId: 'room-2', data: { occupied: true } },
        { eventType: 'equipment_status', entityId: 'ekg-1', data: { status: 'in_use' } },
      ];
      callback(events[Math.floor(Math.random() * events.length)]);
    }, 15000);
  }

  startClawSimulation(callback: (task: any) => void) {
    setInterval(() => {
      const tasks = [
        { type: 'room_cleaning', description: 'Clean Room 3', assignee: 'staff' },
        { type: 'equipment_check', description: 'Check EKG', assignee: 'agent' },
      ];
      callback(tasks[Math.floor(Math.random() * tasks.length)]);
    }, 30000);
  }
}
```

Enable with `DEMO_MODE=true` in `.env`.

## Integration Testing

### Test Scenarios

1. **OpenCV Event Processing**
   - Send vision event → Verify database update → Verify WebSocket broadcast

2. **CLAW Task Creation**
   - CLAW creates task → Verify in database → Verify appears in UI

3. **Policy Validation**
   - Create appointment → Query CareSync MCP → Display conflict

4. **End-to-End Workflow**
   - OpenCV detects room occupied → Dashboard updates → CLAW receives status → CLAW creates cleaning task → Task appears in UI

## Next Steps

1. Implement webhook handlers
2. Implement CareSync MCP client
3. Implement CLAW agent client
4. Add health monitoring
5. Create demo mode
6. Write integration tests
7. Update documentation
