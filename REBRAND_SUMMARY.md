# CareSync Branding Guide

## Brand Identity

**CareSync** - The unified brand for the medical facility management platform

### Product Components

- **CareSync Dashboard** - The web-based operational management interface
- **CareSync MCP Server** - The Model Context Protocol server for scheduling policies
- **Open CLAW** - The autonomous AI agent (external integration)
- **OpenCV Monitor** - The computer vision monitoring system (external integration)

## Naming Conventions

### Code & Files
- **MCP Client Class**: `CareSyncMCPClient`
- **MCP Client File**: `caresync-mcp-client.ts`
- **MCP Package**: `@caresync/mcp-server`
- **Project Package**: `caresync-dashboard`
- **Variable Names**: `careSyncMCP` (camelCase)

### Environment Variables
- `CARESYNC_MCP_URL` - MCP server connection URL
- `CARESYNC_API_KEY` - API key for MCP authentication
- `CARESYNC_*` - All CareSync-related configuration

### Database
- Database name: `medical_facility_dashboard` (internal, not user-facing)
- Can be updated post-demo if desired

## Files Updated

### Core Configuration
- ✅ `package.json` - Project name: `caresync-dashboard`
- ✅ `packages/backend/package.json` - Package: `@caresync-dashboard/backend`
- ✅ `packages/frontend/package.json` - Package: `@caresync-dashboard/frontend`
- ✅ `README.md` - Project title: "CareSync Dashboard"
- ✅ `.env.example` - All environment variables use CARESYNC_* prefix

### Documentation
- ✅ All steering files (`.kiro/steering/`)
- ✅ All specification files (`.kiro/specs/`)
- ✅ All documentation files (`docs/`)

### Code
- ✅ Backend configuration (`packages/backend/src/config/`)
- ✅ All route files
- ✅ All service files

## Consistency Check

All references throughout the codebase now use "CareSync" branding consistently. No legacy naming remains.

---

**Status**: Complete ✅  
**Last Updated**: February 6, 2026
