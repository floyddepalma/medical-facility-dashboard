# Implementation Plan: Medical Facility Dashboard

## Overview

This implementation plan breaks down the Medical Facility Dashboard into incremental coding steps. The dashboard is a real-time web application built with React/TypeScript frontend and Node.js/Express backend, integrating with the CareSync MCP Server for scheduling policy management and the Open CLAW Agent for task coordination.

The implementation follows a bottom-up approach: data models → backend API → integration layer → frontend components → real-time features → testing.

## Tasks

- [ ] 1. Set up project structure and core infrastructure
  - Initialize monorepo with frontend (React/TypeScript) and backend (Node.js/Express) packages
  - Configure TypeScript, ESLint, Prettier for both packages
  - Set up PostgreSQL database with initial schema
  - Set up Redis for caching and real-time state
  - Configure environment variables and secrets management
  - Set up testing frameworks (Jest for unit tests, fast-check for property tests)
  - _Requirements: 10.3, 11.2_

- [ ] 2. Implement core data models and database schema
  - [ ] 2.1 Create database schema for core entities
    - Define tables for User, Doctor, Room, Equipment, ActionItem, Task, Policy, AuditLog
    - Add indexes on frequently queried fields (doctorId, status, date)
    - Create database views for complex aggregations (daily metrics)
    - _Requirements: 1.1, 1.2, 4.1, 5.1, 12.1_
  
  - [ ] 2.2 Implement TypeScript data model interfaces
    - Create interfaces for User, Doctor, Room, Equipment, ActionItem, Task, FacilityStatus, DailyMetrics
    - Add type definitions for policy types and scheduling actions
    - Create validation schemas using Zod
    - _Requirements: 1.1, 1.2, 4.1, 5.1, 12.1_
  
  - [ ]* 2.3 Write property test for data model validation
    - **Property 24: PII Filtering**
    - **Validates: Requirements 11.5**

- [ ] 3. Implement authentication and authorization
  - [ ] 3.1 Create authentication service with JWT
    - Implement login endpoint with credential validation
    - Generate JWT tokens with user role and permissions
    - Create middleware for token validation
    - Implement session management with Redis
    - _Requirements: 11.1, 11.4_
  
  - [ ] 3.2 Implement role-based access control
    - Create authorization middleware for role checking
    - Define permissions for doctor, medical_assistant, admin roles
    - Implement doctor-to-medical-assistant access mapping
    - _Requirements: 11.1, 14.1_
  
  - [ ]* 3.3 Write property test for authentication
    - **Property 22: Authentication Requirement**
    - **Validates: Requirements 11.1**

- [ ] 4. Implement CareSync MCP client integration
  - [ ] 4.1 Create MCP client wrapper
    - Implement CareSyncMCPClient interface with all policy operations
    - Add connection management and error handling
    - Implement retry logic with exponential backoff
    - Add request/response logging
    - _Requirements: 12.1, 12.3, 12.4, 13.1_
  
  - [ ] 4.2 Implement policy management functions
    - Create functions for listPolicies, getPolicy, createPolicy, updatePolicy, deletePolicy
    - Implement policy_check for validation
    - Implement policy_explain for human-readable explanations
    - Add caching layer for policy data (Redis, TTL: 10s)
    - _Requirements: 12.1, 12.3, 12.4, 12.6, 13.1_
  
  - [ ]* 4.3 Write property tests for policy operations
    - **Property 26: Policy Creation Validation**
    - **Validates: Requirements 12.3**
  
  - [ ]* 4.4 Write property test for policy validation
    - **Property 28: Scheduling Action Validation**
    - **Validates: Requirements 13.1, 13.3, 13.4, 13.5**

- [ ] 5. Implement Open CLAW Agent client integration
  - [ ] 5.1 Create Open CLAW Agent client
    - Implement OpenCLAWClient interface with task operations
    - Add health check and status monitoring
    - Implement task execution and takeover functions
    - Add error handling for agent offline scenarios
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [ ] 5.2 Implement agent status monitoring
    - Create periodic health check (every 10 seconds)
    - Detect agent offline and update status
    - Implement task routing logic based on agent availability
    - _Requirements: 9.2, 9.3_
  
  - [ ]* 5.3 Write property tests for agent integration
    - **Property 19: Agent Failure Handling**
    - **Validates: Requirements 9.1**
  
  - [ ]* 5.4 Write property test for agent unavailability
    - **Property 20: Agent Unavailability Routing**
    - **Validates: Requirements 9.2**

- [ ] 6. Checkpoint - Ensure integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement facility status API endpoints
  - [ ] 7.1 Create facility status endpoints
    - Implement GET /api/facility/status for current operational status
    - Implement GET /api/rooms for room listing with status
    - Implement PUT /api/rooms/:id/status for room status updates
    - Implement GET /api/equipment for equipment listing
    - Implement PUT /api/equipment/:id for equipment updates
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.5_
  
  - [ ]* 7.2 Write property tests for facility status
    - **Property 1: Room Status Display Completeness**
    - **Validates: Requirements 1.1, 1.2**
  
  - [ ]* 7.3 Write property test for patient counts
    - **Property 2: Patient Count Accuracy**
    - **Validates: Requirements 1.3**
  
  - [ ]* 7.4 Write property test for equipment status
    - **Property 11: Equipment Status Display**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 8. Implement action items API endpoints
  - [ ] 8.1 Create action item endpoints
    - Implement GET /api/actions for listing action items
    - Implement POST /api/actions for creating action items
    - Implement PUT /api/actions/:id for updating action items
    - Implement DELETE /api/actions/:id for dismissing action items
    - Add filtering by urgency, doctor, status
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [ ]* 8.2 Write property tests for action items
    - **Property 3: Action Item Prioritization**
    - **Validates: Requirements 2.1**
  
  - [ ]* 8.3 Write property test for action item fields
    - **Property 4: Action Item Required Fields**
    - **Validates: Requirements 2.3**
  
  - [ ]* 8.4 Write property test for action item state transitions
    - **Property 5: Action Item State Transitions**
    - **Validates: Requirements 2.4**

- [ ] 9. Implement task management API endpoints
  - [ ] 9.1 Create task endpoints
    - Implement GET /api/tasks for listing operational tasks
    - Implement POST /api/tasks for creating tasks
    - Implement PUT /api/tasks/:id for updating tasks (reassign, add notes, mark complete)
    - Implement GET /api/tasks/history for completed tasks with filtering
    - Add filtering by assignee, doctor, status, task type
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1_
  
  - [ ]* 9.2 Write property tests for task management
    - **Property 8: Task Display Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3**
  
  - [ ]* 9.3 Write property test for task creation
    - **Property 9: Task Creation and Assignment**
    - **Validates: Requirements 4.4**
  
  - [ ]* 9.4 Write property test for task reassignment
    - **Property 10: Task Reassignment**
    - **Validates: Requirements 4.5**
  
  - [ ]* 9.5 Write property test for task notes
    - **Property 14: Task Notes Persistence**
    - **Validates: Requirements 7.1**

- [ ] 10. Implement scheduling policy API endpoints
  - [ ] 10.1 Create policy endpoints (proxying to MCP)
    - Implement GET /api/policies for listing policies
    - Implement GET /api/policies/:id for policy details
    - Implement POST /api/policies for creating policies
    - Implement PUT /api/policies/:id for updating policies
    - Implement DELETE /api/policies/:id for deleting policies
    - Implement POST /api/policies/check for validation
    - Implement GET /api/policies/:id/explain for explanations
    - _Requirements: 12.1, 12.3, 12.4, 12.6, 13.1_
  
  - [ ]* 10.2 Write property test for policy display
    - **Property 25: Policy Display Organization**
    - **Validates: Requirements 12.1**
  
  - [ ]* 10.3 Write property test for policy modification
    - **Property 27: Policy Modification**
    - **Validates: Requirements 12.4**

- [ ] 11. Implement metrics and analytics API endpoints
  - [ ] 11.1 Create metrics calculation functions
    - Implement daily patient count calculation
    - Implement average visit duration calculation
    - Implement task completion categorization (staff vs agent)
    - Implement room utilization calculation
    - Implement 7-day average comparison
    - _Requirements: 3.1, 3.2, 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 11.2 Create metrics endpoints
    - Implement GET /api/metrics/daily for daily operations summary
    - Implement GET /api/metrics/trends for 7-day trend data
    - Add caching for expensive calculations
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ]* 11.3 Write property tests for metrics calculations
    - **Property 6: Wait Time Calculation**
    - **Validates: Requirements 3.1**
  
  - [ ]* 11.4 Write property test for occupancy rate
    - **Property 7: Occupancy Rate Calculation**
    - **Validates: Requirements 3.2**
  
  - [ ]* 11.5 Write property test for daily patient count
    - **Property 15: Daily Patient Count**
    - **Validates: Requirements 8.1**
  
  - [ ]* 11.6 Write property test for visit duration
    - **Property 16: Visit Duration Calculation**
    - **Validates: Requirements 8.2**
  
  - [ ]* 11.7 Write property test for task categorization
    - **Property 17: Task Completion Categorization**
    - **Validates: Requirements 8.3**
  
  - [ ]* 11.8 Write property test for room utilization
    - **Property 18: Room Utilization Calculation**
    - **Validates: Requirements 8.4**

- [ ] 12. Implement multi-doctor support API endpoints
  - [ ] 12.1 Create doctor management endpoints
    - Implement GET /api/doctors for listing doctors (filtered by user access)
    - Implement GET /api/doctors/:id for doctor details
    - Add filtering for multi-doctor views
    - _Requirements: 14.1, 14.2_
  
  - [ ]* 12.2 Write property test for multi-doctor filtering
    - **Property 29: Multi-Doctor Task Filtering**
    - **Validates: Requirements 14.2**
  
  - [ ]* 12.3 Write property test for cross-doctor conflicts
    - **Property 30: Cross-Doctor Conflict Detection**
    - **Validates: Requirements 14.5**

- [ ] 13. Implement audit logging
  - [ ] 13.1 Create audit logging middleware
    - Implement middleware to log all state-changing operations
    - Capture user ID, action type, timestamp, affected resource
    - Store audit logs in database
    - _Requirements: 11.3_
  
  - [ ]* 13.2 Write property test for audit logging
    - **Property 23: Audit Log Completeness**
    - **Validates: Requirements 11.3**

- [ ] 14. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Implement WebSocket server for real-time updates
  - [ ] 15.1 Create WebSocket server
    - Set up WebSocket server with ws library
    - Implement connection authentication
    - Create subscription management (facility, actions, tasks, doctor)
    - Implement Redis pub/sub for multi-server synchronization
    - _Requirements: 2.2, 10.4_
  
  - [ ] 15.2 Implement event broadcasting
    - Create event emitters for facility status changes
    - Broadcast room updates, equipment updates, action item changes
    - Broadcast task updates and policy conflicts
    - Implement agent status change notifications
    - _Requirements: 1.1, 1.2, 2.2, 4.1, 5.1, 9.2_
  
  - [ ] 15.3 Add WebSocket error handling
    - Implement reconnection logic with exponential backoff
    - Handle disconnections gracefully
    - Implement connection status indicator
    - _Requirements: 10.4_

- [ ] 16. Implement React frontend - Core layout and navigation
  - [ ] 16.1 Create dashboard layout component
    - Implement main layout with navigation
    - Add user profile display with role
    - Create doctor selector for multi-doctor views
    - Add connection status indicator
    - _Requirements: 10.3, 14.2, 14.4_
  
  - [ ] 16.2 Implement authentication UI
    - Create login page with form validation
    - Implement JWT token storage and refresh
    - Add session expiration warning
    - Create logout functionality
    - _Requirements: 11.1, 11.4_

- [ ] 17. Implement React frontend - Operational status panel
  - [ ] 17.1 Create operational status panel component
    - Display room grid with status indicators
    - Show patient flow summary
    - Display equipment status
    - Show current time and operating hours
    - Add highlighting for items requiring attention
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 17.2 Connect to WebSocket for real-time updates
    - Subscribe to facility status updates
    - Update UI when room status changes
    - Update UI when equipment status changes
    - _Requirements: 1.1, 1.2, 10.4_

- [ ] 18. Implement React frontend - Action items panel
  - [ ] 18.1 Create action items list component
    - Display prioritized list with urgency indicators
    - Show task description, affected resource, time waiting
    - Implement mark complete and mark in progress actions
    - Add filtering by type, doctor, status
    - _Requirements: 2.1, 2.3, 2.4_
  
  - [ ] 18.2 Create action item detail view
    - Display full context including related entities
    - Show reasoning for action item creation
    - Provide quick access to related tasks and resources
    - _Requirements: 6.1, 6.3_
  
  - [ ] 18.3 Connect to WebSocket for real-time action updates
    - Subscribe to action item updates
    - Add new action items to list in real-time
    - Update action item status in real-time
    - Remove completed items from active list
    - _Requirements: 2.2, 2.5_

- [ ] 19. Implement React frontend - Task management panel
  - [ ] 19.1 Create task list component
    - Display current tasks and completed tasks
    - Show task type, assignee, start time, status
    - Implement create task form
    - Add reassign task functionality
    - Add notes to tasks
    - Implement filtering by assignee, doctor, status, type
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1_
  
  - [ ] 19.2 Display agent vs staff task categorization
    - Show which tasks are handled by agent vs staff
    - Display agent status prominently
    - Implement task takeover from agent
    - _Requirements: 9.3, 9.4_
  
  - [ ] 19.3 Connect to WebSocket for real-time task updates
    - Subscribe to task updates
    - Update task list in real-time
    - Show active staff members
    - Display assistance requests
    - _Requirements: 7.2, 7.3, 7.4_

- [ ] 20. Implement React frontend - Scheduling policy manager
  - [ ] 20.1 Create policy list component
    - Display policies organized by type
    - Show policy details and status
    - Implement policy filtering by doctor
    - _Requirements: 12.1, 12.2_
  
  - [ ] 20.2 Create policy creation/edit form
    - Implement form for each policy type
    - Add validation before submission
    - Display validation errors clearly
    - Show human-readable policy explanations
    - _Requirements: 12.3, 12.4, 12.6_
  
  - [ ] 20.3 Create scheduling action validation UI
    - Implement validation check form
    - Display validation results with conflict details
    - Show reasoning for validation results
    - Allow immediate execution of valid actions
    - _Requirements: 13.1, 13.3, 13.4, 13.5_

- [ ] 21. Implement React frontend - Multi-doctor view
  - [ ] 21.1 Create multi-doctor dashboard component
    - Display unified view across all assigned doctors
    - Implement doctor selector with quick switching
    - Show side-by-side schedule comparison
    - Highlight cross-doctor conflicts
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_
  
  - [ ] 21.2 Implement doctor-specific filtering
    - Filter tasks by doctor
    - Filter action items by doctor
    - Show which doctor each room is used by
    - _Requirements: 14.2, 14.3_

- [ ] 22. Implement React frontend - Performance metrics dashboard
  - [ ] 22.1 Create daily metrics summary component
    - Display total patients seen
    - Show average visit duration and wait time
    - Display task completion breakdown (staff vs agent)
    - Show room utilization percentages
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  
  - [ ] 22.2 Create trend visualization component
    - Implement charts for task volume over 7 days
    - Show room utilization timeline
    - Display comparison to 7-day average
    - _Requirements: 8.5_
  
  - [ ] 22.3 Create room usage timeline component
    - Display visual timeline of room usage for current day
    - Show estimated availability times
    - _Requirements: 3.4, 3.5_

- [ ] 23. Implement error handling and user feedback
  - [ ] 23.1 Create error handling utilities
    - Implement error boundary components
    - Create toast notification system
    - Add loading states for async operations
    - Display user-friendly error messages
    - _Requirements: 10.2_
  
  - [ ] 23.2 Implement graceful degradation
    - Handle MCP server unavailable (show cached data, disable writes)
    - Handle agent offline (show status, route tasks to staff)
    - Handle WebSocket disconnection (show indicator, attempt reconnect)
    - _Requirements: 9.2_

- [ ] 24. Implement security features
  - [ ] 24.1 Add input validation and sanitization
    - Validate all user inputs on client side
    - Sanitize user-generated content before display
    - Implement CSRF protection
    - _Requirements: 11.2, 11.5_
  
  - [ ] 24.2 Implement PII filtering
    - Filter patient identifiable information from displays
    - Redact PII in task descriptions and logs
    - _Requirements: 11.5_
  
  - [ ]* 24.3 Write unit tests for PII filtering
    - Test that names, medical record numbers are redacted
    - Test edge cases with various PII formats
    - _Requirements: 11.5_

- [ ] 25. Implement performance optimizations
  - [ ] 25.1 Add caching layer
    - Implement Redis caching for facility status (TTL: 10s)
    - Cache policy data from MCP server
    - Add in-memory caching for frequently accessed data
    - _Requirements: 10.1, 10.2_
  
  - [ ] 25.2 Optimize database queries
    - Add database indexes on frequently queried fields
    - Implement pagination for task history and audit logs
    - Use database views for complex aggregations
    - _Requirements: 10.1, 10.5_
  
  - [ ] 25.3 Optimize frontend rendering
    - Implement React.memo for expensive components
    - Add virtualization for long lists
    - Optimize WebSocket message handling
    - _Requirements: 10.2, 10.5_

- [ ] 26. Final checkpoint - End-to-end testing
  - [ ] 26.1 Test complete user workflows
    - Test authentication and session management
    - Test policy creation and validation workflow
    - Test task assignment and completion workflow
    - Test multi-doctor context switching
    - Test real-time updates via WebSocket
  
  - [ ] 26.2 Test error scenarios
    - Test MCP server unavailable handling
    - Test agent offline handling
    - Test WebSocket disconnection handling
    - Test invalid input handling
  
  - [ ] 26.3 Verify all property tests pass
    - Run all 30 property tests with 100 iterations each
    - Verify all unit tests pass
    - Check test coverage meets 80% goal
  
  - [ ] 26.4 Final review
    - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties with 100 iterations minimum
- Unit tests validate specific examples and edge cases
- The implementation follows a bottom-up approach: backend → integration → frontend
- Real-time features are implemented after core functionality is stable
- Performance optimizations are done after functional correctness is verified
