# System Integration Requirements

## Introduction

This specification defines the integration of four major components into a unified medical facility management system:

1. **Dashboard UI** - Real-time operational management interface (this repository)
2. **Open CLAW Agent** - Autonomous AI agent for facility operations
3. **CareSync MCP Server** - Scheduling policy management via Model Context Protocol
4. **OpenCV Monitoring** - Computer vision system for facility monitoring

The goal is to create a fully functional system where computer vision feeds facility state, the AI agent makes autonomous decisions within policy constraints, and the dashboard provides human oversight and intervention capabilities.

## Glossary

- **Dashboard**: The web-based operational hub (React/TypeScript frontend + Node.js backend)
- **Open_CLAW**: The autonomous AI agent that manages facility operations
- **CareSync_MCP**: The Model Context Protocol server that manages scheduling policies
- **OpenCV_Monitor**: Computer vision system that monitors facility state (rooms, equipment, patient flow)
- **MCP_Client**: The dashboard's client library for communicating with CareSync MCP Server
- **Facility_State**: Real-time snapshot of rooms, equipment, patients, and staff
- **Policy_Constraint**: Rules enforced by CareSync MCP that govern scheduling decisions
- **Vision_Event**: An event detected by OpenCV (patient arrival, room occupancy change, equipment status)

## Requirements

### Requirement 1: OpenCV → Dashboard Integration

**User Story:** As the system, I want to receive real-time facility state updates from OpenCV monitoring, so that the dashboard displays accurate current conditions.

#### Acceptance Criteria

1. THE OpenCV_Monitor SHALL send facility state updates to the Dashboard via HTTP POST endpoint
2. THE Dashboard SHALL receive and process vision events within 1 second
3. FOR each vision event, THE Dashboard SHALL update the corresponding entity (room, equipment, patient)
4. THE Dashboard SHALL validate vision events before applying state changes
5. WHEN a vision event indicates a critical condition (equipment failure, patient distress), THE Dashboard SHALL create an urgent Action_Required item

### Requirement 2: Dashboard → Open CLAW Communication

**User Story:** As the dashboard, I want to send facility state to Open CLAW, so that the AI agent can make informed operational decisions.

#### Acceptance Criteria

1. THE Dashboard SHALL send facility status updates to Open_CLAW every 10 seconds
2. THE Dashboard SHALL include room status, equipment status, patient counts, and pending tasks in updates
3. THE Dashboard SHALL provide a webhook endpoint for Open_CLAW to create tasks
4. THE Dashboard SHALL provide a webhook endpoint for Open_CLAW to create action items
5. WHEN Open_CLAW is offline, THE Dashboard SHALL queue updates and retry with exponential backoff

### Requirement 3: Open CLAW → Dashboard Task Creation

**User Story:** As Open CLAW, I want to create operational tasks in the dashboard, so that staff can see what I'm handling and intervene if needed.

#### Acceptance Criteria

1. THE Dashboard SHALL accept task creation requests from Open_CLAW via webhook
2. FOR each task created by Open_CLAW, THE Dashboard SHALL mark the assignee as 'agent'
3. THE Dashboard SHALL display agent-created tasks in real-time to connected clients
4. THE Dashboard SHALL allow staff to take over tasks from Open_CLAW
5. WHEN a task fails, Open_CLAW SHALL create an Action_Required item for human intervention

### Requirement 4: CareSync MCP Server Integration

**User Story:** As the dashboard, I want to validate scheduling actions against policies via CareSync MCP, so that appointments comply with doctor availability and rules.

#### Acceptance Criteria

1. THE Dashboard SHALL connect to CareSync_MCP via stdio transport on startup
2. THE Dashboard SHALL use CareSync_MCP to list, create, update, and delete scheduling policies
3. BEFORE creating an appointment, THE Dashboard SHALL validate the action via CareSync_MCP
4. WHEN a scheduling action violates a policy, THE Dashboard SHALL display the conflict and reasoning
5. THE Dashboard SHALL cache policy data with 10-second TTL to reduce MCP calls

### Requirement 5: Open CLAW → CareSync MCP Policy Queries

**User Story:** As Open CLAW, I want to query scheduling policies via CareSync MCP, so that I can make autonomous scheduling decisions within policy constraints.

#### Acceptance Criteria

1. THE Open_CLAW SHALL have direct access to CareSync_MCP for policy queries
2. THE Open_CLAW SHALL validate all scheduling actions before execution
3. WHEN Open_CLAW detects a policy conflict, IT SHALL create an Action_Required item in the Dashboard
4. THE Dashboard SHALL display policy conflicts with human-readable explanations from CareSync_MCP
5. THE Dashboard SHALL allow staff to override policy conflicts with justification

### Requirement 6: AI Assistant Integration with Open CLAW

**User Story:** As a staff member, I want to chat with the AI assistant to query facility state and request actions, with the assistant routing complex queries to Open CLAW.

#### Acceptance Criteria

1. THE AI_Assistant SHALL have a tool to query Open_CLAW for recommendations
2. WHEN a user asks about facility operations, THE AI_Assistant SHALL query Open_CLAW if needed
3. THE AI_Assistant SHALL have a tool to query CareSync_MCP for policy information
4. THE AI_Assistant SHALL display responses from Open_CLAW and CareSync_MCP to the user
5. THE AI_Assistant SHALL allow users to create tasks and action items via natural language

### Requirement 7: Real-Time Event Broadcasting

**User Story:** As a staff member, I want to see facility changes in real-time, so that I can respond immediately to changing conditions.

#### Acceptance Criteria

1. THE Dashboard SHALL broadcast facility state changes via WebSocket to all connected clients
2. WHEN OpenCV detects a vision event, THE Dashboard SHALL broadcast the update within 1 second
3. WHEN Open_CLAW creates a task, THE Dashboard SHALL broadcast the task creation within 1 second
4. WHEN a policy conflict occurs, THE Dashboard SHALL broadcast the conflict to affected users
5. THE Dashboard SHALL maintain WebSocket connections with automatic reconnection on disconnect

### Requirement 8: System Health Monitoring

**User Story:** As an administrator, I want to see the health status of all system components, so that I can identify and resolve integration issues.

#### Acceptance Criteria

1. THE Dashboard SHALL display connection status for OpenCV_Monitor, Open_CLAW, and CareSync_MCP
2. THE Dashboard SHALL perform health checks every 30 seconds for each external system
3. WHEN a system component is offline, THE Dashboard SHALL display a warning banner
4. THE Dashboard SHALL log all integration errors with timestamps and context
5. THE Dashboard SHALL provide a system status page showing uptime and error rates

### Requirement 9: Graceful Degradation

**User Story:** As the system, I want to continue operating when external components are unavailable, so that staff can still manage facility operations.

#### Acceptance Criteria

1. WHEN OpenCV_Monitor is offline, THE Dashboard SHALL allow manual facility state updates
2. WHEN Open_CLAW is offline, THE Dashboard SHALL route all tasks to staff members
3. WHEN CareSync_MCP is offline, THE Dashboard SHALL display cached policies in read-only mode
4. THE Dashboard SHALL queue policy changes for when CareSync_MCP returns online
5. THE Dashboard SHALL display clear indicators of degraded functionality

### Requirement 10: End-to-End Workflow Testing

**User Story:** As a developer, I want to test complete workflows across all system components, so that I can verify integration correctness.

#### Acceptance Criteria

1. THE System SHALL support a demo mode with simulated OpenCV events
2. THE System SHALL support a demo mode with simulated Open CLAW behavior
3. THE System SHALL provide seed data for realistic demo scenarios
4. THE System SHALL log all inter-component communication for debugging
5. THE System SHALL provide integration test scripts for critical workflows

### Requirement 11: API Contract Documentation

**User Story:** As a developer, I want clear API contracts for all integration points, so that I can implement and test integrations correctly.

#### Acceptance Criteria

1. THE Dashboard SHALL document the OpenCV webhook endpoint with request/response schemas
2. THE Dashboard SHALL document the Open CLAW webhook endpoints with schemas
3. THE Dashboard SHALL document the CareSync MCP tool calls with parameters
4. THE Dashboard SHALL provide OpenAPI/Swagger documentation for all HTTP endpoints
5. THE Dashboard SHALL provide example requests and responses for each integration point

### Requirement 12: Security and Authentication

**User Story:** As an administrator, I want all inter-component communication to be authenticated and encrypted, so that the system is secure.

#### Acceptance Criteria

1. THE Dashboard SHALL require API keys for OpenCV webhook endpoints
2. THE Dashboard SHALL require API keys for Open CLAW webhook endpoints
3. THE Dashboard SHALL use TLS/HTTPS for all HTTP communication
4. THE Dashboard SHALL validate webhook signatures to prevent spoofing
5. THE Dashboard SHALL rate-limit webhook endpoints to prevent abuse

## Integration Architecture

```
┌─────────────────────┐
│  OpenCV Monitor     │ ← Computer Vision
│  (External System)  │
└──────────┬──────────┘
           │ HTTP POST (vision events)
           ↓
┌─────────────────────┐
│  Dashboard Backend  │ ← Central Hub (Node.js/Express)
│  - API Server       │
│  - WebSocket Server │
│  - MCP Client       │
└─────┬───────┬───────┘
      │       │
      │       └────────→ ┌─────────────────────┐
      │                  │  CareSync MCP       │ ← Policy Engine
      │                  │  Server             │
      │                  │  (stdio/HTTP)       │
      │                  └─────────────────────┘
      │
      ↓
┌─────────────────────┐
│  Open CLAW Agent    │ ← Autonomous AI
│  (External System)  │
└─────────────────────┘
      ↑
      │ HTTP (facility status, task creation)
      │
┌─────────────────────┐
│  Dashboard Frontend │ ← User Interface
│  (React/TypeScript) │
└─────────────────────┘
```

## Component Responsibilities

### Dashboard Backend
- Receive vision events from OpenCV
- Send facility status to Open CLAW
- Receive task/action creation from Open CLAW
- Query CareSync MCP for policy validation
- Broadcast real-time updates via WebSocket
- Maintain system health monitoring

### Open CLAW Agent
- Receive facility status from Dashboard
- Make autonomous operational decisions
- Create tasks and action items via Dashboard webhooks
- Query CareSync MCP for policy compliance
- Request human intervention when needed

### CareSync MCP Server
- Store and manage scheduling policies
- Validate scheduling actions against policies
- Provide human-readable policy explanations
- Enforce policy constraints

### OpenCV Monitor
- Monitor facility via cameras
- Detect room occupancy changes
- Detect equipment status changes
- Detect patient flow events
- Send vision events to Dashboard

## Success Criteria

The integration is successful when:

1. OpenCV events update dashboard in real-time (< 1 second)
2. Open CLAW creates tasks that appear in dashboard immediately
3. CareSync MCP validates scheduling actions correctly
4. AI Assistant can query both Open CLAW and CareSync MCP
5. System continues operating when any component is offline
6. All components can be demonstrated in Monday's demo
7. Integration tests pass for all critical workflows
