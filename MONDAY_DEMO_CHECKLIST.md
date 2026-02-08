# Monday Demo Checklist - February 9, 2026 @ 11:00 AM CT

## Pre-Demo Setup (Do This Sunday Night)

### Backend & Database
- [ ] Database seeded with clean demo data: `cd packages/backend && npm run db:reset`
- [ ] Backend `.env` configured with all API keys
- [ ] Test backend starts: `npm run dev` - should see "✓ Server running on port 3000"

### Cara Autonomous Agent
- [ ] OpenRouter API key configured in `.env`
- [ ] Model set to `moonshotai/kimi-k2.5` (cost-effective)
- [ ] Test Cara starts: `npm run dev` - should see "✓ Cara agent started"
- [ ] Verify Cara receives facility status updates

### Frontend
- [ ] Test frontend starts: `npm run dev` - should open on port 5173
- [ ] Login works: `assistant@clinic.com` / `password123`
- [ ] Dashboard loads with data
- [ ] WebSocket connection established

### Vision Service (Optional but Impressive)
- [ ] Python dependencies installed: `cd packages/vision-service && ./setup.sh`
- [ ] Camera tested: `python test-camera.py` - should pass all tests
- [ ] Room ID configured in `.env`
- [ ] Test vision service: `python src/main.py` - should connect to camera
- [ ] Verify room status updates when you move

## Demo Day Morning (1 Hour Before)

### System Check
- [ ] Close all unnecessary applications
- [ ] Close Zoom, Google Meet, etc. (they use the camera)
- [ ] Clear browser cache and cookies
- [ ] Open 4 terminal windows (Backend, Cara, Frontend, Vision)

### Start Services (In Order)
1. [ ] **Backend** - `cd packages/backend && npm run dev`
   - Wait for "✓ Server running on port 3000"
   
2. [ ] **Cara** - `cd packages/cara-agent && npm run dev`
   - Wait for "✓ Cara agent started"
   - Check for "Facility status sent successfully"
   
3. [ ] **Frontend** - `cd packages/frontend && npm run dev`
   - Wait for "Local: http://localhost:5173"
   
4. [ ] **Vision** (Optional) - `cd packages/vision-service && source venv/bin/activate && python src/main.py`
   - Wait for "✓ Connected to Logitech Webcam"

### Verify Everything Works
- [ ] Open http://localhost:5173 in browser
- [ ] Login: `assistant@clinic.com` / `password123`
- [ ] Dashboard shows:
  - [ ] Facility Status with rooms and equipment
  - [ ] 2 Action Items
  - [ ] 2 Active Tasks
  - [ ] Metrics panel with data
- [ ] Check Cara logs show decision-making
- [ ] If vision enabled: Move in/out of camera view, verify room status changes

### Prepare Demo Data
- [ ] Know which room the vision service is monitoring
- [ ] Have 2-3 action items visible
- [ ] Have 1-2 tasks in progress
- [ ] Metrics showing data

## Demo Script

### 1. Introduction (2 minutes)
"This is CareSync Dashboard - a real-time operational management system for medical facilities with AI automation."

**Show:**
- Dashboard overview
- Facility status panel
- Action items requiring attention
- Operational tasks

### 2. Real-Time Updates (3 minutes)
"Everything updates in real-time via WebSocket connections."

**Demo:**
- Complete a task → Show it moves to "Completed Today"
- Resolve an action item → Show visual feedback
- Explain the "human-in-the-loop" design

### 3. Cara AI Agent (5 minutes)
"Cara is our autonomous AI agent that monitors facility operations and makes intelligent decisions."

**Show:**
- Cara logs in terminal
- Decision-making with confidence scores
- Reasoning for each decision
- Cost-effective model (Kimi K2.5 @ ~$0.008/hour)

**Explain:**
- Receives facility status every 60 seconds
- Analyzes conditions
- Creates tasks/action items when needed
- Falls back to human attention when uncertain

### 4. Computer Vision (5 minutes) - **The Wow Factor**
"We've integrated computer vision for automatic room occupancy detection."

**Demo:**
- Show vision service logs
- Sit at desk → Room becomes "Occupied" (2 seconds)
- Stand up → Room becomes "Available" (10 seconds)
- Explain: "After 5 minutes empty, it creates a cleaning alert"

**Emphasize:**
- Privacy-first (no facial recognition)
- Motion detection only
- Real-time updates
- Cara can respond to cleaning alerts

### 5. Task Feedback System (3 minutes)
"We've improved user feedback for task management."

**Show:**
- Start a task → Shows elapsed time
- Complete a task → Green highlight, moves to completed section
- Collapsible "Completed Today" section
- Agent vs Staff task breakdown

### 6. Multi-Doctor Support (2 minutes)
"Medical assistants can manage multiple doctors from one unified view."

**Show:**
- Doctor selector (if implemented)
- Filtered views
- Role-based access

### 7. Q&A (5 minutes)
Be ready to answer:
- How does the AI make decisions?
- What happens if the AI is wrong?
- How much does it cost to run?
- Can it scale to multiple facilities?
- What about patient privacy?

## Backup Plans

### If Vision Service Fails
- [ ] Show the code and explain how it works
- [ ] Show test-camera.py output
- [ ] Explain the architecture
- [ ] Focus on Cara agent instead

### If Cara Fails
- [ ] Show manual task/action creation
- [ ] Explain the AI integration architecture
- [ ] Show the decision engine code
- [ ] Focus on vision service instead

### If WebSocket Fails
- [ ] Refresh browser
- [ ] Show manual refresh updates data
- [ ] Explain the real-time architecture

### If Everything Fails
- [ ] Have screenshots ready
- [ ] Show the codebase
- [ ] Walk through the architecture
- [ ] Explain what it would do

## Key Talking Points

### Technical Highlights
- ✅ Real-time WebSocket updates (< 2 seconds)
- ✅ AI decision-making with confidence scores
- ✅ Computer vision with privacy protection
- ✅ Cost-effective AI model (~$1.35/month)
- ✅ Monorepo architecture (Frontend, Backend, Cara, Vision)
- ✅ TypeScript + Python stack
- ✅ PostgreSQL database
- ✅ RESTful API design

### Business Value
- ✅ Reduces manual monitoring workload
- ✅ Surfaces only what needs human attention
- ✅ Automates routine operations
- ✅ Improves facility efficiency
- ✅ Maintains patient privacy
- ✅ Scales to multiple facilities

### Unique Features
- ✅ Human-in-the-loop AI design
- ✅ Computer vision without facial recognition
- ✅ Real-time occupancy detection
- ✅ Autonomous task creation
- ✅ Confidence-based decision making
- ✅ Graceful degradation when AI unavailable

## Post-Demo

### If They're Interested
- [ ] Offer to send documentation
- [ ] Discuss customization options
- [ ] Talk about deployment
- [ ] Explain scaling approach

### Follow-Up Items
- [ ] Send GitHub repo link
- [ ] Share architecture diagrams
- [ ] Provide cost analysis
- [ ] Schedule technical deep-dive

## To-Do (Evening Before Demo)

- [ ] Set up old Intel MacBook with vision service for Exam Room 2
  - Copy `packages/vision-service` folder
  - Run `./setup.sh` to install dependencies
  - Configure `.env` with `ROOM_ID=90a4cfe3-9489-4d43-bd4f-1dba25a38f9d` (Exam Room 2)
  - Point `DASHBOARD_URL` to main machine's IP address
  - Test camera and connection

## Emergency Contacts

- **You**: Ready to troubleshoot
- **Kiro**: Available for questions
- **Documentation**: All in repo

## Final Checks (5 Minutes Before)

- [ ] All 4 services running
- [ ] Dashboard loaded and logged in
- [ ] Camera working (if using vision)
- [ ] Cara making decisions
- [ ] Terminal windows visible for logs
- [ ] Browser at 100% zoom
- [ ] Notifications silenced
- [ ] Phone on silent

## Confidence Boosters

✅ You've built a complete, working system  
✅ All integrations are functional  
✅ You have backup plans  
✅ The demo is impressive  
✅ You know the codebase  
✅ You're prepared  

**You've got this! 🚀**

Good luck with the demo on Monday!
