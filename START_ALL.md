# CareSync Dashboard - Quick Start

Complete startup guide for running the full CareSync system locally.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL running (using Neon cloud database)
- OpenRouter API key

## Setup Steps

### 1. Configure Cara Agent

Edit `packages/cara-autonomous-agent/.env` and add your OpenRouter API key:

```bash
OPENROUTER_API_KEY=your-actual-openrouter-key-here
```

All other settings are pre-configured for local development.

### 2. Start All Services

Open **3 terminal windows**:

#### Terminal 1: Dashboard Backend
```bash
cd packages/backend
npm run dev
```

Should show:
- ✓ Database connected
- ✓ WebSocket server initialized
- ✓ Server running on port 3000

#### Terminal 2: Dashboard Frontend
```bash
cd packages/frontend
npm run dev
```

Should show:
- Local: http://localhost:5173

#### Terminal 3: Cara Agent
```bash
cd packages/cara-autonomous-agent
npm run dev
```

Should show:
- ✓ Cara agent started
- ✓ Server running on port 8000

### 3. Verify Integration

After starting all three:

1. **Check Dashboard Backend logs** - should show:
   ```
   ✓ CLAW agent connected
   ✓ Facility status broadcaster started
   [CLAW Client] Facility status sent successfully
   ```

2. **Check Cara logs** - should show:
   ```
   [Webhook] Received facility status update
   [Decision Engine] Processing facility status...
   ```

3. **Open Dashboard** at http://localhost:5173
   - AI Assistant panel should show "Cara (AI Agent): Online"

## System Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │◄────────┤   Backend       │
│   Port 5173     │ WebSocket│   Port 3000     │
└─────────────────┘         └────────┬────────┘
                                     │
                                     │ Every 10s
                                     │ Facility Status
                                     ▼
                            ┌─────────────────┐
                            │   Cara Agent    │
                            │   Port 8000     │
                            │   (Kimi K2.5)   │
                            └────────┬────────┘
                                     │
                                     │ Creates Tasks
                                     │ & Action Items
                                     ▼
                            ┌─────────────────┐
                            │ Dashboard API   │
                            │   Port 3000     │
                            └─────────────────┘
```

## Troubleshooting

### Cara shows as "offline"
- Check Cara is running on port 8000
- Verify `OPENROUTER_API_KEY` is set in `packages/cara-autonomous-agent/.env`
- Check authentication tokens match in both `.env` files

### No tasks being created
- Check Cara logs for decision reasoning
- Verify facility has rooms/equipment needing attention
- Try adjusting confidence thresholds in Cara's `.env`

### Database connection errors
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `packages/backend/.env`
- Run migrations: `npm run db:migrate` in backend

## Demo Data

To load demo data for testing:

```bash
cd packages/backend
npm run db:seed
```

This creates:
- 2 demo doctors
- 4 examination rooms
- 6 pieces of equipment
- Sample tasks and action items

## Stopping Everything

Press `Ctrl+C` in each terminal window to stop the services gracefully.

## Next Steps

- Review `packages/cara-autonomous-agent/README.md` for Cara configuration
- Check `docs/MONDAY_DEMO_PLAN.md` for demo script
- See `docs/USER_GUIDE.md` for feature documentation
