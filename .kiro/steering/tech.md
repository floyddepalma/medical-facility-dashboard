# Technology Stack

## Architecture

Monorepo with separate frontend and backend packages.

### Frontend
- **Framework**: React with TypeScript
- **Real-Time**: WebSocket client for live updates
- **Build**: Standard React tooling (to be configured)

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Language**: TypeScript
- **WebSocket**: ws library
- **Database**: PostgreSQL for persistent data
- **Cache**: Redis for real-time state and caching

### Integration Layer
- **Nora RX MCP Server**: Scheduling policy management via MCP client
- **Open CLAW Agent**: AI task coordination via HTTP

### Authentication
- JWT-based authentication with role-based access control

## Testing

### Frameworks
- **Unit Tests**: Jest
- **Property-Based Tests**: fast-check (minimum 100 iterations per property)

### Coverage Goals
- Unit test coverage: 80% minimum
- All 30 correctness properties implemented
- Integration tests for critical workflows

### Test Approach
Dual testing strategy:
- **Unit tests**: Specific examples, edge cases, error conditions
- **Property tests**: Universal correctness across all inputs

## Common Commands

### Development
```bash
# Install dependencies (when package.json exists)
npm install

# Start development servers
npm run dev

# Run tests
npm test

# Run property-based tests
npm run test:property
```

### Database
```bash
# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

### Build
```bash
# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Performance Considerations

- Database indexes on frequently queried fields (doctorId, status, date)
- Redis caching with 10s TTL for facility status and policies
- Redis pub/sub for multi-server WebSocket synchronization
- Pagination for task history and audit logs
- Database views for complex aggregations

## Security

- Input validation on client and server
- Parameterized queries (no SQL injection)
- XSS prevention via content sanitization
- CSRF protection for state-changing operations
- Rate limiting: 100 requests/minute per user
- HTTPS/TLS for all connections
- Audit logging for all actions
