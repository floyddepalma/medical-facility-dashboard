# Monday Demo Plan - HipNation Pitch

**Demo Date:** Monday 11:00 AM CT  
**Client:** HipNation (hipnation.com)  
**Hardware:** M1 MacBook Pro 16GB RAM  
**Goal:** Demonstrate fully functional CareSync system with real-time facility management

---

## System Architecture (Local Setup)

```
┌─────────────────────────────────────────────────────────┐
│  M1 MacBook Pro (16GB RAM)                              │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Dashboard    │  │ Open CLAW    │  │ CareSync MCP │ │
│  │ Frontend     │  │ Agent        │  │ Server       │ │
│  │ Port: 5175   │  │ Port: 8000   │  │ Port: 8080   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                          │
│  ┌──────────────┐  ┌──────────────┐                    │
│  │ Dashboard    │  │ PostgreSQL   │                    │
│  │ Backend      │  │ (Neon Cloud) │                    │
│  │ Port: 3000   │  │              │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                          │
│  Optional: USB Camera for OpenCV demo                   │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1: Demo Data Setup (HipNation-Specific)

### HipNation Doctor Data
Based on hipnation.com, create realistic demo data:

**Doctors** (from HipNation website):
- Dr. Sarah Chen - Family Medicine
- Dr. Michael Rodriguez - Pediatrics  
- Dr. Emily Thompson - Internal Medicine
- Dr. James Wilson - Orthopedics

**Medical Assistants:**
- Jessica Martinez - Manages Dr. Chen & Dr. Rodriguez
- David Kim - Manages Dr. Thompson & Dr. Wilson

**Facility Layout** (Typical small practice):
- **Examination Rooms**: 6 rooms
  - Room 1-4: Standard examination
  - Room 5-6: Pediatric examination (colorful, child-friendly)
  
- **Treatment Rooms**: 3 rooms
  - Treatment 1: Minor procedures
  - Treatment 2: EKG/Cardiac monitoring
  - Treatment 3: X-ray/Imaging

**Equipment:**
- 2x EKG Machines (Treatment 2, Room 4)
- 1x X-ray Machine (Treatment 3)
- 6x Blood Pressure Monitors (all exam rooms)
- 3x Examination Tables (treatment rooms)
- 1x Sterilizer (needs maintenance - creates action item)
- 2x Otoscopes (exam rooms)

**Operating Hours:**
- Monday-Friday: 8:00 AM - 6:00 PM
- Saturday: 9:00 AM - 1:00 PM
- Sunday: Closed

---

## Phase 2: Open CLAW Agent Setup

### Architecture Decision: Token-Based Auth

**Authentication Flow:**
```
Dashboard → Open CLAW: Bearer Token in Authorization header
Open CLAW → Dashboard: API Key in X-Claw-API-Key header
```

### Open CLAW Configuration

**File:** `open-claw/.env`
```env
# Server
PORT=8000
NODE_ENV=development

# Dashboard Integration
DASHBOARD_URL=http://localhost:3000
DASHBOARD_API_KEY=claw_secret_key_12345

# AI Model
OPENAI_API_KEY=sk-your-key
MODEL=gpt-4

# Facility Status Polling
FACILITY_STATUS_INTERVAL=10000  # 10 seconds

# CareSync MCP Integration
CARESYNC_MCP_URL=http://localhost:8080
```

### Open CLAW API Endpoints

**Health Check:**
```
GET http://localhost:8000/health
Response: { "status": "healthy", "uptime": 12345 }
```

**Receive Facility Status:**
```
POST http://localhost:8000/facility-status
Authorization: Bearer dashboard_token_12345
Body: { facilityStatus object }
Response: { "received": true, "actionsPlanned": 2 }
```

**Query for Recommendations:**
```
POST http://localhost:8000/query
Authorization: Bearer dashboard_token_12345
Body: { "context": "What should we do about Room 3?" }
Response: { "recommendation": "Clean Room 3 and prepare for next patient" }
```

### Dashboard → Open CLAW Client

**File:** `packages/backend/src/services/claw-agent-client.ts`
```typescript
import axios from 'axios';

export class ClawAgentClient {
  private client = axios.create({
    baseURL: process.env.CLAW_AGENT_URL || 'http://localhost:8000',
    headers: {
      'Authorization': `Bearer ${process.env.CLAW_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    timeout: 10000,
  });

  async sendFacilityStatus(status: any): Promise<void> {
    await this.client.post('/facility-status', status);
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
}
```

**Environment Variables:**
```env
CLAW_AGENT_URL=http://localhost:8000
CLAW_AUTH_TOKEN=dashboard_token_12345
CLAW_API_KEY=claw_secret_key_12345  # For webhooks from CLAW
```

---

## Phase 3: CareSync MCP Server Setup

### Refactoring Plan

1. **Pull existing MCP codebase into new Kiro project**
2. **Update package.json:**
   ```json
   {
     "name": "@caresync/mcp-server",
     "version": "1.0.0",
     "description": "CareSync MCP Server for scheduling policy management"
   }
   ```

4. **Use the policy schema we created:**
   - Copy `packages/backend/src/types/policy-schema.ts` to MCP server
   - Ensure both systems use identical schema

5. **MCP Server Environment:**
   ```env
   PORT=8080
   NODE_ENV=development
   DATABASE_URL=postgresql://...  # Same as dashboard or separate
   ```

### Dashboard → CareSync MCP Integration

**File:** `packages/backend/src/services/caresync-mcp-client.ts`
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class CareSyncMCPClient {
  private client: Client | null = null;

  async connect(): Promise<void> {
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['/path/to/caresync-mcp-server/dist/index.js'],
    });

    this.client = new Client({
      name: 'caresync-dashboard',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await this.client.connect(transport);
  }

  async listPolicies(doctorId: string): Promise<any[]> {
    const result = await this.client!.callTool({
      name: 'list_policies',
      arguments: { doctorId },
    });
    return JSON.parse(result.content[0].text);
  }

  async checkScheduling(action: any): Promise<any> {
    const result = await this.client!.callTool({
      name: 'check_scheduling',
      arguments: action,
    });
    return JSON.parse(result.content[0].text);
  }
}
```

---

## Phase 4: OpenCV Camera Setup (Optional but Impressive!)

### Recommended Camera
**Logitech C920 HD Pro Webcam** (~$70 at Best Buy)
- 1080p video
- Wide angle lens
- Good low-light performance
- USB plug-and-play

### Simple OpenCV Demo Setup

**Scenario:** Monitor a "room" (your desk area)

**Detection Events:**
1. **Person enters frame** → "Patient arrived in waiting room"
2. **Person leaves frame** → "Patient left room"
3. **Object placed on desk** → "Equipment in use"
4. **Object removed** → "Equipment available"

### OpenCV Script (Python)

**File:** `opencv-monitor/monitor.py`
```python
import cv2
import requests
import time
from datetime import datetime

DASHBOARD_URL = "http://localhost:3000/api/webhooks/opencv/event"
API_KEY = "opencv_secret_key_789"

cap = cv2.VideoCapture(0)  # USB camera
prev_frame = None

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Simple motion detection
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    gray = cv2.GaussianBlur(gray, (21, 21), 0)
    
    if prev_frame is None:
        prev_frame = gray
        continue
    
    frame_delta = cv2.absdiff(prev_frame, gray)
    thresh = cv2.threshold(frame_delta, 25, 255, cv2.THRESH_BINARY)[1]
    
    # If significant motion detected
    if cv2.countNonZero(thresh) > 5000:
        # Send event to dashboard
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "eventType": "room_occupancy",
            "entityType": "room",
            "entityId": "room-1",
            "data": {
                "occupied": True,
                "doctorId": "doc-chen-123"
            },
            "confidence": 0.85,
            "cameraId": "cam-demo-1"
        }
        
        try:
            requests.post(
                DASHBOARD_URL,
                json=event,
                headers={"X-OpenCV-API-Key": API_KEY}
            )
            print(f"Event sent: {event['eventType']}")
        except Exception as e:
            print(f"Error: {e}")
        
        time.sleep(5)  # Debounce
    
    prev_frame = gray
    
    # Display (optional)
    cv2.imshow('Monitor', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

**Install:**
```bash
pip install opencv-python requests
python monitor.py
```

---

## Phase 5: Demo Seed Data Script

**File:** `packages/backend/src/db/hipnation-seed.ts`

```typescript
import { pool } from './connection';
import bcrypt from 'bcrypt';

export async function seedHipNationDemo() {
  console.log('🏥 Seeding HipNation demo data...');

  // Clear existing data
  await pool.query('TRUNCATE users, doctors, rooms, equipment, tasks, action_items, appointments CASCADE');

  // Create doctors (from HipNation)
  const doctors = await pool.query(`
    INSERT INTO doctors (id, name, specialization, active)
    VALUES 
      ('doc-chen-123', 'Dr. Sarah Chen', 'Family Medicine', true),
      ('doc-rodriguez-456', 'Dr. Michael Rodriguez', 'Pediatrics', true),
      ('doc-thompson-789', 'Dr. Emily Thompson', 'Internal Medicine', true),
      ('doc-wilson-012', 'Dr. James Wilson', 'Orthopedics', true)
    RETURNING *
  `);

  // Create users
  const passwordHash = await bcrypt.hash('demo123', 10);
  await pool.query(`
    INSERT INTO users (email, password_hash, name, role, doctor_id, managed_doctor_ids)
    VALUES 
      ('admin@hipnation.com', $1, 'Admin User', 'admin', NULL, NULL),
      ('jessica@hipnation.com', $1, 'Jessica Martinez', 'medical_assistant', NULL, ARRAY['doc-chen-123', 'doc-rodriguez-456']),
      ('david@hipnation.com', $1, 'David Kim', 'medical_assistant', NULL, ARRAY['doc-thompson-789', 'doc-wilson-012']),
      ('sarah.chen@hipnation.com', $1, 'Dr. Sarah Chen', 'doctor', 'doc-chen-123', NULL)
  `, [passwordHash]);

  // Create rooms
  await pool.query(`
    INSERT INTO rooms (id, name, type, status)
    VALUES 
      ('room-1', 'Exam Room 1', 'examination', 'available'),
      ('room-2', 'Exam Room 2', 'examination', 'occupied'),
      ('room-3', 'Exam Room 3', 'examination', 'needs_cleaning'),
      ('room-4', 'Exam Room 4', 'examination', 'available'),
      ('room-5', 'Pediatric Room 1', 'examination', 'available'),
      ('room-6', 'Pediatric Room 2', 'examination', 'available'),
      ('treatment-1', 'Minor Procedures', 'treatment', 'available'),
      ('treatment-2', 'Cardiac Monitoring', 'treatment', 'occupied'),
      ('treatment-3', 'Imaging', 'treatment', 'available')
  `);

  // Create equipment
  await pool.query(`
    INSERT INTO equipment (id, name, type, room_id, status, last_maintenance_date, next_maintenance_date)
    VALUES 
      ('ekg-1', 'EKG Machine 1', 'diagnostic', 'treatment-2', 'in_use', CURRENT_DATE - 30, CURRENT_DATE + 60),
      ('ekg-2', 'EKG Machine 2', 'diagnostic', 'room-4', 'operational', CURRENT_DATE - 15, CURRENT_DATE + 75),
      ('xray-1', 'X-Ray Machine', 'imaging', 'treatment-3', 'operational', CURRENT_DATE - 45, CURRENT_DATE + 45),
      ('bp-1', 'BP Monitor 1', 'diagnostic', 'room-1', 'operational', CURRENT_DATE - 10, CURRENT_DATE + 80),
      ('bp-2', 'BP Monitor 2', 'diagnostic', 'room-2', 'operational', CURRENT_DATE - 10, CURRENT_DATE + 80),
      ('sterilizer-1', 'Autoclave Sterilizer', 'equipment', NULL, 'needs_maintenance', CURRENT_DATE - 95, CURRENT_DATE - 5)
  `);

  // Create action items
  await pool.query(`
    INSERT INTO action_items (type, urgency, title, description, status, created_by, doctor_id, room_id, equipment_id)
    VALUES 
      ('equipment_issue', 'urgent', 'Sterilizer needs immediate maintenance', 'Autoclave sterilizer is overdue for maintenance by 5 days', 'pending', 'system', NULL, NULL, 'sterilizer-1'),
      ('room_issue', 'normal', 'Room 3 needs cleaning', 'Room 3 marked for cleaning after last patient', 'pending', 'agent', 'doc-chen-123', 'room-3', NULL),
      ('policy_conflict', 'normal', 'Double booking detected', 'Dr. Rodriguez has overlapping appointments at 2:00 PM', 'pending', 'agent', 'doc-rodriguez-456', NULL, NULL)
  `);

  // Create tasks
  await pool.query(`
    INSERT INTO tasks (type, description, assignee, status, created_by, doctor_id, room_id)
    VALUES 
      ('room_cleaning', 'Clean and sanitize Exam Room 3', 'staff', 'pending', 'agent', 'doc-chen-123', 'room-3'),
      ('equipment_check', 'Perform routine check on EKG Machine 1', 'agent', 'in_progress', 'agent', NULL, NULL),
      ('supply_restock', 'Restock examination gloves in Pediatric Room 1', 'staff', 'pending', 'system', NULL, 'room-5'),
      ('patient_followup', 'Call patient for lab results', 'staff', 'pending', 'system', 'doc-thompson-789', NULL)
  `);

  console.log('✅ HipNation demo data seeded successfully!');
  console.log('');
  console.log('Demo Logins:');
  console.log('  Medical Assistant: jessica@hipnation.com / demo123');
  console.log('  Doctor: sarah.chen@hipnation.com / demo123');
  console.log('  Admin: admin@hipnation.com / demo123');
}
```

**Run:**
```bash
npx tsx packages/backend/src/db/hipnation-seed.ts
```

---

## Phase 6: Demo Script for HipNation

### Opening (2 minutes)

"Good morning! Thanks for taking the time. I know HipNation is growing fast - you've got multiple doctors, busy schedules, and you're trying to keep everything running smoothly while focusing on patient care.

What if you had a system that could monitor your facility in real-time, handle routine tasks autonomously, and only alert your staff when human judgment is actually needed?"

### Live Demo (15 minutes)

#### 1. Dashboard Overview (3 min)
- Login as Jessica (medical assistant)
- Show real-time facility status
- Point out: "This is your facility right now - 9 rooms, 6 pieces of equipment, 12 patients in various stages"

#### 2. AI Assistant (3 min)
- Ask: "What's the current wait time?"
- Ask: "Which rooms need attention?"
- Ask: "Show me Dr. Chen's schedule"
- **Key point:** "Natural language, instant answers"

#### 3. Autonomous Task Management (3 min)
- Show Open CLAW creating a task in real-time
- Show task appearing in dashboard
- Staff can take over or let AI handle it
- **Key point:** "AI handles routine, staff handles exceptions"

#### 4. Policy Management (3 min)
- Show Dr. Chen's scheduling policies
- Attempt to book conflicting appointment
- System catches conflict via CareSync MCP
- **Key point:** "Never double-book, policies enforced automatically"

#### 5. OpenCV Demo (3 min) - **The Wow Factor**
- Show live camera feed
- Walk in front of camera
- Dashboard updates in real-time: "Patient arrived in Room 1"
- **Key point:** "Computer vision monitoring, no manual updates needed"

### Closing (3 minutes)

"This system is designed specifically for practices like HipNation. It scales with you - whether you have 4 doctors or 40. Your staff focuses on patients, the AI handles operations.

What questions do you have?"

---

## Timeline: Saturday-Monday

### Saturday (8 hours)
- **Morning (4h):** Set up Open CLAW agent locally
- **Afternoon (4h):** Refactor CareSync MCP server

### Sunday (8 hours)
- **Morning (4h):** Integrate dashboard with CLAW and MCP
- **Afternoon (4h):** Seed HipNation data, test workflows

### Monday Morning (2 hours before demo)
- **9:00-10:00 AM:** Final testing, rehearse demo
- **10:00-11:00 AM:** Backup plan ready, coffee ☕
- **11:00 AM:** Demo time! 🚀

---

## Backup Plans

### If Open CLAW not ready:
- Use mock CLAW with simulated task creation
- Focus on dashboard UI and policy management

### If CareSync MCP not ready:
- Use hardcoded policies in dashboard
- Show policy UI with sample data

### If OpenCV not ready:
- Manual facility updates
- Focus on AI assistant and task management

### If everything fails:
- Demo mode with all mocks enabled
- Focus on vision and value proposition
- "This is what we're building for you"

---

## Success Metrics

- ✅ Dashboard loads < 2 seconds
- ✅ Real-time updates < 1 second
- ✅ AI assistant responds < 3 seconds
- ✅ No crashes during demo
- ✅ HipNation says "When can we start?"

---

## Post-Demo Next Steps

1. **If they're interested:**
   - Schedule technical deep-dive
   - Discuss HipNation-specific customizations
   - Pricing conversation

2. **Technical improvements:**
   - Production deployment plan
   - HIPAA compliance audit
   - Integration with their existing systems

3. **Product roadmap:**
   - Google Calendar sync
   - Telegram integration
   - Mobile app

---

**You've got this! The system is solid, the demo will be impressive, and HipNation needs what you're building.** 🎯
