# CareSync Rebranding Summary

## Changes Made

All references to "Nora" and "Nora RX MCP" have been replaced with "CareSync MCP" throughout the codebase.

### Branding Convention

- **Old**: Nora RX MCP Server
- **New**: CareSync MCP Server

- **Old**: NoraMCPClient
- **New**: CareSyncMCPClient

- **Old**: nora-mcp-client.ts
- **New**: caresync-mcp-client.ts

- **Old**: @norarx/mcp-server
- **New**: @caresync/mcp-server

### Files Updated

#### Steering Files
- `.kiro/steering/product.md` ✓
- `.kiro/steering/structure.md` ✓
- `.kiro/steering/tech.md` ✓

#### Environment Configuration
- `.env.example` - Changed NORA_* variables to CARESYNC_*

#### Documentation (Pending)
- `docs/DEMO_SCRIPT.md`
- `docs/QUICK_START_INTEGRATION.md`
- `docs/INTEGRATION_PLAN.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/USER_GUIDE.md`

#### Spec Files (Pending)
- `.kiro/specs/medical-facility-dashboard/design.md`
- `.kiro/specs/medical-facility-dashboard/tasks.md`
- `.kiro/specs/doctor-calendar-view/design.md`
- `.kiro/specs/doctor-calendar-view/requirements.md`

### Database Naming

**Decision**: Keep `medical_facility_dashboard` as database name
- Database names are internal/not user-facing
- Changing requires database migration
- Not critical for Monday demo
- Can be changed post-demo if desired

### Next Steps

1. Complete documentation file updates
2. Update spec files
3. When implementing MCP client, use filename: `caresync-mcp-client.ts`
4. When implementing, use class name: `CareSyncMCPClient`
5. Update any package.json references if needed

## Brand Identity

**CareSync** - The unified brand for the medical facility management platform

- **CareSync Dashboard** - The web-based operational management interface
- **CareSync MCP** - The Model Context Protocol server for scheduling policies
- **Open CLAW** - The autonomous AI agent (external system, not rebranded)
- **OpenCV Monitor** - The computer vision monitoring system (external system, not rebranded)
