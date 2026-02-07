# CareSync Dashboard

A real-time operational management system for small medical practices with multiple doctors. The dashboard serves as a central hub for managing facility operations, scheduling policies, room/equipment status, and task coordination with an AI agent.

## Overview

This dashboard enables medical staff to focus on patient care by surfacing only what requires human attention while an Open CLAW AI agent handles routine operations autonomously.

### Key Features

- **Real-Time Operational Status**: Live visibility into rooms, equipment, and patient flow
- **Action Management**: Prioritized list of items requiring human attention
- **Scheduling Policy Management**: Manage doctor availability and appointment rules via CareSync MCP Server
- **Task Coordination**: Track operational tasks handled by staff or AI agent
- **Multi-Doctor Support**: Medical assistants can manage multiple doctors from a unified view
- **Performance Metrics**: Daily operations summary and trend analysis

## Architecture

Monorepo with three main packages:

- **Frontend**: React with TypeScript (port 5173)
- **Backend**: Node.js/Express API server (port 3000)
- **Cara Autonomous Agent**: AI-powered operations agent (port 8000)
- **Database**: PostgreSQL for persistent data
- **Integration**: CareSync MCP Server for scheduling policies
- **Authentication**: JWT-based with role-based access control + API key for Cara

## Project Structure

```
/
├── .kiro/
│   ├── specs/                    # Feature specifications
│   └── steering/                 # Project guidance
├── packages/
│   ├── frontend/                 # React dashboard UI (port 5173)
│   ├── backend/                  # Node.js API server (port 3000)
│   └── cara-autonomous-agent/    # Cara AI agent (port 8000)
├── docs/                         # Documentation
│   ├── CLAW_AGENT_SETUP.md      # Cara setup guide
│   ├── MONDAY_DEMO_PLAN.md      # Demo script
│   └── ...
├── START_ALL.md                  # Quick start guide
├── CARA_AGENT_COMPLETE.md        # Cara implementation details
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+ (or Neon cloud database)

### Quick Start

See [START_ALL.md](./START_ALL.md) for complete startup instructions.

**Quick version:**

```bash
# Terminal 1: Backend
cd packages/backend
npm run dev

# Terminal 2: Frontend  
cd packages/frontend
npm run dev

# Terminal 3: Cara Agent
cd packages/cara-autonomous-agent
npm run dev
```

The system will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Cara Agent: `http://localhost:8000`

### Test Credentials

After seeding the database:
- **Admin**: `admin@clinic.com` / `password123`
- **Doctor**: `sarah.johnson@clinic.com` / `password123`
- **Medical Assistant**: `assistant@clinic.com` / `password123`

### Development Commands

```bash
# Start all development servers
npm run dev

# Run tests
npm test

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build
```

## Testing Strategy

Dual testing approach for comprehensive coverage:

- **Unit Tests**: Jest for specific examples, edge cases, and error conditions
- **Property-Based Tests**: fast-check with minimum 100 iterations per property
- **Coverage Goal**: 80% minimum
- **Correctness Properties**: 30 properties validating universal correctness

## Security

- Input validation on client and server
- Parameterized queries (no SQL injection)
- XSS prevention via content sanitization
- CSRF protection for state-changing operations
- Rate limiting: 100 requests/minute per user
- HTTPS/TLS for all connections
- Audit logging for all actions
- PII filtering in displays and logs

## Documentation

- [START_ALL.md](./START_ALL.md) - Complete startup guide for all services
- [CARA_AGENT_COMPLETE.md](./CARA_AGENT_COMPLETE.md) - Cara implementation details
- [docs/CLAW_AGENT_SETUP.md](./docs/CLAW_AGENT_SETUP.md) - Cara configuration guide
- [docs/MONDAY_DEMO_PLAN.md](./docs/MONDAY_DEMO_PLAN.md) - Demo script and talking points
- [Requirements](/.kiro/specs/medical-facility-dashboard/requirements.md) - Feature requirements
- [Design](/.kiro/specs/medical-facility-dashboard/design.md) - Architecture and data models
- [Tasks](/.kiro/specs/medical-facility-dashboard/tasks.md) - Implementation plan

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate user
- `GET /api/auth/me` - Get current user

### Facility Status
- `GET /api/facility/status` - Current operational status
- `GET /api/rooms` - List rooms with status
- `GET /api/equipment` - List equipment

### Action Items
- `GET /api/actions` - List action items
- `POST /api/actions` - Create action item
- `PUT /api/actions/:id` - Update action item

### Tasks
- `GET /api/tasks` - List operational tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task

### Scheduling Policies
- `GET /api/policies` - List policies
- `POST /api/policies` - Create policy
- `POST /api/policies/check` - Validate scheduling action

### Metrics
- `GET /api/metrics/daily` - Daily operations summary
- `GET /api/metrics/trends` - 7-day trend data

## WebSocket Events

Real-time updates via WebSocket:
- `facility:status` - Facility status changed
- `room:updated` - Room status changed
- `action:created` - New action item
- `task:updated` - Task updated
- `agent:status` - AI agent status changed

## Contributing

This project follows spec-driven development:

1. Review requirements and design documents in `.kiro/specs/`
2. Check implementation tasks in `tasks.md`
3. Write tests first (unit tests and property tests)
4. Implement features incrementally
5. Ensure all tests pass before committing

## License

[Add your license here]

## Contact

[Add contact information]
