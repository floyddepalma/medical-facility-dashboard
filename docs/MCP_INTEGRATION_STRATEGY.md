# CareSync MCP Integration Strategy

## Overview

This document explains how the CareSync Dashboard integrates with the CareSync MCP Server for scheduling policy management.

## Architecture Decision

**The CareSync MCP Server remains a separate service.** The dashboard acts as a **client** that consumes the MCP server's tools.

### Why Keep Them Separate?

1. **Separation of Concerns**
   - MCP Server = Policy validation logic
   - Dashboard = UI and operational management
   
2. **Reusability**
   - Other systems can use the MCP server
   - MCP server can be deployed independently
   
3. **MCP Philosophy**
   - MCP servers are meant to be standalone services
   - They expose tools via the Model Context Protocol
   
4. **Faster Development**
   - Focus on integration, not rebuilding
   - Leverage existing MCP server code

## Component Responsibilities

### CareSync MCP Server (Separate Service)
- **Location**: Separate repository/package
- **Purpose**: Policy validation engine
- **Responsibilities**:
  - Store and validate scheduling policies
  - Check scheduling actions against policies
  - Provide human-readable policy explanations
  - Detect and report policy conflicts
  
- **Exposed Tools** (via MCP):
  - `list_policies` - List all policies for a doctor
  - `get_policy` - Get specific policy details
  - `create_policy` - Create new policy
  - `update_policy` - Update existing policy
  - `delete_policy` - Delete policy
  - `check_scheduling` - Validate scheduling action
  - `explain_policy` - Get human explanation

### CareSync Dashboard (This Repository)
- **Location**: This repository
- **Purpose**: Operational management UI
- **Responsibilities**:
  - Display facility status
  - Manage tasks and action items
  - Provide UI for policy management
  - Integrate with Open CLAW agent
  - Integrate with OpenCV monitoring
  
- **MCP Client**: `packages/backend/src/services/caresync-mcp-client.ts`
  - Connects to MCP server via stdio
  - Calls MCP tools for policy operations
  - Caches policy data (10s TTL)
  - Handles MCP server offline gracefully

## Shared Schema

The policy schema is the **contract** between the MCP server and dashboard.

**File**: `packages/backend/src/types/policy-schema.ts`

This schema defines:
- Policy types (AVAILABILITY, BLOCK, OVERRIDE, etc.)
- Policy data structures
- Validation rules
- Scheduling action format
- Validation result format

### Schema Sharing Options

**Option 1: Duplicate Schema** (Recommended for demo)
- Copy schema to both MCP server and dashboard
- Fastest to implement
- Keep schemas in sync manually

**Option 2: Shared NPM Package** (Better long-term)
- Publish schema as `@caresync/policy-schema` package
- Both systems import from package
- Single source of truth
- Requires npm publish setup

**Option 3: Git Submodule**
- Schema in separate git repo
- Both systems reference as submodule
- More complex setup

## Integration Flow

### Policy Management Flow

```
┌─────────────────┐
│  Dashboard UI   │
│  (React)        │
└────────┬────────┘
         │ HTTP POST /api/policies
         ↓
┌─────────────────┐
│  Dashboard API  │
│  (Express)      │
└────────┬────────┘
         │ MCP Client
         ↓
┌─────────────────┐
│  CareSync MCP   │
│  Server         │
│  (stdio)        │
└─────────────────┘
```

### Scheduling Validation Flow

```
User wants to book appointment
         ↓
Dashboard UI sends scheduling action
         ↓
Dashboard API calls MCP check_scheduling
         ↓
MCP Server validates against policies
         ↓
Returns validation result (valid/conflicts)
         ↓
Dashboard displays result to user
```

## Implementation Steps

### 1. Install MCP SDK
```bash
cd packages/backend
npm install @modelcontextprotocol/sdk
```

### 2. Create MCP Client
File: `packages/backend/src/services/caresync-mcp-client.ts`

Connects to MCP server and wraps tool calls in TypeScript methods.

### 3. Create Policy API Routes
File: `packages/backend/src/routes/policies.ts`

HTTP endpoints that proxy to MCP server:
- `GET /api/policies` → calls `list_policies`
- `POST /api/policies` → calls `create_policy`
- `POST /api/policies/check` → calls `check_scheduling`
- etc.

### 4. Add Caching Layer
Use Redis to cache policy data (10s TTL) to reduce MCP calls.

### 5. Handle MCP Offline
When MCP server unavailable:
- Display cached policies (read-only)
- Disable policy creation/modification
- Show warning banner
- Queue policy changes for when MCP returns

## Environment Configuration

### Dashboard `.env`
```env
# CareSync MCP Server Connection
CARESYNC_MCP_COMMAND=npx
CARESYNC_MCP_ARGS=-y,@caresync/mcp-server

# Or if running locally:
# CARESYNC_MCP_COMMAND=node
# CARESYNC_MCP_ARGS=/path/to/mcp-server/dist/index.js
```

### MCP Server Configuration
The MCP server runs independently and doesn't need to know about the dashboard.

## Testing Strategy

### Unit Tests
- Test MCP client methods
- Test policy API endpoints
- Test caching logic
- Test offline handling

### Integration Tests
- Test end-to-end policy creation
- Test scheduling validation
- Test MCP server connection
- Test graceful degradation

### Demo Mode
For testing without MCP server:
```typescript
// Mock MCP client for demo
if (process.env.DEMO_MODE === 'true') {
  // Use mock responses
}
```

## Deployment

### Development
1. Start MCP server: `npm run start` (in MCP server repo)
2. Start dashboard backend: `npm run dev` (in dashboard repo)
3. Dashboard connects to MCP server via stdio

### Production
1. Deploy MCP server as standalone service
2. Deploy dashboard with MCP connection config
3. Dashboard connects to MCP server via stdio or HTTP

## Troubleshooting

### MCP Connection Issues
- Check `CARESYNC_MCP_COMMAND` and `CARESYNC_MCP_ARGS`
- Verify MCP server is installed/accessible
- Check MCP server logs
- Test MCP server independently

### Policy Validation Errors
- Check policy schema matches between systems
- Verify policy data format
- Check MCP server validation logic
- Review MCP server error messages

### Performance Issues
- Check Redis cache is working
- Monitor MCP call frequency
- Consider increasing cache TTL
- Add request batching if needed

## Future Enhancements

1. **HTTP Transport**: Switch from stdio to HTTP for better scalability
2. **WebSocket Updates**: Real-time policy change notifications
3. **Policy Versioning**: Track policy changes over time
4. **Conflict Resolution UI**: Better UI for resolving policy conflicts
5. **Policy Templates**: Pre-built policy templates for common scenarios

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- Policy Schema: `packages/backend/src/types/policy-schema.ts`
- MCP Client: `packages/backend/src/services/caresync-mcp-client.ts`
