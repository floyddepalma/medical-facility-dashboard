# Implementation Plan: Doctor Calendar View

## Overview

This implementation plan breaks down the Doctor Calendar View feature into incremental tasks. The approach follows a bottom-up strategy: starting with data models and backend services, then building frontend components, and finally integrating real-time updates and testing. Each task builds on previous work to ensure continuous integration without orphaned code.

## Tasks

- [ ] 1. Set up data models and types
  - [ ] 1.1 Create shared TypeScript types for Appointment and TimeBlock
    - Define Appointment interface with all fields (id, doctorId, patientName, appointmentType, startTime, endTime, duration, status, notes, policyId)
    - Define TimeBlock interface with fields (id, doctorId, startTime, endTime, reason, description)
    - Define CalendarViewState interface for frontend state management
    - Define AppointmentEvent interface for WebSocket events
    - Add types to `packages/backend/src/types/calendar.ts` and `packages/frontend/src/types/calendar.ts`
    - _Requirements: 1.1, 1.2, 5.1, 6.1_

  - [ ] 1.2 Write property test for type completeness
    - **Property 1: Appointment Rendering Completeness**
    - **Validates: Requirements 1.2**

- [ ] 2. Implement backend calendar service
  - [ ] 2.1 Extend Nora MCP Client with appointment query methods
    - Add `queryAppointments(doctorId, startDate, endDate)` method
    - Add `getTimeBlocks(doctorId, startDate, endDate)` method
    - Add `subscribeToAppointmentUpdates(doctorId, callback)` method
    - Implement data transformation from Nora format to dashboard format
    - Add error handling for MCP connection failures
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 2.2 Create CalendarService for business logic
    - Implement `getAppointments(doctorId, startDate, endDate)` method
    - Implement `checkAccess(userId, userRole, doctorId)` for role-based access control
    - Implement `getTimeBlocks(doctorId, startDate, endDate)` method
    - Implement `formatAppointmentData()` for frontend consumption
    - Add caching logic with 60-second TTL
    - _Requirements: 3.1, 3.4, 9.1, 9.2, 9.3_

  - [ ] 2.3 Write property test for access control
    - **Property 15: Role-Based Access Control**
    - **Validates: Requirements 9.1, 9.2, 9.3**

  - [ ] 2.4 Write property test for cache effectiveness
    - **Property 6: Cache Effectiveness**
    - **Validates: Requirements 3.4**

  - [ ] 2.5 Write unit tests for CalendarService
    - Test error handling when Nora MCP unavailable
    - Test data transformation from Nora format
    - Test cache invalidation on updates
    - _Requirements: 3.3, 11.1, 11.2_

- [ ] 3. Implement backend API routes
  - [ ] 3.1 Create calendar routes
    - Add `GET /api/calendar/appointments` endpoint with query params (startDate, endDate, doctorId)
    - Add `GET /api/calendar/doctors/:id/appointments` endpoint
    - Implement request validation using Zod schemas
    - Implement role-based access control middleware
    - Add error handling for unauthorized access (403), invalid requests (400), not found (404)
    - Add audit logging for all calendar access
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 10.3_

  - [ ] 3.2 Write property test for date range validation
    - **Property 16: Query Date Range Limit**
    - **Validates: Requirements 10.3**

  - [ ] 3.3 Write unit tests for calendar routes
    - Test 403 error for unauthorized access
    - Test 400 error for invalid date ranges
    - Test 404 error for invalid doctor ID
    - Test successful response for valid requests
    - _Requirements: 9.4, 11.1, 11.2_

- [ ] 4. Implement WebSocket events for real-time updates
  - [ ] 4.1 Add appointment update events to WebSocket server
    - Add `appointment:created` event handler
    - Add `appointment:updated` event handler
    - Add `appointment:cancelled` event handler
    - Add `timeblock:created` event handler
    - Add `timeblock:removed` event handler
    - Implement subscription management for doctor-specific updates
    - Integrate with Nora MCP subscription callbacks
    - _Requirements: 4.1, 4.2_

  - [ ] 4.2 Write property test for multi-session synchronization
    - **Property 7: Multi-Session Synchronization**
    - **Validates: Requirements 4.2**

  - [ ] 4.3 Write unit tests for WebSocket events
    - Test event broadcasting to subscribed clients
    - Test subscription filtering by doctor ID
    - Test reconnection handling
    - _Requirements: 4.2, 4.3, 4.4_

- [ ] 5. Checkpoint - Backend integration complete
  - Ensure all backend tests pass
  - Verify Nora MCP integration works with test data
  - Verify WebSocket events are broadcasting correctly
  - Ask the user if questions arise

- [ ] 6. Implement frontend calendar service
  - [ ] 6.1 Create CalendarService for API communication
    - Implement `fetchAppointments(doctorId, startDate, endDate)` method
    - Implement `subscribeToUpdates(doctorId, callback)` method for WebSocket
    - Implement client-side caching with 60-second TTL
    - Implement automatic retry with exponential backoff for network errors
    - Implement fallback to HTTP polling when WebSocket unavailable
    - Add connection status tracking
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.3, 4.4_

  - [ ] 6.2 Write property test for date range query correctness
    - **Property 5: Date Range Query Correctness**
    - **Validates: Requirements 3.1, 3.2**

  - [ ] 6.3 Write unit tests for CalendarService
    - Test cache hit/miss scenarios
    - Test retry logic on network failure
    - Test fallback to polling
    - Test WebSocket reconnection
    - _Requirements: 3.3, 3.4, 4.3, 4.4_

- [ ] 7. Implement core calendar components
  - [ ] 7.1 Create AppointmentCard component
    - Display appointment time range, patient name, type, and status
    - Implement status-based visual indicators (color coding)
    - Support compact mode for weekly view
    - Add click handler for opening detail panel
    - Apply reduced opacity for cancelled appointments
    - Highlight past appointments with "scheduled" status
    - _Requirements: 1.2, 8.1, 8.2, 8.3_

  - [ ] 7.2 Write property test for status-based visual indicators
    - **Property 14: Status-Based Visual Indicators**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [ ] 7.3 Create DailyCalendar component
    - Render time grid from 6:00 AM to 8:00 PM in 15-minute increments
    - Position appointments by start time and duration
    - Display time blocks with distinct styling
    - Detect and visually indicate overlapping appointments
    - Handle click events on appointments
    - _Requirements: 1.1, 1.4, 1.5, 6.1, 6.2, 6.3_

  - [ ] 7.4 Write property test for conflict indication
    - **Property 3: Conflict Indication**
    - **Validates: Requirements 1.4**

  - [ ] 7.5 Write property test for time block display
    - **Property 10: Time Block Display**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [ ] 7.6 Create WeeklyCalendar component
    - Render 7-column grid (Monday-Sunday) with time slots
    - Display compact appointment cards
    - Handle responsive layout (collapse to daily on mobile)
    - Detect and indicate conflicts
    - Handle click events on appointments
    - _Requirements: 1.1, 1.4, 12.1, 12.2_

  - [ ] 7.7 Write unit tests for calendar components
    - Test empty calendar display
    - Test single appointment rendering
    - Test 100+ appointments with virtualization
    - Test time slot generation
    - _Requirements: 1.5, 10.2_

- [ ] 8. Implement appointment detail panel
  - [ ] 8.1 Create AppointmentDetailPanel component
    - Display full appointment information (patient name, contact, type, duration, status, notes)
    - Display associated scheduling policy
    - Implement close handler
    - Apply role-based visibility for patient contact information
    - Add responsive layout (bottom sheet on mobile)
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ] 8.2 Write property test for appointment detail completeness
    - **Property 8: Appointment Detail Completeness**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [ ] 8.3 Write property test for detail panel state management
    - **Property 9: Detail Panel State Management**
    - **Validates: Requirements 5.4**

- [ ] 9. Implement calendar navigation and controls
  - [ ] 9.1 Create date navigation controls
    - Add previous/next buttons with correct date increment (1 day for daily, 7 days for weekly)
    - Add "Today" button to navigate to current date
    - Add date picker with 6-month range constraint (past and future)
    - Display current date range prominently in header
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 9.2 Write property test for date navigation correctness
    - **Property 11: Date Navigation Correctness**
    - **Validates: Requirements 7.1**

  - [ ] 9.3 Write property test for date picker range validation
    - **Property 12: Date Picker Range Validation**
    - **Validates: Requirements 7.2**

  - [ ] 9.4 Write property test for date range display
    - **Property 13: Date Range Display**
    - **Validates: Requirements 7.4**

  - [ ] 9.2 Create view mode toggle
    - Add daily/weekly toggle buttons
    - Preserve selected date when switching views
    - Apply responsive defaults (weekly on desktop, daily on mobile)
    - _Requirements: 1.1, 1.3, 12.1, 12.2_

  - [ ] 9.6 Write unit tests for navigation controls
    - Test "Today" button navigation
    - Test date picker date selection
    - Test view mode toggle
    - _Requirements: 7.3, 12.1, 12.2_

- [ ] 10. Implement doctor selector for medical assistants
  - [ ] 10.1 Create DoctorSelector component
    - Fetch list of doctors the user can manage
    - Display dropdown with doctor names
    - Handle doctor selection and trigger calendar update
    - Show only for medical assistants and admins (hide for doctors)
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ] 10.2 Write property test for doctor selection and display
    - **Property 4: Doctor Selection and Display**
    - **Validates: Requirements 2.2**

  - [ ] 10.3 Write unit tests for DoctorSelector
    - Test selector visibility based on role
    - Test doctor list filtering
    - Test selection change handling
    - _Requirements: 2.1, 2.4_

- [ ] 11. Implement main CalendarView container
  - [ ] 11.1 Create CalendarView container component
    - Manage calendar state (selectedDate, viewMode, selectedDoctorId, appointments, loading, error)
    - Integrate CalendarService for data fetching
    - Integrate WebSocket for real-time updates
    - Handle date changes, view mode changes, and doctor changes
    - Handle appointment clicks and detail panel display
    - Implement error display and retry logic
    - Apply role-based logic (doctors see own calendar, medical assistants see selector)
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2, 11.1, 11.2, 11.3, 11.4_

  - [ ] 11.2 Write property test for state preservation across UI changes
    - **Property 2: State Preservation Across UI Changes**
    - **Validates: Requirements 1.3, 2.3, 12.3**

  - [ ] 11.3 Write unit tests for CalendarView
    - Test initial load with loading state
    - Test error display and retry
    - Test real-time update handling
    - Test role-based rendering
    - _Requirements: 2.1, 2.4, 11.1, 11.2, 11.3, 11.4_

- [ ] 12. Implement responsive design and accessibility
  - [ ] 12.1 Add responsive breakpoints and mobile optimizations
    - Apply breakpoints (desktop >1024px, tablet 768-1024px, mobile <768px)
    - Default to weekly view on desktop, daily on mobile
    - Implement swipe gestures for date navigation on mobile
    - Use bottom sheet for appointment details on mobile
    - Ensure all touch targets are minimum 44px
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 12.2 Write property test for touch target sizing
    - **Property 17: Touch Target Sizing**
    - **Validates: Requirements 12.4**

  - [ ] 12.3 Add accessibility features
    - Add keyboard navigation for all interactive elements
    - Add ARIA labels for screen readers
    - Implement focus management for detail panel
    - Add high contrast mode support
    - Use semantic HTML for calendar structure
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ] 12.4 Write unit tests for responsive behavior
    - Test default view mode by screen size
    - Test layout changes on screen resize
    - Test swipe gesture handling
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 13. Integrate calendar view into dashboard
  - [ ] 13.1 Add calendar route to dashboard navigation
    - Add calendar route to React Router configuration
    - Add navigation link in dashboard sidebar/menu
    - Apply role-based visibility (all authenticated users can access)
    - _Requirements: 1.1, 2.1_

  - [ ] 13.2 Wire up authentication and authorization
    - Integrate with existing JWT authentication
    - Pass user role and doctor ID to CalendarView
    - Ensure API requests include authentication headers
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [ ] 13.3 Write integration tests
    - Test end-to-end calendar loading for doctor
    - Test end-to-end calendar loading for medical assistant
    - Test unauthorized access handling
    - Test real-time update flow
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 4.2_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Run all unit tests and verify 80% coverage
  - Run all property tests (100 iterations each)
  - Test calendar with real Nora MCP Server integration
  - Test WebSocket real-time updates
  - Test responsive behavior on different screen sizes
  - Verify role-based access control works correctly
  - Ask the user if questions arise

## Notes

- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations)
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end workflows
- All code should follow existing project structure and naming conventions
- Use existing services (auth middleware, WebSocket server, Nora MCP client) where possible
