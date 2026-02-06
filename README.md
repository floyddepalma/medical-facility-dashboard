# Medical Facility Dashboard

A real-time operational management system for small medical practices with multiple doctors. The dashboard serves as a central hub for managing facility operations, scheduling policies, room/equipment status, and task coordination with an AI agent.

## Overview

This dashboard enables medical staff to focus on patient care by surfacing only what requires human attention while an Open CLAW AI agent handles routine operations autonomously.

### Key Features

- **Real-Time Operational Status**: Live visibility into rooms, equipment, and patient flow
- **Action Management**: Prioritized list of items requiring human attention
- **Scheduling Policy Management**: Manage doctor availability and appointment rules via Nora RX MCP Server
- **Task Coordination**: Track operational tasks handled by staff or AI agent
- **Multi-Doctor Support**: Medical assistants can manage multiple doctors from a unified view
- **Performance Metrics**: Daily operations summary and trend analysis

## Architecture

Monorepo with separate frontend and backend packages:

- **Frontend**: React with TypeScript, WebSocket client for real-time updates
- **Backend**: Node.js/Express with TypeScript, WebSocket server (ws library)
- **Database**: PostgreSQL for persistent data, Redis for caching and real-time state
- **Integration**: Nora RX MCP Server for scheduling policies, Open CLAW Agent for task automation
- **Authentication**: JWT-based with role-based access control

## Project Structure

```
/
├── .kiro/
│   ├── specs/                    # Feature specifications
│   │   └── medical-facility-dashboard/
│   │       ├── requirements.md   # User stories and acceptance criteria
│   │       ├── design.md         # Architecture and data models
│   │       └── tasks.md          # Implementation plan
│   └── steering/                 # Project guidance
│       ├── product.md
│       ├── tech.md
│       └── structure.md
├── packages/
│   ├── frontend/                 # React dashboard UI (to be implemented)
│   └── backend/                  # Node.js API server (to be implemented)
└── package.json                  # Root package.json (to be created)
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Access to Nora RX MCP Server
- Open CLAW Agent instance

### Installation

```bash
# Install dependencies (once package.json is created)
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed
```

### Development

```bash
# Start development servers
npm run dev

# Run tests
npm test

# Run property-based tests
npm run test:property

# Type checking
npm run type-check

# Linting
npm run lint
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

- [Requirements](/.kiro/specs/medical-facility-dashboard/requirements.md) - 14 requirements with acceptance criteria
- [Design](/.kiro/specs/medical-facility-dashboard/design.md) - Architecture, data models, and correctness properties
- [Tasks](/.kiro/specs/medical-facility-dashboard/tasks.md) - Implementation plan with 26 tasks and 70+ sub-tasks
- [Product Overview](/.kiro/steering/product.md) - Core purpose and design principles
- [Technology Stack](/.kiro/steering/tech.md) - Tech decisions and common commands
- [Project Structure](/.kiro/steering/structure.md) - Organization and conventions

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
