# System Integration Plan - Monday Demo

**Demo Date:** Monday 9:00 AM CT  
**Goal:** Fully functional system with Open CLAW, Nora RX MCP, and Dashboard

## Current State

### ✅ Complete
- Dashboard UI with real-time updates
- AI Assistant chat interface
- Database schema and API endpoints
- Authentication and role-based access
- Calendar view and scheduling UI

### 🔄 In Progress
- Open CLAW Agent integration
- Nora RX MCP Server connection
- WebSocket real-time updates

### ❌ Not Started
- Open CLAW → Dashboard communication
- Nora RX MCP → Dashboard policy sync
- End-to-end workflow testing

---

## Integration Architecture

```
┌─────────────────┐
│  Open CLAW      │ ← AI Agent (autonomous operations)
│  Agent          │
└────────┬────────┘
         │ HTTP/WebSocket
         ↓
┌─────────────────┐
│  Dashboard      │ ← Central Hub (this repo)
│  Backend API    │
└────┬───────┬────┘
     │       │
     │       └──────→ ┌─────────────────┐
     │                │  Nora RX MCP    │ ← Policy Engine
     │                │  Server         │
     │                └─────────────────┘
     ↓
┌─────────────────┐
│  PostgreSQL     │ ← Persistent Storage
│  Database       │
└─────────────────┘
```

---

## Critical Path to Demo (Priority Order)

### Phase 1: Open CLAW Integration (HIGHEST PRIORITY)
**Time Estimate:** 4-6 hours

#### Step 1.1: Define Open CLAW API Contract
Create `packages/backend/src/services/claw-agent-client.ts`:

```typescript
interface ClawAgentClient {
  // Send facility status to CLAW
  sendFacilityUpdate(status: FacilityStatus): Promise<void>;
  
  // Receive task assignments from CLAW
  receiveTaskAssignment(task: Task): Promise<void>;
  
  // Query CLAW for recommendations
  getRecommendation(context: string): Promise<string>;
  
  // Health check
  ping(): Promise<boolean>;
}
```

**Action Items:**
- [ ] Document Open CLAW's actual API endpoints
- [ ] Implement HTTP client for CLAW communication
- [ ] Add CLAW_BASE_URL to environment variables
- [ ] Test connection with CLAW agent

#### Step 1.2: Bidirectional Communication
- [ ] Dashboard → CLAW: Send facility status every 10 seconds
- [ ] CLAW → Dashboard: Webhook endpoint for task creation
- [ ] CLAW → Dashboard: Action item creation when human needed

**New Endpoint:** `POST /api/webhooks/claw/task`
**New Endpoint:** `POST /api/webhooks/claw/action`

#### Step 1.3: AI Assistant → CLAW Integration
Update `ai-assistant-service.ts` to route complex queries to CLAW:
- [ ] Add tool: `query_claw_agent(question: string)`
- [ ] CLAW provides context-aware responses
- [ ] Dashboard AI assistant becomes CLAW's interface

---

### Phase 2: Nora RX MCP Integration (HIGH PRIORITY)
**Time Estimate:** 3-4 hours

#### Step 2.1: MCP Client Implementation
Complete `packages/backend/src/services/nora-mcp-client.ts`:

```typescript
interface NoraMCPClient {
  // Policy Management
  listPolicies(doctorId: string): Promise<Policy[]>;
  createPolicy(doctorId: string, policy: PolicyInput): Promise<Policy>;
  updatePolicy(policyId: string, updates: Partial<Policy>): Promise<Policy>;
  deletePolicy(policyId: string): Promise<void>;
  
  // Policy Validation
  checkSchedulingAction(action: SchedulingAction): Promise<ValidationResult>;
  explainPolicy(policyId: string): Promise<string>;
}
```

**Action Items:**
- [ ] Install MCP SDK: `npm install @modelcontextprotocol/sdk`
- [ ] Configure MCP connection (stdio or HTTP)
- [ ] Implement policy CRUD operations
- [ ] Add policy validation before scheduling

#### Step 2.2: Calendar Integration
- [ ] Link calendar appointments to policy checks
- [ ] Show policy conflicts in UI
- [ ] AI assistant can query/modify policies via MCP

---

### Phase 3: Real-Time Updates (MEDIUM PRIORITY)
**Time Estimate:** 2-3 hours

#### Step 3.1: WebSocket Server
Complete `packages/backend/src/services/websocket-server.ts`:

```typescript
// Broadcast events to connected clients
- facility:status → All clients
- room:updated → All clients
- task:created → Relevant role
- action:created → Relevant role
- policy:conflict → Affected doctor/MA
```

**Action Items:**
- [ ] Implement WebSocket server with `ws` library
- [ ] Add authentication to WebSocket connections
- [ ] Create broadcast functions for each event type
- [ ] Test with multiple connected clients

#### Step 3.2: Frontend WebSocket Client
Update `packages/frontend/src/services/websocket.ts`:
- [ ] Connect on login
- [ ] Subscribe to relevant channels based on role
- [ ] Update UI state on events
- [ ] Reconnect on disconnect

---

### Phase 4: Demo Scenario Preparation (CRITICAL)
**Time Estimate:** 2-3 hours

#### Step 4.1: Seed Demo Data
Create `packages/backend/src/db/demo-seed.ts`:
- [ ] 3 doctors with different specializations
- [ ] 2 medical assistants managing doctors
- [ ] 8 rooms (5 examination, 3 treatment)
- [ ] 15 pieces of equipment
- [ ] 10 active patients in various stages
- [ ] 5 pending action items
- [ ] 8 operational tasks (mix of agent/staff)
- [ ] Sample scheduling policies

#### Step 4.2: Demo Script
Create `docs/DEMO_SCRIPT.md`:
1. **Login as Medical Assistant**
2. **Show Facility Status** - Real-time dashboard
3. **Chat with AI Assistant** - "What's the current wait time?"
4. **Context Switch** - "Show Dr. Smith's schedule"
5. **CLAW Creates Task** - Watch task appear in real-time
6. **Policy Conflict** - Attempt scheduling that violates policy
7. **Complete Task** - Show workflow
8. **Multi-Doctor View** - Switch between doctors

---

## Environment Configuration

### Required Environment Variables

**Backend `.env`:**
```env
# Existing
DATABASE_URL=postgresql://...
JWT_SECRET=...
AI_API_KEY=sk-...

# NEW - Add these
CLAW_AGENT_URL=http://localhost:8000
CLAW_API_KEY=your-claw-api-key
NORA_MCP_CONNECTION=stdio
NORA_MCP_COMMAND=npx
NORA_MCP_ARGS=-y,@norarx/mcp-server
```

---

## Testing Checklist (Before Demo)

### Integration Tests
- [ ] Dashboard → CLAW: Status updates flowing
- [ ] CLAW → Dashboard: Tasks created successfully
- [ ] Dashboard → Nora MCP: Policy queries working
- [ ] Nora MCP → Dashboard: Policy conflicts detected
- [ ] AI Assistant: Can query CLAW and MCP
- [ ] WebSocket: Real-time updates working
- [ ] Multi-user: Multiple clients connected

### User Workflows
- [ ] Medical Assistant: Manage facility operations
- [ ] Medical Assistant: Manage doctor schedules
- [ ] Doctor: View own schedule
- [ ] AI Assistant: Answer facility questions
- [ ] AI Assistant: Manage scheduling
- [ ] CLAW: Autonomous task creation
- [ ] CLAW: Request human intervention

### Performance
- [ ] Dashboard loads < 2 seconds
- [ ] Real-time updates < 1 second latency
- [ ] AI responses < 3 seconds
- [ ] No memory leaks over 30 minutes

---

## Fallback Plan (If Integration Issues)

### Option A: Mock CLAW Agent
Create `packages/backend/src/services/mock-claw-agent.ts`:
- Simulates CLAW behavior
- Creates tasks on schedule
- Responds to queries
- **Use if CLAW not ready**

### Option B: Demo Mode
Add `DEMO_MODE=true` environment variable:
- Pre-recorded task creation
- Simulated real-time updates
- Scripted AI responses
- **Use if integration unstable**

---

## Timeline (Working Backwards from Monday 9 AM)

**Sunday Evening (6 PM - 11 PM):**
- Final integration testing
- Demo script rehearsal
- Bug fixes
- Backup plan preparation

**Sunday Afternoon (12 PM - 6 PM):**
- Phase 4: Demo preparation
- Seed data creation
- End-to-end testing

**Sunday Morning (8 AM - 12 PM):**
- Phase 3: WebSocket implementation
- Real-time update testing

**Saturday Evening (6 PM - 11 PM):**
- Phase 2: Nora MCP integration
- Policy management testing

**Saturday Afternoon (12 PM - 6 PM):**
- Phase 1: Open CLAW integration
- Bidirectional communication

**Saturday Morning (8 AM - 12 PM):**
- Documentation review
- Environment setup
- Dependency installation

---

## Success Criteria

### Must Have (Demo Blockers)
✅ Dashboard displays real-time facility status  
✅ AI Assistant responds to queries  
⚠️ CLAW agent creates tasks autonomously  
⚠️ Nora MCP validates scheduling policies  
⚠️ Real-time updates via WebSocket  

### Nice to Have (Demo Enhancers)
- Multi-user demonstration
- Policy conflict resolution
- Task completion workflow
- Calendar integration

### Can Skip (Post-Demo)
- Google Calendar sync
- Advanced metrics
- Audit log viewer
- Mobile responsiveness

---

## Next Steps (RIGHT NOW)

1. **Document Open CLAW API** - What endpoints does it expose?
2. **Document Nora MCP Setup** - How do we connect to it?
3. **Create Mock Services** - Fallback if integration delayed
4. **Seed Demo Data** - Realistic scenario
5. **Write Demo Script** - Exact flow to demonstrate

**CRITICAL QUESTION:** Do you have Open CLAW and Nora MCP running locally? What are their connection details?
