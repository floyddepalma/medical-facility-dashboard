# Project Structure

## Repository Organization

Monorepo structure with frontend and backend packages.

```
/
├── .kiro/
│   ├── specs/
│   │   └── medical-facility-dashboard/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   └── steering/
│       ├── product.md
│       ├── tech.md
│       └── structure.md
├── packages/
│   ├── frontend/          # React/TypeScript dashboard UI
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   ├── operational-status/
│   │   │   │   ├── action-items/
│   │   │   │   ├── tasks/
│   │   │   │   ├── scheduling/
│   │   │   │   ├── metrics/
│   │   │   │   └── multi-doctor/
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   └── websocket.ts
│   │   │   ├── types/
│   │   │   └── utils/
│   │   └── package.json
│   └── backend/           # Node.js/Express API server
│       ├── src/
│       │   ├── routes/
│       │   │   ├── auth.ts
│       │   │   ├── facility.ts
│       │   │   ├── actions.ts
│       │   │   ├── tasks.ts
│       │   │   ├── policies.ts
│       │   │   ├── metrics.ts
│       │   │   └── doctors.ts
│       │   ├── services/
│       │   │   ├── caresync-mcp-client.ts
│       │   │   ├── claw-agent-client.ts
│       │   │   └── websocket-server.ts
│       │   ├── models/
│       │   ├── middleware/
│       │   │   ├── auth.ts
│       │   │   ├── validation.ts
│       │   │   └── audit-log.ts
│       │   ├── db/
│       │   │   ├── schema.sql
│       │   │   └── migrations/
│       │   └── types/
│       └── package.json
└── package.json           # Root package.json for monorepo
```

## Key Directories

### `.kiro/specs/`
Contains feature specifications following spec-driven development methodology:
- `requirements.md`: User stories and acceptance criteria
- `design.md`: Architecture, data models, correctness properties
- `tasks.md`: Implementation plan with incremental tasks

### `packages/frontend/`
React dashboard UI with real-time updates:
- **Components**: Organized by feature (operational-status, action-items, tasks, scheduling, metrics, multi-doctor)
- **Services**: API client and WebSocket connection management
- **Types**: TypeScript interfaces matching backend models

### `packages/backend/`
Node.js API server and integration layer:
- **Routes**: REST API endpoints organized by domain
- **Services**: External integrations (CareSync MCP, Open CLAW Agent)
- **Models**: Data models and database access
- **Middleware**: Auth, validation, audit logging

## Data Models

Core entities (see design.md for full schemas):
- **User**: Staff members with roles (doctor, medical_assistant, admin)
- **Doctor**: Medical providers with scheduling policies
- **Room**: Examination/treatment rooms with status
- **Equipment**: Medical equipment with operational status
- **ActionItem**: Items requiring human attention
- **Task**: Operational tasks (staff or AI-assigned)
- **Policy**: Scheduling policies (via CareSync MCP)
- **FacilityStatus**: Real-time facility operational state
- **DailyMetrics**: Performance metrics and trends

## API Endpoints

### Authentication
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/logout` - End session
- `GET /api/auth/me` - Get current user

### Facility Status
- `GET /api/facility/status` - Current operational status
- `GET /api/rooms` - List rooms with status
- `PUT /api/rooms/:id/status` - Update room status
- `GET /api/equipment` - List equipment
- `PUT /api/equipment/:id` - Update equipment

### Action Items
- `GET /api/actions` - List action items
- `POST /api/actions` - Create action item
- `PUT /api/actions/:id` - Update action item
- `DELETE /api/actions/:id` - Dismiss action item

### Tasks
- `GET /api/tasks` - List operational tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `GET /api/tasks/history` - Completed tasks

### Scheduling Policies (via CareSync MCP)
- `GET /api/policies` - List policies
- `GET /api/policies/:id` - Get policy details
- `POST /api/policies` - Create policy
- `PUT /api/policies/:id` - Update policy
- `DELETE /api/policies/:id` - Delete policy
- `POST /api/policies/check` - Validate scheduling action
- `GET /api/policies/:id/explain` - Get human explanation

### Metrics
- `GET /api/metrics/daily` - Daily operations summary
- `GET /api/metrics/trends` - 7-day trend data

### Doctors
- `GET /api/doctors` - List doctors (filtered by access)
- `GET /api/doctors/:id` - Get doctor details

## WebSocket Events

### Client → Server
- `subscribe:facility` - Subscribe to facility updates
- `subscribe:actions` - Subscribe to action items
- `subscribe:tasks` - Subscribe to tasks
- `subscribe:doctor` - Subscribe to doctor-specific updates

### Server → Client
- `facility:status` - Facility status changed
- `room:updated` - Room status changed
- `equipment:updated` - Equipment status changed
- `action:created` - New action item
- `action:updated` - Action item updated
- `task:created` - New task
- `task:updated` - Task updated
- `policy:conflict` - Policy conflict detected
- `agent:status` - AI agent status changed

## Naming Conventions

- **Files**: kebab-case (e.g., `caresync-mcp-client.ts`)
- **Components**: PascalCase (e.g., `ActionItemsList`)
- **Functions/Variables**: camelCase (e.g., `calculateOccupancyRate`)
- **Types/Interfaces**: PascalCase (e.g., `FacilityStatus`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`)
- **Database Tables**: snake_case (e.g., `action_items`)

## Code Organization Principles

1. **Separation of Concerns**: Routes handle HTTP, services handle business logic
2. **Type Safety**: Strict TypeScript with no `any` types
3. **Error Handling**: Consistent error response format across all endpoints
4. **Validation**: Zod schemas for input validation
5. **Testing**: Co-locate tests with source files (`.test.ts` suffix)
6. **Property Tests**: Tag with feature and property number for traceability
