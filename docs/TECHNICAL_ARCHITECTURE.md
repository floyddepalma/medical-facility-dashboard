# Technical Architecture

## System Overview

The Medical Facility Dashboard is a distributed system consisting of multiple components working together to provide real-time operational management for medical facilities.

```
┌─────────────────────────────────────────────────────────────┐
│                     External Systems                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  Open CLAW   │    │  CareSync MCP │    │   Telegram   │ │
│  │    Agent     │    │    Server    │    │     Bot      │ │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘ │
│         │                    │                    │          │
└─────────┼────────────────────┼────────────────────┼─────────┘
          │                    │                    │
          │ HTTP/WS            │ MCP Protocol       │ HTTP
          │                    │                    │
┌─────────▼────────────────────▼────────────────────▼─────────┐
│                    Dashboard Backend                         │
│                  (Node.js + Express)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Layer (REST + WebSocket)            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │   Services   │  │  Middleware  │  │    Routes    │    │
│  │              │  │              │  │              │    │
│  │ • AI Assist  │  │ • Auth       │  │ • /auth      │    │
│  │ • CLAW       │  │ • Validation │  │ • /facility  │    │
│  │ • CareSync MCP   │  │ • Audit Log  │  │ • /chat      │    │
│  │ • Calendar   │  │ • PII Filter │  │ • /calendar  │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                              │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ PostgreSQL Protocol
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                    Data Layer                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐              ┌──────────────┐            │
│  │  PostgreSQL  │              │    Redis     │            │
│  │   Database   │              │    Cache     │            │
│  │              │              │              │            │
│  │ • Users      │              │ • Sessions   │            │
│  │ • Doctors    │              │ • Status     │            │
│  │ • Rooms      │              │ • Pub/Sub    │            │
│  │ • Tasks      │              │              │            │
│  └──────────────┘              └──────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS
                           │
┌──────────────────────────▼───────────────────────────────────┐
│                  Dashboard Frontend                           │
│                  (React + TypeScript)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │  Components  │  │   Services   │  │    State     │    │
│  │              │  │              │  │              │    │
│  │ • Dashboard  │  │ • API Client │  │ • Context    │    │
│  │ • Calendar   │  │ • WebSocket  │  │ • Local      │    │
│  │ • AI Chat    │  │              │  │              │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Frontend (React + TypeScript)

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling
- CSS custom properties for theming
- WebSocket client for real-time updates

**Key Components:**
- `App.tsx` - Main application shell, routing, authentication
- `Dashboard.tsx` - Main operational view
- `CalendarView.tsx` - Scheduling interface
- `AIAssistant.tsx` - Chat interface
- `FacilityStatusPanel.tsx` - Real-time metrics
- `ActionItemsList.tsx` - Human-required tasks
- `TasksList.tsx` - Operational tasks

**Services:**
- `api.ts` - REST API client with authentication
- `websocket.ts` - Real-time event handling
- `calendar.ts` - Calendar data management

**State Management:**
- React Context for theme
- Local component state
- No global state library (intentional simplicity)

**Build Output:**
- Static files served by backend
- Production build optimized and minified
- Code splitting for lazy loading

---

### Backend (Node.js + Express)

**Technology Stack:**
- Node.js 18+
- Express 4.x
- TypeScript
- PostgreSQL client (pg)
- Redis client (ioredis)
- OpenAI SDK
- WebSocket (ws)

**Architecture Pattern:**
- **Routes:** HTTP endpoint handlers
- **Services:** Business logic and external integrations
- **Middleware:** Cross-cutting concerns (auth, validation, logging)
- **Utils:** Shared utilities

**Key Services:**

#### AI Assistant Service
```typescript
// packages/backend/src/services/ai-assistant-service.ts
- OpenAI integration with tool calling
- Context management (facility vs doctor calendar)
- Permission enforcement
- Conversation history
- Tool execution (facility status, scheduling, tasks)
```

#### CLAW Agent Client
```typescript
// packages/backend/src/services/claw-agent-client.ts
- HTTP client for Open CLAW communication
- Facility status updates
- Task assignment reception
- Recommendation queries
- Health monitoring
```

#### CareSync MCP Client
```typescript
// packages/backend/src/services/nora-mcp-client.ts
- MCP protocol implementation
- Policy CRUD operations
- Scheduling validation
- Policy explanation
```

#### WebSocket Server
```typescript
// packages/backend/src/services/websocket-server.ts
- Real-time event broadcasting
- Client connection management
- Channel subscriptions
- Authentication
```

**Middleware:**
- `auth.ts` - JWT validation, role extraction
- `validation.ts` - Zod schema validation
- `audit-log.ts` - Action logging for compliance
- `error-handler.ts` - Centralized error handling

**API Routes:**
- `/api/auth` - Authentication (login, logout, session)
- `/api/facility` - Facility status, rooms, equipment
- `/api/actions` - Action items CRUD
- `/api/tasks` - Task management
- `/api/chat` - AI assistant endpoint
- `/api/calendar` - Appointments and time blocks
- `/api/doctors` - Doctor management
- `/api/metrics` - Performance metrics
- `/api/webhooks/claw` - CLAW agent callbacks

---

### Database (PostgreSQL)

**Schema Design:**

**Core Tables:**
```sql
users              -- Staff members (doctors, MAs, admins)
doctors            -- Doctor profiles and metadata
rooms              -- Examination and treatment rooms
equipment          -- Medical equipment tracking
patient_flow       -- Anonymized patient tracking
appointments       -- Scheduled appointments
time_blocks        -- Blocked time periods
action_items       -- Human-required tasks
tasks              -- Operational tasks
audit_logs         -- Compliance logging
```

**Relationships:**
- Users → Doctors (1:1 for doctor role)
- Users → Doctors (M:N for medical assistants)
- Rooms → Equipment (1:M)
- Appointments → Doctors (M:1)
- Tasks → Doctors (M:1, optional)
- Action Items → Rooms/Equipment (M:1, optional)

**Indexes:**
- Primary keys (UUID)
- Foreign keys
- Status fields (for filtering)
- Timestamp fields (for sorting)
- Composite indexes for common queries

**Views:**
```sql
daily_metrics_view  -- Aggregated daily performance
```

---

### Cache (Redis)

**Usage:**
- Session storage (JWT tokens)
- Facility status cache (10s TTL)
- Policy cache (10s TTL)
- WebSocket pub/sub for multi-server sync

**Key Patterns:**
```
facility:status           -- Current facility state
policy:{doctorId}         -- Doctor policies
session:{userId}          -- User sessions
ws:channel:{channelName}  -- WebSocket pub/sub
```

---

## Data Flow

### User Authentication

```
1. User submits credentials
   ↓
2. Backend validates against database
   ↓
3. JWT token generated and returned
   ↓
4. Frontend stores token in localStorage
   ↓
5. Token included in all subsequent requests
   ↓
6. Middleware validates token on each request
```

### Real-Time Facility Updates

```
1. Database change occurs (room status update)
   ↓
2. Backend invalidates Redis cache
   ↓
3. Backend broadcasts WebSocket event
   ↓
4. All connected clients receive update
   ↓
5. Frontend updates UI without refresh
```

### AI Assistant Query

```
1. User types message in chat
   ↓
2. Frontend sends to /api/chat with context
   ↓
3. Backend calls OpenAI with tools
   ↓
4. OpenAI decides to call tool (e.g., get_facility_status)
   ↓
5. Backend executes tool, queries database
   ↓
6. Tool result sent back to OpenAI
   ↓
7. OpenAI formulates natural language response
   ↓
8. Response returned to frontend
   ↓
9. Message displayed in chat
```

### CLAW Agent Task Creation

```
1. CLAW detects need for task
   ↓
2. CLAW sends POST to /api/webhooks/claw/task
   ↓
3. Backend validates and creates task in database
   ↓
4. Backend broadcasts task:created event via WebSocket
   ↓
5. Frontend receives event and updates task list
   ↓
6. User sees new task appear in real-time
```

---

## Security Architecture

### Authentication & Authorization

**JWT-Based Authentication:**
- Tokens signed with secret key
- 30-minute expiration
- Refresh mechanism (future)
- Stored in localStorage (frontend)

**Role-Based Access Control (RBAC):**
```typescript
Roles:
- doctor: Own calendar, own policies, facility status (read)
- medical_assistant: Facility ops, assigned doctors' calendars
- admin: Full access

Permissions checked at:
- API route level (middleware)
- Service level (business logic)
- AI assistant tool execution
```

### Data Protection

**In Transit:**
- HTTPS/TLS for all connections
- WebSocket over WSS
- Certificate validation

**At Rest:**
- Database encryption (PostgreSQL)
- Encrypted backups
- Secure credential storage

**PII Handling:**
- Patient names anonymized in logs
- PII filter middleware
- Audit logging for access
- HIPAA compliance measures

### Input Validation

**Layers:**
1. Frontend validation (UX)
2. Zod schema validation (backend)
3. SQL parameterization (injection prevention)
4. Content sanitization (XSS prevention)

### Rate Limiting

**Implemented:**
- 100 requests/minute per user
- Exponential backoff on failures
- IP-based limiting for auth endpoints

---

## Scalability Considerations

### Horizontal Scaling

**Stateless Backend:**
- No server-side session storage
- JWT tokens for authentication
- Redis for shared state

**Load Balancing:**
- Multiple backend instances
- Sticky sessions for WebSocket
- Redis pub/sub for cross-instance events

### Database Optimization

**Indexing Strategy:**
- All foreign keys indexed
- Status fields indexed
- Composite indexes for common queries

**Query Optimization:**
- Prepared statements
- Connection pooling (2-10 connections)
- Query result caching (Redis)

**Partitioning (Future):**
- Partition audit_logs by date
- Archive old patient_flow data

### Caching Strategy

**Levels:**
1. Browser cache (static assets)
2. Redis cache (facility status, policies)
3. Database query cache

**TTL:**
- Facility status: 10 seconds
- Policies: 10 seconds
- Static assets: 1 hour

---

## Monitoring & Observability

### Logging

**Levels:**
- ERROR: System failures
- WARN: Degraded performance
- INFO: Important events
- DEBUG: Detailed diagnostics

**Structured Logging:**
```json
{
  "timestamp": "2024-02-06T10:30:00Z",
  "level": "INFO",
  "userId": "uuid",
  "action": "task_completed",
  "taskId": "uuid",
  "duration": 1234
}
```

### Metrics (Future)

**Application Metrics:**
- Request rate
- Response time (p50, p95, p99)
- Error rate
- Active users

**Business Metrics:**
- Tasks completed (staff vs agent)
- Average wait time
- Room utilization
- Policy conflicts

### Health Checks

**Endpoints:**
- `GET /health` - Basic health
- `GET /health/db` - Database connectivity
- `GET /health/redis` - Redis connectivity
- `GET /health/claw` - CLAW agent status

---

## Deployment Architecture

### Development

```
Local Machine:
- Frontend: Vite dev server (port 5173)
- Backend: tsx watch (port 3000)
- Database: Neon PostgreSQL (cloud)
- Redis: Local or cloud
```

### Production (Recommended)

```
Cloud Provider (AWS/Azure/GCP):

Frontend:
- Static files on CDN (CloudFront/Azure CDN)
- Or served by backend

Backend:
- Container (Docker)
- Orchestration (Kubernetes/ECS)
- Auto-scaling (2-10 instances)
- Load balancer

Database:
- Managed PostgreSQL (RDS/Azure Database)
- Read replicas for scaling
- Automated backups

Cache:
- Managed Redis (ElastiCache/Azure Cache)
- Cluster mode for HA

Monitoring:
- CloudWatch/Azure Monitor
- Application Insights
- Log aggregation (ELK/Splunk)
```

---

## Development Workflow

### Local Setup

```bash
# Clone repository
git clone https://github.com/floyddepalma/medical-facility-dashboard.git

# Install dependencies
npm install

# Configure environment
cp packages/backend/.env.example packages/backend/.env
# Edit .env with your values

# Start development servers
npm run dev  # Starts both frontend and backend
```

### Testing

```bash
# Unit tests
npm test

# Property-based tests
npm run test:property

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Building

```bash
# Build frontend
cd packages/frontend
npm run build

# Build backend
cd packages/backend
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

---

## Technology Decisions

### Why React?
- Component-based architecture
- Large ecosystem
- TypeScript support
- Fast development

### Why Express?
- Minimal and flexible
- Large middleware ecosystem
- Well-documented
- Easy to understand

### Why PostgreSQL?
- ACID compliance (critical for medical data)
- Rich query capabilities
- JSON support for flexible schemas
- Mature and stable

### Why Redis?
- Fast caching
- Pub/sub for WebSocket
- Session storage
- Simple to use

### Why TypeScript?
- Type safety reduces bugs
- Better IDE support
- Self-documenting code
- Easier refactoring

---

## Future Enhancements

### Short Term
- WebSocket implementation
- CLAW agent integration
- CareSync MCP integration
- Google Calendar sync

### Medium Term
- Mobile app (React Native)
- Advanced analytics
- Predictive scheduling
- Voice interface

### Long Term
- Multi-facility support
- Telemedicine integration
- EHR integration
- Machine learning insights
