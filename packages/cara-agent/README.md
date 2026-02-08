# Cara - CareSync Operations Agent

Cara is an autonomous AI agent that monitors the CareSync medical facility dashboard and makes intelligent decisions about operational tasks.

## Features

- **Autonomous Task Management**: Creates routine operational tasks automatically
- **Human-in-the-Loop**: Escalates uncertain situations to staff via action items
- **AI-Powered Decisions**: Uses OpenRouter (Kimi K2.5) for intelligent decision-making
- **Conservative Approach**: Prioritizes patient safety, escalates when uncertain

## Architecture

```
Dashboard (port 3000)
    ↓ (every 10 seconds)
Facility Status Update
    ↓
Cara Agent (port 8000)
    ↓
AI Decision Engine (Kimi K2.5)
    ↓
Create Task or Action Item
    ↓
Dashboard API (port 3000)
```

## Setup

### 1. Install Dependencies

```bash
cd packages/cara-agent
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
# Server
PORT=8000

# Dashboard Integration
DASHBOARD_URL=http://localhost:3000
DASHBOARD_API_KEY=claw_secret_key_12345
CLAW_AUTH_TOKEN=dashboard_token_12345

# AI Model (OpenRouter)
OPENROUTER_API_KEY=your-openrouter-api-key-here
MODEL=openrouter/moonshotai/kimi-k2.5

# Decision Thresholds
CONFIDENCE_THRESHOLD=0.7
AUTO_TASK_THRESHOLD=0.8
```

### 3. Start Cara

```bash
npm run dev
```

## API Endpoints

### Health Check
```
GET /health
```

Returns agent status and configuration.

### Facility Status Webhook
```
POST /webhook/facility-status
Authorization: Bearer {CLAW_AUTH_TOKEN}
```

Receives facility status updates from the dashboard.

## Decision Framework

### Autonomous Actions (Confidence > 80%)
- Room cleaning after patient visits
- Equipment maintenance checks
- Supply restocking
- Standard operational tasks

**Result**: Creates task automatically

### Human Review (Confidence 70-80%)
- Situations requiring judgment
- Non-routine operations
- Moderate priority issues

**Result**: Creates action item for staff review

### Escalation (Confidence < 70%)
- Patient care decisions
- Unusual situations
- Equipment failures
- Scheduling conflicts

**Result**: Logs only, no automatic action

## Configuration

### Confidence Thresholds

- `CONFIDENCE_THRESHOLD` (default: 0.7): Minimum confidence to create action item
- `AUTO_TASK_THRESHOLD` (default: 0.8): Minimum confidence to create task autonomously

### AI Model

Cara uses OpenRouter to access various AI models. Default is Moonshot AI's Kimi K2.5, but you can configure any OpenRouter-supported model:

```bash
MODEL=openrouter/anthropic/claude-3.5-sonnet
MODEL=openrouter/openai/gpt-4
MODEL=openrouter/moonshotai/kimi-k2.5
```

## Development

### Run in Development Mode
```bash
npm run dev
```

### Build for Production
```bash
npm run build
npm start
```

## Integration with Dashboard

The dashboard backend sends facility status updates to Cara every 10 seconds via the webhook endpoint. Cara analyzes the status and takes appropriate actions:

1. **Receives** facility status (rooms, equipment, occupancy)
2. **Analyzes** using AI decision engine
3. **Decides** whether to act autonomously or escalate
4. **Executes** by creating tasks or action items via dashboard API

## Monitoring

Cara logs all decisions and actions:

```
[Webhook] Received facility status update
[Decision Engine] Processing facility status...
[Decision Engine] Decision: create_task (confidence: 0.85)
[Decision Engine] Reasoning: Room 3 needs cleaning after patient visit
[Dashboard] Task created: 123
```

## Security

- **Authentication**: All webhook requests require Bearer token
- **API Key**: Dashboard API calls use separate API key
- **Environment Variables**: Sensitive credentials stored in `.env`

## Troubleshooting

### Cara shows as "offline" in dashboard
- Check that Cara is running on port 8000
- Verify `CLAW_AUTH_TOKEN` matches in both `.env` files
- Check dashboard backend logs for connection errors

### No tasks being created
- Check OpenRouter API key is valid
- Verify `DASHBOARD_API_KEY` is correct
- Review Cara logs for decision reasoning
- Adjust confidence thresholds if needed

### AI decisions seem incorrect
- Review the system prompt in `decision-engine.ts`
- Try a different AI model
- Adjust confidence thresholds
- Check facility status data being sent
