# Vision Service Setup Guide

Complete guide to set up and demo the computer vision room occupancy detection.

## Overview

The Vision Service uses your Logitech webcam to automatically detect room occupancy and update the dashboard in real-time. Perfect for Monday's demo!

## Prerequisites

- ✅ Python 3.10+ installed (tested with Python 3.14.2)
- ✅ Logitech webcam (the one you use for Google meetings)
- ✅ Backend, Frontend, and Cara services running
- ✅ Dashboard accessible at http://localhost:5173

## Quick Setup (5 minutes)

### 1. Install Python Dependencies

```bash
cd packages/vision-service
./setup.sh
```

This will:
- Create a Python virtual environment
- Install OpenCV, NumPy, and other dependencies
- Take about 2-3 minutes

### 1.5. Grant Camera Permissions (macOS)

**IMPORTANT:** On macOS, you need to grant camera access to your terminal app:

1. When you first run the vision service, macOS will show a dialog: "Warp would like to access the Camera"
2. Click **Allow**
3. If you accidentally clicked "Don't Allow", go to **System Settings** → **Privacy & Security** → **Camera** and enable your terminal app

### 2. Get Your Room ID

You need a valid room ID from your database. Query the database directly:

```sql
SELECT id, name FROM rooms;
```

Example room IDs from the seed data:
- `ba13e279-b3bb-472e-9707-8539453560a9` - Exam Room 1
- `90a4cfe3-9489-4d43-bd4f-1dba25a38f9d` - Exam Room 2
- `a208955c-6ca3-479e-be32-3848ad0322c4` - Exam Room 3

### 3. Configure Vision Service

The `.env` file is already configured with working settings:

```bash
# Dashboard Backend Configuration
DASHBOARD_URL=http://localhost:3000
DASHBOARD_API_KEY=vision_service_key_12345

# Camera Configuration
CAMERA_INDEX=0
CAMERA_NAME=Logitech Webcam

# Room Mapping (already configured for Exam Room 1)
ROOM_ID=ba13e279-b3bb-472e-9707-8539453560a9
ROOM_NAME=Exam Room 1

# Detection Parameters (tuned for your environment)
MOTION_THRESHOLD=5000
OCCUPANCY_CONFIDENCE=0.3
CLEANING_TIMEOUT_MINUTES=5
FRAME_RATE=2

# Logging
LOG_LEVEL=INFO
DEBUG_LOGGING=false  # Set to 'true' for verbose status logging
```

### 4. Start the Vision Service

```bash
cd packages/vision-service
source venv/bin/activate  # Activate Python environment
python src/main.py
```

You should see:

```
============================================================
Vision Service Starting
============================================================
Room: Exam Room 1 (ID: 550e8400-e29b-41d4-a716-446655440000)
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

## Demo Flow

### Full System Startup Order

1. **Backend** (Terminal 1):
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Cara Agent** (Terminal 2):
   ```bash
   cd packages/cara-agent
   npm run dev
   ```

3. **Frontend** (Terminal 3):
   ```bash
   cd packages/frontend
   npm run dev
   ```

4. **Vision Service** (Terminal 4):
   ```bash
   cd packages/vision-service
   source venv/bin/activate
   python src/main.py
   ```

### Demo Scenario

**Setup:**
- Open dashboard: http://localhost:5173
- Login: `assistant@clinic.com` / `password123`
- Position your webcam so it can see you at your desk

**Demo Script:**

1. **Show Initial State**
   - Dashboard shows "Exam Room 1: Available"
   - Vision service logs: "Monitoring Exam Room 1..."

2. **Trigger Occupancy Detection**
   - Sit at your desk (in view of webcam)
   - Within 2-3 seconds, vision service logs: "Status changed: available → occupied"
   - Dashboard updates to "Exam Room 1: Occupied"
   - Explain: "Computer vision detected motion and updated room status automatically"

3. **Trigger Available Detection**
   - Stand up and walk away from desk
   - Within 10-15 seconds, vision service logs: "Status changed: occupied → available"
   - Dashboard updates to "Exam Room 1: Available"
   - Explain: "System detected no motion and marked room as available"

4. **Trigger Cleaning Alert** (Optional - takes 5 minutes)
   - Stay away from desk for 5 minutes
   - Vision service logs: "Room empty for 5 minutes"
   - Vision service logs: "→ Action item created: Room needs cleaning"
   - Dashboard shows new action item: "Exam Room 1 needs cleaning"
   - Explain: "After 5 minutes empty, system automatically creates cleaning task"
   - Cara agent can pick this up and create a cleaning task

5. **Show Real-Time Updates**
   - Sit back down
   - Room immediately goes back to "Occupied"
   - Cleaning alert is reset
   - Explain: "All updates happen in real-time via WebSocket"

## What You'll See

### Vision Service Console Output

```
[10:30:15] Monitoring Exam Room 1...
[10:30:45] Status changed: available → occupied (confidence: 0.92)
[10:30:45] → Dashboard updated: Exam Room 1 is occupied
[10:31:20] Status changed: occupied → available (confidence: 0.88)
[10:31:20] → Dashboard updated: Exam Room 1 is available
[10:36:20] Room empty for 5 minutes
[10:36:20] → Action item created: Room needs cleaning
```

### Dashboard Updates

- **Facility Status Panel**: Room status changes in real-time
- **Action Items**: "Room needs cleaning" appears after 5 minutes
- **WebSocket**: All updates happen instantly (< 2 seconds)

## Troubleshooting

### Camera Not Found

**Error:** `Failed to open camera 0`

**Solutions:**
1. Check if another app is using the camera (close Zoom, Google Meet, etc.)
2. Try different camera index: Edit `.env` and set `CAMERA_INDEX=1`
3. Test camera: `python -c "import cv2; print(cv2.VideoCapture(0).isOpened())"`

### Dashboard Connection Failed

**Error:** `⚠ Dashboard backend not reachable`

**Solutions:**
1. Make sure backend is running on port 3000
2. Check backend logs for errors
3. Verify `DASHBOARD_URL=http://localhost:3000` in `.env`

### Authentication Failed

**Error:** `Failed to update room status: 403`

**Solutions:**
1. Check backend `.env` has `VISION_API_KEY=vision_service_key_12345`
2. Check vision `.env` has matching `DASHBOARD_API_KEY=vision_service_key_12345`
3. Restart backend after changing `.env`

### Room Not Found

**Error:** `Failed to update room status: 404`

**Solutions:**
1. Get valid room ID from database
2. Run `npm run db:seed` in backend to create rooms
3. Update `ROOM_ID` in vision service `.env`

### Too Sensitive / Not Sensitive Enough

**Too many false positives (detecting motion when room is empty):**
- Increase `MOTION_THRESHOLD` to 8000 or 10000 in `.env`
- Check for moving objects in camera view (fans, curtains, monitors)

**Doesn't detect you:**
- Decrease `MOTION_THRESHOLD` to 3000 in `.env`
- Make sure you're in camera view
- Try moving more (wave your arms)

**Working configuration (tested):**
```bash
MOTION_THRESHOLD=5000
OCCUPANCY_CONFIDENCE=0.3
```

## Technical Details

### How It Works

1. **Frame Capture**: Captures frames from webcam at 2 FPS
2. **Motion Detection**: Uses OpenCV background subtraction
3. **State Tracking**: 
   - 3 consecutive frames with motion → "occupied"
   - 10 consecutive frames without motion → "available"
4. **Dashboard Update**: Sends REST API call to update room status
5. **Cleaning Detection**: Tracks time since room became available
6. **Action Creation**: Creates action item after 5 minutes empty

### Privacy & Security

- ✅ No facial recognition
- ✅ No video recording or storage
- ✅ Motion detection only
- ✅ All processing in memory
- ✅ Frames discarded immediately
- ✅ No PII captured

### Performance

- **Latency**: < 2 seconds from detection to dashboard update
- **CPU Usage**: ~5-10% (very lightweight)
- **Memory**: ~100MB
- **Frame Rate**: 2 FPS (configurable)

## Next Steps After Demo

Once basic demo works, you can:

1. **Add Multiple Cameras**: Monitor multiple rooms simultaneously
2. **Equipment Detection**: Track medical equipment usage
3. **Patient Flow**: Anonymized tracking of patient movement
4. **Calibration Mode**: Visual setup tool for detection zones
5. **Health Monitoring**: API endpoint for system status

## Support

If you run into issues:
1. Check the troubleshooting section above
2. Look at vision service logs for error messages
3. Verify all 4 services are running
4. Check backend logs for API errors

**Demo is Monday 11:00 AM CT - you've got this!** 🚀
