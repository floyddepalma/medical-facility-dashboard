# Vision Service

Computer vision service for automatic room occupancy detection using your Logitech webcam.

## Features

- **Real-time occupancy detection** - Detects when you're at your desk vs away
- **Automatic room status updates** - Updates dashboard within 2 seconds
- **Cleaning alerts** - Creates action items after 5 minutes of room being empty
- **Privacy-first** - No facial recognition, no frame storage, motion detection only

## Quick Start

### 1. Install Python Dependencies

```bash
cd packages/vision-service
pip install -r requirements.txt
```

Or using a virtual environment (recommended):

```bash
cd packages/vision-service
python3 -m venv venv
source venv/bin/activate  # On Mac/Linux
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and update:
- `ROOM_ID` - Get this from your database (one of your room UUIDs)
- `DASHBOARD_API_KEY` - Must match the key in backend `.env`

### 3. Run the Service

```bash
python src/main.py
```

You should see:
```
============================================================
Vision Service Starting
============================================================
Room: Exam Room 1 (ID: room-1)
Camera: Logitech Webcam (Index: 0)
Frame Rate: 2 FPS
Cleaning Timeout: 5 minutes
============================================================
✓ Connected to Logitech Webcam
  Resolution: 640x480
✓ Dashboard backend connected

Monitoring Exam Room 1...
Press Ctrl+C to stop
```

## How It Works

### Motion Detection
- Analyzes frames from your webcam at 2 FPS
- Uses OpenCV background subtraction to detect motion
- Requires 3 consecutive frames with motion → "occupied"
- Requires 10 consecutive frames without motion → "available"

### Dashboard Integration
- Updates room status via REST API: `PUT /api/facility/rooms/:id/status`
- Creates action items via REST API: `POST /api/actions`
- All updates appear in dashboard within 1-2 seconds

### Cleaning Detection
- Tracks time since room became available
- After 5 minutes empty → creates "needs cleaning" action item
- Cara agent can automatically create cleaning task
- Resets when room becomes occupied again

## Demo Scenario

1. **Start all services:**
   - Backend: `cd packages/backend && npm run dev`
   - Frontend: `cd packages/frontend && npm run dev`
   - Cara: `cd packages/cara-autonomous-agent && npm run dev`
   - Vision: `cd packages/vision-service && python src/main.py`

2. **Login to dashboard:**
   - Open http://localhost:5173
   - Login: `assistant@clinic.com` / `password123`

3. **Trigger detection:**
   - Sit at your desk → Room shows "Occupied"
   - Stand up and walk away → Room shows "Available"
   - Wait 5 minutes → Action item appears "Room needs cleaning"

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DASHBOARD_URL` | `http://localhost:3000` | Backend API URL |
| `DASHBOARD_API_KEY` | `vision_service_key_12345` | API authentication key |
| `CAMERA_INDEX` | `0` | Webcam device index (0 = first camera) |
| `CAMERA_NAME` | `Logitech Webcam` | Display name for logs |
| `ROOM_ID` | `room-1` | Room UUID from database |
| `ROOM_NAME` | `Exam Room 1` | Display name for logs |
| `MOTION_THRESHOLD` | `500` | Pixels changed to detect motion |
| `OCCUPANCY_CONFIDENCE` | `0.7` | Confidence threshold (0.0-1.0) |
| `CLEANING_TIMEOUT_MINUTES` | `5` | Minutes before cleaning alert |
| `FRAME_RATE` | `2` | Frames per second to process |
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |

### Adjusting Sensitivity

**Too sensitive (false positives):**
- Increase `MOTION_THRESHOLD` (try 1000)
- Increase `OCCUPANCY_CONFIDENCE` (try 0.8)

**Not sensitive enough (misses you):**
- Decrease `MOTION_THRESHOLD` (try 300)
- Decrease `OCCUPANCY_CONFIDENCE` (try 0.6)

## Troubleshooting

### Camera not found
```
Failed to open camera 0
```
**Solution:** Check camera index. Try `CAMERA_INDEX=1` or `2` if you have multiple cameras.

### Dashboard connection failed
```
⚠ Dashboard backend not reachable
```
**Solution:** 
1. Make sure backend is running: `cd packages/backend && npm run dev`
2. Check `DASHBOARD_URL` in `.env`
3. Verify backend is on port 3000

### Authentication failed
```
Failed to update room status: 403
```
**Solution:**
1. Check `DASHBOARD_API_KEY` matches backend `.env`
2. Make sure backend has `VISION_API_KEY=vision_service_key_12345`

### Room ID not found
```
Failed to update room status: 404
```
**Solution:**
1. Get a valid room ID from database
2. Run: `npm run db:seed` in backend to create rooms
3. Update `ROOM_ID` in vision service `.env`

## Architecture

```
┌─────────────────┐
│ Logitech Webcam │
└────────┬────────┘
         │ Video frames (2 FPS)
         ▼
┌─────────────────────────────┐
│   Vision Service (Python)   │
│  ┌──────────────────────┐   │
│  │ Camera               │   │
│  │ - Frame capture      │   │
│  └──────────┬───────────┘   │
│             ▼               │
│  ┌──────────────────────┐   │
│  │ OccupancyDetector    │   │
│  │ - Motion detection   │   │
│  │ - Status tracking    │   │
│  └──────────┬───────────┘   │
│             ▼               │
│  ┌──────────────────────┐   │
│  │ DashboardClient      │   │
│  │ - REST API calls     │   │
│  └──────────┬───────────┘   │
└─────────────┼───────────────┘
              │ HTTP
              ▼
┌─────────────────────────────┐
│  Dashboard Backend (Node)   │
│  - Update room status       │
│  - Create action items      │
│  - Broadcast via WebSocket  │
└─────────────────────────────┘
```

## Privacy & Security

- ✅ No facial recognition
- ✅ No frame storage or recording
- ✅ Motion detection only
- ✅ All processing in memory
- ✅ Frames discarded immediately after processing
- ✅ No personally identifiable information captured

## Next Steps

After basic demo works:
1. Add equipment detection
2. Add patient flow tracking
3. Add multiple camera support
4. Add calibration mode for setup
5. Add health monitoring endpoint
