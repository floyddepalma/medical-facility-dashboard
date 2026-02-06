# Product Overview

## Medical Facility Dashboard

A real-time operational management system for small medical practices with multiple doctors. The dashboard serves as a central hub for managing facility operations, scheduling policies, room/equipment status, and task coordination.

### Core Purpose

Enable medical staff to focus on patient care by surfacing only what requires human attention while an AI agent (Open CLAW) handles routine operations autonomously.

### Key Capabilities

- **Operational Status**: Real-time visibility into rooms, equipment, and patient flow
- **Action Management**: Prioritized list of items requiring human attention
- **Scheduling Policies**: Manage doctor availability and appointment rules via Nora RX MCP Server
- **Task Coordination**: Track operational tasks handled by staff or AI agent
- **Multi-Doctor Support**: Medical assistants can manage multiple doctors from unified view
- **Performance Metrics**: Daily operations summary and trend analysis

### Design Principles

1. **Human-in-the-Loop**: Surface only what requires human decision-making
2. **Context-Rich**: Provide all relevant information for quick decisions
3. **Real-Time**: Update information within seconds
4. **Role-Aware**: Support single-doctor and multi-doctor workflows
5. **Graceful Degradation**: Continue operations when AI agent unavailable
