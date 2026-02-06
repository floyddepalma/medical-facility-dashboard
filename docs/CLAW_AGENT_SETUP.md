# Open CLAW Agent Setup Guide

## Overview

This guide walks you through setting up a fresh Open CLAW agent installation for the CareSync Dashboard. The agent handles routine facility operations autonomously, creating tasks and escalating issues that require human attention.

---

## Prerequisites

- **Open CLAW**: Latest version installed
- **Python 3.9+**: For vision system integration (optional)
- **Node.js 18+**: For dashboard backend
- **API Access**: OpenAI or Anthropic API key for agent reasoning

---

## Quick Start

### 1. Install Open CLAW

```bash
# Clone Open CLAW repository
git clone https://github.com/your-org/open-claw.git
cd open-claw

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env`:

```env
# AI Provider
AI_PROVIDER=openai
AI_API_KEY=your-openai-api-key
AI_MODEL=gpt-4o

# Agent Configuration
AGENT_NAME=CareSync-CLAW
AGENT_PORT=8000
AGENT_API_KEY=your-secure-api-key

# Dashboard Integration
DASHBOARD_URL=http://localhost:3000
DASHBOARD_API_KEY=your-dashboard-api-key

# Logging
LOG_LEVEL=info
```

### 3. Start the Agent

```bash
npm start
```

Agent should be running at `http://localhost:8000`

---

## Dashboard Integration

### Configure Dashboard to Connect to CLAW

Edit `packages/backend/.env`:

```env
# Open CLAW Agent
CLAW_AGENT_URL=http://localhost:8000
CLAW_API_KEY=your-secure-api-key
```

### Test Connection

```bash
# From dashboard backend directory
curl -X GET http://localhost:8000/health \
  -H "Authorization: Bearer your-secure-api-key"
```

Expected response:
```json
{
  "status": "healthy",
  "agent": "CareSync-CLAW",
  "version": "1.0.0"
}
```

---

## Agent Training

### System Prompt Configuration

Create `agent-system-prompt.md` in your CLAW config directory:

```markdown
# CareSync Medical Facility Operations Agent

You are an AI agent managing routine operations for a small medical practice. Your role is to handle automated tasks, create work items for staff, and escalate issues requiring human judgment.

## Your Environment

**Facility Type**: Small medical practice (2-4 doctors)
**Operating Hours**: 8 AM - 6 PM, Monday-Friday
**Staff Roles**:
- Doctors: Focus on patient care
- Medical Assistants: Manage operations, schedules, facility
- Admin: System oversight

## Your Capabilities

### 1. Receive Facility Status Updates
Every 10 seconds, you receive:
- Room occupancy (occupied, empty, cleaning)
- Equipment status (operational, in_use, maintenance, offline)
- Patient flow (waiting, in_exam, treatment, checkout)
- Current tasks and action items

### 2. Create Operational Tasks
You can create tasks for:
- Room cleaning and preparation
- Equipment checks and maintenance
- Supply restocking
- Workflow coordination

### 3. Create Action Items
For issues requiring human attention:
- Scheduling conflicts
- Equipment problems
- Patient flow bottlenecks
- Unusual situations

## Decision Framework

### ALWAYS Handle Autonomously

**Room Management:**
- Create cleaning task when room empty > 5 minutes
- Schedule room preparation before next appointment
- Track room turnover times

**Equipment:**
- Schedule inspection after 4+ hours continuous use
- Create maintenance reminders based on usage
- Track equipment location changes

**Routine Operations:**
- Supply restock reminders
- End-of-day cleanup tasks
- Standard workflow coordination

### ALWAYS Escalate to Human

**Medical Decisions:**
- Anything involving patient care
- Appointment scheduling changes
- Doctor availability questions

**Unusual Situations:**
- Extended appointments (> 30 min over schedule)
- Equipment missing or misplaced
- Patient wait time > 20 minutes
- Any system failures or errors

**Low Confidence:**
- Any detection or inference < 70% confidence
- Ambiguous situations
- First-time scenarios

### Context-Aware Decisions

**Time of Day:**
- Morning (8-10 AM): Expect rush, prioritize patient flow
- Midday (12-1 PM): Lunch breaks, reduced capacity
- Afternoon (4-6 PM): Wind-down, prepare for next day
- After hours: Security and maintenance only

**Day of Week:**
- Monday: Busiest, most appointments
- Friday: Lighter, more admin tasks
- Weekend: Closed (emergency only)

**Facility Load:**
- All rooms occupied: Prioritize turnover speed
- Quiet periods: Focus on maintenance and prep
- Short-staffed: Minimize non-essential tasks

## Response Format

When you receive a facility status update or event:

```json
{
  "decision": "handle_autonomously" | "escalate_to_human" | "defer",
  "action": {
    "type": "create_task" | "create_action_item" | "none",
    "description": "Clear, actionable description",
    "assignee": "agent" | "staff" | "specific_role",
    "urgency": "urgent" | "normal" | "low",
    "reasoning": "Why you made this decision"
  }
}
```

## Examples

### Example 1: Room Cleaning (Autonomous)

**Input:**
```json
{
  "event": "room_status_change",
  "roomId": "exam-room-1",
  "previousStatus": "occupied",
  "newStatus": "empty",
  "emptyDuration": "6 minutes"
}
```

**Your Response:**
```json
{
  "decision": "handle_autonomously",
  "action": {
    "type": "create_task",
    "description": "Clean and sanitize Exam Room 1",
    "assignee": "staff",
    "urgency": "normal",
    "reasoning": "Room empty for 6 minutes after patient visit. Standard cleaning protocol."
  }
}
```

### Example 2: Extended Appointment (Escalate)

**Input:**
```json
{
  "event": "appointment_duration_alert",
  "roomId": "exam-room-2",
  "scheduledDuration": "15 minutes",
  "actualDuration": "45 minutes",
  "doctorId": "dr-smith"
}
```

**Your Response:**
```json
{
  "decision": "escalate_to_human",
  "action": {
    "type": "create_action_item",
    "description": "Dr. Smith's appointment in Room 2 running 30 min over - check if assistance needed",
    "assignee": "staff",
    "urgency": "normal",
    "reasoning": "Extended appointment may indicate complex case or issue. Medical assistant should check."
  }
}
```

### Example 3: Equipment Inspection (Autonomous)

**Input:**
```json
{
  "event": "equipment_usage_alert",
  "equipmentId": "ultrasound-1",
  "usageDuration": "5 hours",
  "location": "exam-room-3"
}
```

**Your Response:**
```json
{
  "decision": "handle_autonomously",
  "action": {
    "type": "create_task",
    "description": "Inspect ultrasound machine in Room 3 - extended use check",
    "assignee": "staff",
    "urgency": "normal",
    "reasoning": "Equipment in continuous use for 5 hours. Standard protocol requires inspection."
  }
}
```

## Best Practices

1. **Be Proactive**: Create tasks before problems occur
2. **Be Conservative**: When in doubt, escalate to human
3. **Be Clear**: Task descriptions should be immediately actionable
4. **Be Contextual**: Consider time, load, and staff availability
5. **Be Consistent**: Similar situations should get similar responses
6. **Learn**: Track which decisions work well and adjust

## Monitoring Your Performance

Staff will provide feedback on your decisions:
- ✅ Good: Task was helpful and appropriate
- ⚠️ Unnecessary: Task wasn't needed
- ❌ Missed: Should have created task but didn't
- 🔄 Wrong Level: Should have escalated (or not)

Use this feedback to improve your decision-making.
```

---

## Training Scenarios

### Scenario Set 1: Room Management

Load these scenarios to train the agent on room operations:

**File**: `training-scenarios/room-management.json`

```json
[
  {
    "id": "room-001",
    "category": "room_management",
    "description": "Room becomes empty after patient visit",
    "input": {
      "roomId": "exam-room-1",
      "previousStatus": "occupied",
      "newStatus": "empty",
      "emptyDuration": "6 minutes"
    },
    "expectedDecision": "handle_autonomously",
    "expectedAction": "create_task",
    "expectedDescription": "Clean and sanitize Exam Room 1",
    "reasoning": "Standard cleaning protocol after patient visit"
  },
  {
    "id": "room-002",
    "category": "room_management",
    "description": "Appointment running significantly over time",
    "input": {
      "roomId": "exam-room-2",
      "scheduledDuration": "15 minutes",
      "actualDuration": "45 minutes"
    },
    "expectedDecision": "escalate_to_human",
    "expectedAction": "create_action_item",
    "reasoning": "Extended appointment may indicate complex case or issue"
  },
  {
    "id": "room-003",
    "category": "room_management",
    "description": "Room in cleaning status for extended period",
    "input": {
      "roomId": "exam-room-3",
      "status": "cleaning",
      "cleaningDuration": "25 minutes"
    },
    "expectedDecision": "escalate_to_human",
    "expectedAction": "create_action_item",
    "reasoning": "Cleaning taking longer than normal 15-minute standard"
  }
]
```

### Scenario Set 2: Equipment Handling

**File**: `training-scenarios/equipment-handling.json`

```json
[
  {
    "id": "equipment-001",
    "category": "equipment_handling",
    "description": "Equipment in extended continuous use",
    "input": {
      "equipmentId": "ultrasound-1",
      "usageDuration": "5 hours",
      "location": "exam-room-3"
    },
    "expectedDecision": "handle_autonomously",
    "expectedAction": "create_task",
    "expectedDescription": "Inspect ultrasound machine - extended use check",
    "reasoning": "Prevent equipment failure from overuse"
  },
  {
    "id": "equipment-002",
    "category": "equipment_handling",
    "description": "Equipment found in unexpected location",
    "input": {
      "equipmentId": "bp-monitor-2",
      "expectedLocation": "exam-room-1",
      "actualLocation": "hallway",
      "missingDuration": "15 minutes"
    },
    "expectedDecision": "escalate_to_human",
    "expectedAction": "create_action_item",
    "reasoning": "Security concern and availability issue"
  },
  {
    "id": "equipment-003",
    "category": "equipment_handling",
    "description": "Equipment status changes to maintenance",
    "input": {
      "equipmentId": "ekg-machine-1",
      "previousStatus": "operational",
      "newStatus": "maintenance"
    },
    "expectedDecision": "handle_autonomously",
    "expectedAction": "create_task",
    "expectedDescription": "Schedule EKG machine maintenance",
    "reasoning": "Routine maintenance scheduling"
  }
]
```

### Scenario Set 3: Patient Flow

**File**: `training-scenarios/patient-flow.json`

```json
[
  {
    "id": "flow-001",
    "category": "patient_flow",
    "description": "Waiting room bottleneck detected",
    "input": {
      "area": "waiting_room",
      "currentOccupancy": 8,
      "averageWaitTime": "22 minutes"
    },
    "expectedDecision": "escalate_to_human",
    "expectedAction": "create_action_item",
    "reasoning": "Requires human judgment on scheduling adjustments"
  },
  {
    "id": "flow-002",
    "category": "patient_flow",
    "description": "Normal patient flow during busy morning",
    "input": {
      "area": "waiting_room",
      "currentOccupancy": 5,
      "averageWaitTime": "8 minutes",
      "timeOfDay": "9:30 AM"
    },
    "expectedDecision": "defer",
    "expectedAction": "none",
    "reasoning": "Normal morning rush, no action needed"
  }
]
```

---

## Testing Your Setup

### 1. Health Check

```bash
curl http://localhost:8000/health
```

### 2. Send Test Facility Status

```bash
curl -X POST http://localhost:8000/facility/status \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "rooms": [
      {"id": "exam-room-1", "status": "empty", "emptyDuration": 6}
    ],
    "equipment": [
      {"id": "ultrasound-1", "status": "in_use", "usageDuration": 5}
    ],
    "patientFlow": {
      "waiting": 3,
      "inExam": 2,
      "treatment": 1,
      "checkout": 0
    }
  }'
```

### 3. Query for Recommendation

```bash
curl -X POST http://localhost:8000/query \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "Room 1 has been empty for 6 minutes. What should I do?"
  }'
```

Expected response:
```json
{
  "recommendation": "Create a cleaning task for Room 1",
  "reasoning": "Room has been empty for 6 minutes after patient visit. Standard cleaning protocol requires sanitization.",
  "action": {
    "type": "create_task",
    "description": "Clean and sanitize Exam Room 1",
    "urgency": "normal"
  }
}
```

---

## Troubleshooting

### Agent Not Responding

**Check:**
1. Agent is running: `curl http://localhost:8000/health`
2. API key is correct in dashboard `.env`
3. Network connectivity between dashboard and agent
4. Check agent logs for errors

### Agent Making Poor Decisions

**Solutions:**
1. Review system prompt for clarity
2. Add more training scenarios
3. Adjust confidence thresholds
4. Provide feedback on decisions

### Dashboard Not Receiving Updates

**Check:**
1. WebSocket connection established
2. Agent has correct dashboard URL
3. Dashboard API key is valid
4. Check dashboard logs for webhook errors

---

## Next Steps

1. ✅ Install and configure Open CLAW
2. ✅ Connect to CareSync Dashboard
3. ✅ Load training scenarios
4. ✅ Test with sample facility status
5. 🔄 Monitor agent decisions
6. 🔄 Provide feedback and refine
7. 🔄 Gradually increase autonomy

---

## Support

- **Documentation**: See `docs/` directory
- **Training Scenarios**: See `.kiro/specs/opencv-facility-monitoring/design.md`
- **API Reference**: See `docs/TECHNICAL_ARCHITECTURE.md`
- **Issues**: Contact your development team

