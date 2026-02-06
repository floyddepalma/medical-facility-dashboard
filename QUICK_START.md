# Quick Start Guide - CareSync Dashboard

**Demo Date:** Monday 11:00 AM CT  
**Status:** Real-time WebSocket integration complete ✅

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Neon cloud DB configured)
- Environment variables configured

## Setup Steps

### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd packages/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `packages/backend/.env` and update:

```bash
cd packages/backend
cp .env.example .env
```

Required variables:
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `JWT_SECRET` - Any secure random string
- `CLAW_AGENT_URL` - Open CLAW agent URL (default: http://localhost:8000)
- `CLAW_AUTH_TOKEN` - Token for Dashboard→CLAW authentication
- `CLAW_API_KEY` - API key for CLAW→Dashboard webhooks
- `OPENCV_API_KEY` - API key for OpenCV→Dashboard webhooks

### 3. Seed Demo Data

```bash
cd packages/backend
npx tsx src/db/demo-seed.ts
```

This creates:
- 4 generic doctors (Mitchell, Rodriguez, Thompson, Chen)
- 9 rooms (6 examination, 3 treatment)
- 9 equipment items
- 4 action items
- 8 tasks
- 2 medical assistants

### 4. Start Backend Server

```bash
cd packages/backend
npm run dev
```

You should see:
```
✓ Database connected
✓ CLAW agent connected (or ⚠ CLAW agent offline)
✓ Facility status broadcaster started
✓ WebSocket server initialized at /ws
✓ Server running on port 3000
✓ WebSocket server ready at ws://localhost:3000/ws
✓ Webhook endpoints ready at /api/webhooks
```

### 5. Start Frontend (Separate Terminal)

```bash
cd packages/frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

## Testing Real-Time Updates

### Test WebSocket Connection

Open browser console at http://localhost:5173 and run:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws?userId=test-user');

ws.onopen = () => console.log('✓ WebSocket connected');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));

// Subscribe to facility updates
ws.send(JSON.stringify({ type: 'subscribe', room: 'facility' }));

// Subscribe to action items
ws.send(JSON.stringify({ type: 'subscribe', room: 'actions' }));

// Subscribe to tasks
ws.send(JSON.stringify({ type: 'subscribe', room: 'tasks' }));
```

### Test OpenCV Webhook

Simulate a room occupancy event:

```bash
curl -X POST http://localhost:3000/api/webhooks/opencv/event \
  -H "X-OpenCV-API-Key: opencv_secret_key_789" \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2026-02-06T14:30:00Z",
    "eventType": "room_occupancy",
    "entityType": "room",
    "entityId": "YOUR_ROOM_ID",
    "data": { "occupied": true, "doctorId": "YOUR_DOCTOR_ID" },
    "confidence": 0.95,
    "cameraId": "cam-1"
  }'
```

You should see:
1. Backend logs: `[OpenCV] Room YOUR_ROOM_ID → occupied`
2. Backend logs: `[WebSocket] Broadcast room:updated to X clients in room: facility`
3. Browser console: WebSocket message with room update

### Test CLAW Task Creation

```bash
curl -X POST http://localhost:3000/api/webhooks/claw/task \
  -H "X-Claw-API-Key: claw_secret_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "room_cleaning",
    "description": "Clean Room 5 after patient visit",
    "priority": "normal",
    "assignee": "staff",
    "reasoning": "Room needs cleaning based on patient flow analysis"
  }'
```

You should see:
1. Backend logs: `[CLAW] Created task: room_cleaning (normal)`
2. Backend logs: `[WebSocket] Broadcast task:created to X clients in room: tasks`
3. Browser console: WebSocket message with new task

### Test CLAW Action Creation

```bash
curl -X POST http://localhost:3000/api/webhooks/claw/action \
  -H "X-Claw-API-Key: claw_secret_key_12345" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "agent_request",
    "urgency": "normal",
    "title": "Review patient scheduling conflict",
    "description": "Two appointments scheduled in same room at overlapping times",
    "context": { "roomId": "room-1", "time": "14:00" },
    "reasoning": "Detected scheduling conflict that requires human decision"
  }'
```

You should see:
1. Backend logs: `[CLAW] Created action item: Review patient scheduling conflict (normal)`
2. Backend logs: `[WebSocket] Broadcast action:created to X clients in room: actions`
3. Browser console: WebSocket message with new action item

## Verify Integration

### Check CLAW Agent Status

```bash
curl http://localhost:3000/api/webhooks/health
```

Response:
```json
{
  "status": "healthy",
  "webhooks": {
    "opencv": "/api/webhooks/opencv/event",
    "clawTask": "/api/webhooks/claw/task",
    "clawAction": "/api/webhooks/claw/action"
  },
  "timestamp": "2026-02-06T..."
}
```

### Check Facility Status Broadcaster

The backend automatically sends facility status to CLAW every 10 seconds. Check logs:

```
[CLAW Client] Facility status sent. Actions planned: 0
```

If CLAW is offline:
```
[CLAW Client] Agent offline - status update queued
```

## Frontend Integration

### Initialize WebSocket in App

Add to your main App component:

```typescript
import { useEffect } from 'react';
import { initializeWebSocket } from './services/websocket';

function App() {
  useEffect(() => {
    // Initialize WebSocket connection
    const ws = initializeWebSocket(
      'http://localhost:3000',
      'user-id-here',
      'doctor-id-here' // optional
    );

    return () => {
      ws.disconnect();
    };
  }, []);

  // ... rest of app
}
```

### Use WebSocket Hooks in Components

```typescript
import { useWebSocketRoom, useWebSocketEvent } from './hooks/useWebSocket';

function RoomsList() {
  const [rooms, setRooms] = useState([]);

  // Subscribe to facility updates
  useWebSocketRoom('facility');

  // Listen for room updates
  useWebSocketEvent('room:updated', (event) => {
    setRooms(prev => 
      prev.map(room => 
        room.id === event.data.id ? event.data : room
      )
    );
  });

  // ... render rooms
}
```

## Troubleshooting

### WebSocket Not Connecting

1. Check backend is running on port 3000
2. Check browser console for connection errors
3. Verify CORS settings in backend

### CLAW Agent Offline

This is expected if you haven't started the CLAW agent yet. The system will:
- Continue operating normally
- Queue facility status updates
- Retry connection automatically

### Webhooks Not Working

1. Verify API keys match in `.env` and curl commands
2. Check backend logs for authentication errors
3. Ensure JSON payload is valid

### Database Connection Issues

1. Verify `DATABASE_URL` in `.env`
2. Check Neon dashboard for connection status
3. Ensure IP is whitelisted in Neon

## Next Steps

1. ✅ Backend WebSocket server running
2. ✅ Webhook endpoints tested
3. ✅ Real-time broadcasting working
4. ⏳ Frontend components integration
5. ⏳ CLAW agent setup
6. ⏳ OpenCV integration

## Demo Preparation

For Monday's demo:
1. Seed fresh demo data
2. Start backend server
3. Start frontend
4. Test all webhook endpoints
5. Verify real-time updates in UI
6. Prepare backup plan if CLAW/OpenCV offline

## Support

Check these files for more details:
- `IMPLEMENTATION_STATUS.md` - Complete implementation status
- `docs/MONDAY_DEMO_PLAN.md` - Demo strategy and script
- `docs/MCP_INTEGRATION_STRATEGY.md` - MCP integration approach
- `.env.example` - All environment variables

---

**Status:** Real-time WebSocket system fully operational! 🎉
