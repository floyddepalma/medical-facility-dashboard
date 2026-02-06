# Quick Start: Integration for Monday Demo

**Time Sensitive:** This guide gets you from current state to demo-ready in minimum time.

---

## Critical Questions (Answer These First!)

### 1. Open CLAW Agent
- [ ] Is it running? Where? (URL/port)
- [ ] What's the API? (HTTP endpoints, WebSocket?)
- [ ] Authentication? (API key, token?)
- [ ] Can it receive facility status updates?
- [ ] Can it send task/action creation requests?

### 2. Nora RX MCP Server
- [ ] Is it installed? (`npm install @modelcontextprotocol/sdk`)
- [ ] Connection type? (stdio, HTTP, WebSocket?)
- [ ] How to start it? (command line?)
- [ ] Can it validate scheduling actions?
- [ ] Can it explain policies?

### 3. Demo Data
- [ ] Do you have realistic facility data?
- [ ] Doctor names and specializations?
- [ ] Room names and types?
- [ ] Equipment list?

---

## Option A: Full Integration (If Time Permits)

### Step 1: Open CLAW Integration (4-6 hours)

**File:** `packages/backend/src/services/claw-agent-client.ts`

```typescript
import axios from 'axios';

const CLAW_BASE_URL = process.env.CLAW_AGENT_URL || 'http://localhost:8000';
const CLAW_API_KEY = process.env.CLAW_API_KEY;

export class ClawAgentClient {
  private client = axios.create({
    baseURL: CLAW_BASE_URL,
    headers: {
      'Authorization': `Bearer ${CLAW_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  // Send facility status to CLAW
  async sendFacilityUpdate(status: any): Promise<void> {
    await this.client.post('/facility/status', status);
  }

  // Query CLAW for recommendation
  async getRecommendation(context: string): Promise<string> {
    const response = await this.client.post('/query', { context });
    return response.data.recommendation;
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      await this.client.get('/health');
      return true;
    } catch {
      return false;
    }
  }
}

export const clawAgent = new ClawAgentClient();
```

**Add to `.env`:**
```env
CLAW_AGENT_URL=http://localhost:8000
CLAW_API_KEY=your-claw-api-key
```

**Create webhook endpoint:**

File: `packages/backend/src/routes/webhooks.ts`
```typescript
import { Router } from 'express';
import { pool } from '../db/connection';

const router = Router();

// CLAW creates task
router.post('/claw/task', async (req, res) => {
  const { type, description, assignee } = req.body;
  
  const result = await pool.query(
    `INSERT INTO tasks (type, description, assignee, status, created_by)
     VALUES ($1, $2, $3, 'pending', 'agent')
     RETURNING *`,
    [type, description, assignee]
  );

  // Broadcast via WebSocket (if implemented)
  // broadcastTaskCreated(result.rows[0]);

  res.json({ task: result.rows[0] });
});

// CLAW creates action item
router.post('/claw/action', async (req, res) => {
  const { type, urgency, title, description } = req.body;
  
  const result = await pool.query(
    `INSERT INTO action_items (type, urgency, title, description, status, created_by)
     VALUES ($1, $2, $3, $4, 'pending', 'agent')
     RETURNING *`,
    [type, urgency, title, description]
  );

  res.json({ action: result.rows[0] });
});

export default router;
```

**Add to `packages/backend/src/index.ts`:**
```typescript
import webhookRoutes from './routes/webhooks';
app.use('/api/webhooks', webhookRoutes);
```

### Step 2: Nora MCP Integration (3-4 hours)

**Install SDK:**
```bash
cd packages/backend
npm install @modelcontextprotocol/sdk
```

**File:** `packages/backend/src/services/nora-mcp-client.ts`

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

class NoraMCPClient {
  private client: Client | null = null;

  async connect(): Promise<void> {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@norarx/mcp-server'],
    });

    this.client = new Client({
      name: 'medical-facility-dashboard',
      version: '1.0.0',
    }, {
      capabilities: {},
    });

    await this.client.connect(transport);
  }

  async listPolicies(doctorId: string): Promise<any[]> {
    if (!this.client) throw new Error('Not connected');
    
    const result = await this.client.callTool({
      name: 'list_policies',
      arguments: { doctorId },
    });

    return result.content;
  }

  async checkSchedulingAction(action: any): Promise<any> {
    if (!this.client) throw new Error('Not connected');
    
    const result = await this.client.callTool({
      name: 'check_scheduling',
      arguments: action,
    });

    return result.content;
  }
}

export const noraMCP = new NoraMCPClient();

// Connect on startup
noraMCP.connect().catch(console.error);
```

---

## Option B: Mock Integration (Faster, Demo-Ready)

### If Open CLAW or Nora MCP aren't ready, use mocks:

**File:** `packages/backend/src/services/mock-claw-agent.ts`

```typescript
export class MockClawAgent {
  private taskInterval: NodeJS.Timeout | null = null;

  // Simulate CLAW creating tasks periodically
  startSimulation(callback: (task: any) => void): void {
    this.taskInterval = setInterval(() => {
      const tasks = [
        { type: 'room_cleaning', description: 'Clean Room 3 after patient', assignee: 'staff' },
        { type: 'equipment_check', description: 'Check EKG machine in Room 1', assignee: 'staff' },
        { type: 'supply_restock', description: 'Restock bandages in Room 5', assignee: 'staff' },
      ];

      const task = tasks[Math.floor(Math.random() * tasks.length)];
      callback(task);
    }, 30000); // Every 30 seconds
  }

  stopSimulation(): void {
    if (this.taskInterval) {
      clearInterval(this.taskInterval);
    }
  }
}

export const mockClaw = new MockClawAgent();
```

**Enable in development:**

Add to `packages/backend/src/index.ts`:
```typescript
if (process.env.DEMO_MODE === 'true') {
  const { mockClaw } = await import('./services/mock-claw-agent');
  mockClaw.startSimulation(async (task) => {
    // Create task in database
    await pool.query(
      `INSERT INTO tasks (type, description, assignee, status, created_by)
       VALUES ($1, $2, $3, 'pending', 'agent')`,
      [task.type, task.description, task.assignee]
    );
    console.log('Mock CLAW created task:', task.type);
  });
}
```

**Add to `.env`:**
```env
DEMO_MODE=true
```

---

## Step 3: Seed Demo Data (2 hours)

**File:** `packages/backend/src/db/demo-seed.ts`

```typescript
import { pool } from './connection';

export async function seedDemoData() {
  // Clear existing data
  await pool.query('TRUNCATE users, doctors, rooms, equipment, tasks, action_items, appointments CASCADE');

  // Create doctors
  const doctors = await pool.query(`
    INSERT INTO doctors (name, specialization, active)
    VALUES 
      ('Dr. Emily Smith', 'Family Medicine', true),
      ('Dr. Michael Johnson', 'Pediatrics', true),
      ('Dr. Sarah Williams', 'Internal Medicine', true)
    RETURNING *
  `);

  // Create users
  await pool.query(`
    INSERT INTO users (email, password_hash, name, role, doctor_id)
    VALUES 
      ('admin@clinic.com', '$2b$10$...', 'Admin User', 'admin', NULL),
      ('sarah.johnson@clinic.com', '$2b$10$...', 'Sarah Johnson', 'medical_assistant', NULL),
      ('emily.smith@clinic.com', '$2b$10$...', 'Dr. Emily Smith', 'doctor', $1)
  `, [doctors.rows[0].id]);

  // Create rooms
  await pool.query(`
    INSERT INTO rooms (name, type, status)
    VALUES 
      ('Room 1', 'examination', 'available'),
      ('Room 2', 'examination', 'occupied'),
      ('Room 3', 'examination', 'needs_cleaning'),
      ('Room 4', 'examination', 'available'),
      ('Room 5', 'examination', 'available'),
      ('Room 6', 'treatment', 'available'),
      ('Room 7', 'treatment', 'occupied'),
      ('Room 8', 'treatment', 'available')
  `);

  // Create equipment
  await pool.query(`
    INSERT INTO equipment (name, type, status, last_maintenance_date, next_maintenance_date)
    VALUES 
      ('EKG Machine 1', 'diagnostic', 'operational', CURRENT_DATE - 30, CURRENT_DATE + 60),
      ('Blood Pressure Monitor 1', 'diagnostic', 'operational', CURRENT_DATE - 15, CURRENT_DATE + 75),
      ('Examination Table 1', 'furniture', 'operational', CURRENT_DATE - 60, CURRENT_DATE + 30),
      ('Sterilizer 1', 'equipment', 'needs_maintenance', CURRENT_DATE - 90, CURRENT_DATE)
  `);

  // Create action items
  await pool.query(`
    INSERT INTO action_items (type, urgency, title, description, status, created_by)
    VALUES 
      ('equipment_issue', 'urgent', 'Sterilizer needs maintenance', 'Sterilizer 1 is overdue for maintenance', 'pending', 'agent'),
      ('room_issue', 'normal', 'Room 3 needs cleaning', 'Room 3 has been marked for cleaning after last patient', 'pending', 'agent')
  `);

  // Create tasks
  await pool.query(`
    INSERT INTO tasks (type, description, assignee, status, created_by)
    VALUES 
      ('room_cleaning', 'Clean and sanitize Room 3', 'staff', 'pending', 'agent'),
      ('equipment_check', 'Perform routine check on EKG Machine 1', 'agent', 'in_progress', 'agent'),
      ('supply_restock', 'Restock examination gloves in Room 1', 'staff', 'pending', 'agent'),
      ('patient_followup', 'Call patient for test results', 'staff', 'pending', 'system')
  `);

  console.log('✓ Demo data seeded successfully');
}
```

**Run seed:**
```bash
cd packages/backend
npx tsx src/db/demo-seed.ts
```

---

## Step 4: Test Everything (1 hour)

### Checklist:
- [ ] Login works
- [ ] Dashboard shows data
- [ ] AI Assistant responds
- [ ] Tasks appear
- [ ] Action items appear
- [ ] Calendar shows appointments
- [ ] Room details work
- [ ] Context switching works
- [ ] No console errors

---

## Demo Mode Quick Start

**If you're short on time, use demo mode:**

1. **Set environment:**
```env
DEMO_MODE=true
AI_API_KEY=sk-your-openai-key
```

2. **Seed data:**
```bash
npm run db:seed
```

3. **Start servers:**
```bash
npm run dev
```

4. **Test login:**
- URL: http://localhost:5175
- Email: sarah.johnson@clinic.com
- Password: password123

5. **Practice demo script**

---

## Troubleshooting

### AI Assistant not responding
- Check AI_API_KEY is set
- Check OpenAI API quota
- Check network connectivity
- Look at backend logs

### No data showing
- Run seed script
- Check DATABASE_URL
- Verify database connection
- Check browser console

### Tasks not appearing
- Check DEMO_MODE=true
- Verify mock CLAW running
- Check database has tasks
- Refresh browser

---

## Sunday Night Checklist

- [ ] All services running
- [ ] Demo data seeded
- [ ] AI Assistant working
- [ ] Practice demo 2-3 times
- [ ] Backup plan ready
- [ ] Get good sleep!

---

## Emergency Contacts

**If stuck, reach out:**
- GitHub Issues
- Email: [your-email]
- Phone: [your-phone]

**Remember:** Demo mode is perfectly acceptable. Focus on showing the vision and value, not perfect integration. You've got this! 🚀
