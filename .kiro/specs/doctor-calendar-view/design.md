# Design Document: Doctor Calendar View

## Overview

The Doctor Calendar View feature provides a visual interface for viewing appointment schedules within the medical facility dashboard. It integrates with the existing CareSync MCP Server to fetch appointment data and displays it in daily or weekly calendar formats. The feature supports role-based access, allowing doctors to view their own schedules and medical assistants to view schedules for multiple doctors they manage.

The design emphasizes real-time updates via WebSocket, efficient data fetching with caching, and responsive layouts that work across desktop and mobile devices. The calendar view is read-only, focusing on schedule visibility rather than appointment management (which remains handled by CareSync MCP Server and Telegram UI).

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Calendar View Component                                │ │
│  │  - DailyCalendar / WeeklyCalendar                      │ │
│  │  - AppointmentCard                                      │ │
│  │  - AppointmentDetailPanel                              │ │
│  │  - DoctorSelector (for medical assistants)             │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Calendar Service                                       │ │
│  │  - fetchAppointments(doctorId, startDate, endDate)    │ │
│  │  - subscribeToUpdates(doctorId)                       │ │
│  │  - Cache management (60s TTL)                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Backend (Node.js/Express)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Calendar Routes                                        │ │
│  │  GET /api/calendar/appointments                        │ │
│  │  GET /api/calendar/doctors/:id/appointments            │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Calendar Service                                       │ │
│  │  - getAppointments(doctorId, dateRange)               │ │
│  │  - checkAccess(userId, doctorId)                      │ │
│  │  - formatAppointmentData()                             │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WebSocket Server                                       │ │
│  │  - appointment:created                                  │ │
│  │  - appointment:updated                                  │ │
│  │  - appointment:cancelled                                │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ MCP Protocol
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CareSync MCP Server                          │
│  - Appointment storage and management                        │
│  - Scheduling policy enforcement                             │
│  - Time block management                                     │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initial Load**: User navigates to calendar view → Frontend requests appointments for date range → Backend queries CareSync MCP Server → Data cached and returned → Frontend renders calendar
2. **Real-Time Updates**: Appointment created/modified in CareSync → Backend receives notification → WebSocket broadcasts to subscribed clients → Frontend updates calendar view
3. **Date Navigation**: User changes date → Frontend checks cache → If miss, fetch from backend → Update display
4. **Doctor Switch** (Medical Assistant): User selects different doctor → Frontend fetches appointments for new doctor → Update display

## Components and Interfaces

### Frontend Components

#### CalendarView (Container)
Main container component that manages state and coordinates child components.

**Props:**
- `userId: string` - Current user ID
- `userRole: 'doctor' | 'medical_assistant' | 'admin'`
- `doctorId?: string` - Doctor ID (for doctors viewing their own calendar)

**State:**
- `selectedDoctorId: string` - Currently displayed doctor
- `viewMode: 'daily' | 'weekly'` - Current view mode
- `selectedDate: Date` - Currently selected date
- `appointments: Appointment[]` - Loaded appointments
- `loading: boolean` - Loading state
- `error: string | null` - Error message

**Methods:**
- `handleDateChange(date: Date): void`
- `handleViewModeChange(mode: 'daily' | 'weekly'): void`
- `handleDoctorChange(doctorId: string): void`
- `handleAppointmentClick(appointmentId: string): void`

#### DailyCalendar
Displays appointments for a single day in a time-grid layout.

**Props:**
- `date: Date` - Date to display
- `appointments: Appointment[]` - Appointments for the day
- `timeBlocks: TimeBlock[]` - Blocked time periods
- `onAppointmentClick: (id: string) => void`

**Rendering:**
- Time slots from 6:00 AM to 8:00 PM in 15-minute increments
- Appointments positioned by start time and duration
- Visual indicators for conflicts (overlapping appointments)
- Distinct styling for different appointment statuses

#### WeeklyCalendar
Displays appointments for a week in a grid layout (days × time slots).

**Props:**
- `startDate: Date` - First day of week
- `appointments: Appointment[]` - Appointments for the week
- `timeBlocks: TimeBlock[]` - Blocked time periods
- `onAppointmentClick: (id: string) => void`

**Rendering:**
- 7 columns (Monday-Sunday)
- Time slots from 6:00 AM to 8:00 PM
- Compact appointment cards with essential info
- Responsive layout (collapses to daily view on mobile)

#### AppointmentCard
Displays appointment summary in calendar grid.

**Props:**
- `appointment: Appointment`
- `compact: boolean` - Whether to show compact version
- `onClick: () => void`

**Display:**
- Time range (e.g., "9:00 AM - 9:30 AM")
- Patient name (filtered for PII compliance)
- Appointment type
- Status indicator (color-coded)

#### AppointmentDetailPanel
Side panel showing full appointment details.

**Props:**
- `appointment: Appointment | null`
- `onClose: () => void`

**Display:**
- Full appointment information
- Patient contact details (role-based visibility)
- Appointment type and duration
- Status with timestamp
- Associated scheduling policy
- Notes and special instructions

#### DoctorSelector
Dropdown for medical assistants to select which doctor's calendar to view.

**Props:**
- `doctors: Doctor[]` - List of doctors the user can manage
- `selectedDoctorId: string`
- `onChange: (doctorId: string) => void`

### Backend Services

#### CalendarService

**Methods:**

```typescript
class CalendarService {
  /**
   * Fetch appointments for a doctor within a date range
   */
  async getAppointments(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Appointment[]>

  /**
   * Check if user has access to view doctor's calendar
   */
  async checkAccess(
    userId: string,
    userRole: string,
    doctorId: string
  ): Promise<boolean>

  /**
   * Get time blocks for a doctor within a date range
   */
  async getTimeBlocks(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeBlock[]>

  /**
   * Format appointment data for frontend consumption
   */
  formatAppointmentData(
    appointments: CareSyncMCPAppointment[]
  ): Appointment[]
}
```

#### CareSyncMCPClient (Extended)

**New Methods:**

```typescript
class CareSyncMCPClient {
  /**
   * Query appointments from CareSync MCP Server
   */
  async queryAppointments(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CareSyncMCPAppointment[]>

  /**
   * Get time blocks from CareSync MCP Server
   */
  async getTimeBlocks(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CareSyncMCPTimeBlock[]>

  /**
   * Subscribe to appointment updates
   */
  async subscribeToAppointmentUpdates(
    doctorId: string,
    callback: (event: AppointmentEvent) => void
  ): Promise<void>
}
```

### API Endpoints

#### GET /api/calendar/appointments

Fetch appointments for the current user's calendar.

**Query Parameters:**
- `startDate: string` (ISO 8601) - Start of date range
- `endDate: string` (ISO 8601) - End of date range
- `doctorId?: string` - Doctor ID (for medical assistants/admins)

**Response:**
```typescript
{
  appointments: Appointment[],
  timeBlocks: TimeBlock[],
  doctor: {
    id: string,
    name: string
  }
}
```

**Access Control:**
- Doctors: Can only fetch their own appointments
- Medical Assistants: Can fetch appointments for doctors they manage
- Admins: Can fetch appointments for any doctor

**Validation:**
- Date range must not exceed 31 days
- startDate must be before endDate
- doctorId must be valid if provided

#### GET /api/calendar/doctors/:id/appointments

Fetch appointments for a specific doctor (medical assistants and admins only).

**Path Parameters:**
- `id: string` - Doctor ID

**Query Parameters:**
- `startDate: string` (ISO 8601)
- `endDate: string` (ISO 8601)

**Response:** Same as above

**Access Control:**
- Returns 403 if user doesn't have access to the specified doctor

### WebSocket Events

#### Server → Client

**appointment:created**
```typescript
{
  doctorId: string,
  appointment: Appointment
}
```

**appointment:updated**
```typescript
{
  doctorId: string,
  appointmentId: string,
  changes: Partial<Appointment>
}
```

**appointment:cancelled**
```typescript
{
  doctorId: string,
  appointmentId: string
}
```

**timeblock:created**
```typescript
{
  doctorId: string,
  timeBlock: TimeBlock
}
```

**timeblock:removed**
```typescript
{
  doctorId: string,
  timeBlockId: string
}
```

## Data Models

### Appointment

```typescript
interface Appointment {
  id: string;
  doctorId: string;
  patientName: string;
  patientContact?: string; // Only visible to authorized roles
  appointmentType: string;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  policyId?: string; // Associated scheduling policy
  createdAt: Date;
  updatedAt: Date;
}
```

### TimeBlock

```typescript
interface TimeBlock {
  id: string;
  doctorId: string;
  startTime: Date;
  endTime: Date;
  reason: 'lunch' | 'meeting' | 'personal' | 'other';
  description?: string;
}
```

### CalendarViewState

```typescript
interface CalendarViewState {
  viewMode: 'daily' | 'weekly';
  selectedDate: Date;
  selectedDoctorId: string;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  loading: boolean;
  error: string | null;
  selectedAppointmentId: string | null;
}
```

### AppointmentEvent (WebSocket)

```typescript
interface AppointmentEvent {
  type: 'created' | 'updated' | 'cancelled';
  doctorId: string;
  appointmentId: string;
  appointment?: Appointment;
  changes?: Partial<Appointment>;
  timestamp: Date;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Appointment Rendering Completeness

*For any* appointment, when rendered in the calendar view, the output should contain the appointment time, duration, patient name, appointment type, and status.

**Validates: Requirements 1.2**

### Property 2: State Preservation Across UI Changes

*For any* calendar state (selected date, view mode, selected doctor), when the user changes one aspect of the state (e.g., switches view mode or changes doctor), all other aspects of the state should remain unchanged.

**Validates: Requirements 1.3, 2.3, 12.3**

### Property 3: Conflict Indication

*For any* set of appointments where two or more have overlapping time ranges, the rendered calendar should include a visual conflict indicator for those appointments.

**Validates: Requirements 1.4**

### Property 4: Doctor Selection and Display

*For any* medical assistant with access to multiple doctors, when they select a doctor from the selector, the calendar should display only that doctor's appointments.

**Validates: Requirements 2.2**

### Property 5: Date Range Query Correctness

*For any* date range selection, the query to CareSync MCP Server should include start and end dates that exactly match the visible calendar range.

**Validates: Requirements 3.1, 3.2**

### Property 6: Cache Effectiveness

*For any* appointment query, if the same query is made within 60 seconds, the system should return cached data without making a new server request.

**Validates: Requirements 3.4**

### Property 7: Multi-Session Synchronization

*For any* appointment update event, all active sessions viewing the affected doctor's calendar should receive the update and reflect it in their display.

**Validates: Requirements 4.2**

### Property 8: Appointment Detail Completeness

*For any* appointment, when the detail panel is opened, it should display patient name, contact information, appointment type, duration, status, notes, and associated policy ID.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 9: Detail Panel State Management

*For any* calendar state with an open detail panel, when the panel is closed, the calendar should return to the previous state without the selected appointment.

**Validates: Requirements 5.4**

### Property 10: Time Block Display

*For any* time block, when rendered in the calendar, it should be visually distinct from appointments and should display the reason for unavailability.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 11: Date Navigation Correctness

*For any* current date and view mode (daily/weekly), when the user clicks next or previous, the new date should be exactly one day (daily) or seven days (weekly) from the current date.

**Validates: Requirements 7.1**

### Property 12: Date Picker Range Validation

*For any* date selection attempt, dates within 6 months past or future from today should be selectable, and dates outside this range should be rejected.

**Validates: Requirements 7.2**

### Property 13: Date Range Display

*For any* selected date range, the calendar header should prominently display the start and end dates of the visible range.

**Validates: Requirements 7.4**

### Property 14: Status-Based Visual Indicators

*For any* appointment, the rendered output should include a distinct visual indicator (color, icon, or style) that corresponds to its status (scheduled, completed, cancelled, no_show).

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 15: Role-Based Access Control

*For any* user and doctor combination, the system should return appointments only if the user has permission to view that doctor's calendar (doctors see their own, medical assistants see managed doctors, admins see all).

**Validates: Requirements 9.1, 9.2, 9.3**

### Property 16: Query Date Range Limit

*For any* appointment query, if the date range exceeds 31 days, the system should reject the query with a validation error.

**Validates: Requirements 10.3**

### Property 17: Touch Target Sizing

*For any* interactive element in the calendar on mobile devices, the touch target should be at least 44px in both width and height.

**Validates: Requirements 12.4**

## Error Handling

### Error Categories

1. **Network Errors**: Connection failures to CareSync MCP Server or WebSocket
2. **Authorization Errors**: User attempting to access unauthorized calendar data
3. **Validation Errors**: Invalid date ranges or malformed requests
4. **Data Errors**: Missing or corrupted appointment data

### Error Handling Strategy

#### Network Errors

**CareSync MCP Server Unavailable:**
- Display user-friendly message: "Unable to load appointments. Retrying..."
- Implement exponential backoff retry (30s, 60s, 120s)
- Log error details for debugging
- Continue displaying cached data if available
- Show connection status indicator

**WebSocket Connection Lost:**
- Automatically attempt reconnection
- Fall back to HTTP polling every 30 seconds
- Display connection status to user
- Resume real-time updates when connection restored
- Queue updates during disconnection and apply when reconnected

#### Authorization Errors

**Unauthorized Access Attempt:**
- Return HTTP 403 Forbidden
- Log security event with user ID and attempted resource
- Display message: "You don't have permission to view this calendar"
- Do not reveal whether the doctor ID exists

#### Validation Errors

**Invalid Date Range:**
- Return HTTP 400 Bad Request with specific error message
- Validate on both frontend and backend
- Error messages:
  - "Date range cannot exceed 31 days"
  - "Start date must be before end date"
  - "Invalid date format"

**Invalid Doctor ID:**
- Return HTTP 404 Not Found
- Log the invalid request
- Display message: "Doctor not found"

#### Data Errors

**Missing Appointment Data:**
- Log error with appointment ID
- Display placeholder in calendar with "Data unavailable"
- Attempt to refetch specific appointment
- Do not crash or break calendar rendering

**Corrupted Data:**
- Validate all data from CareSync MCP Server
- Skip invalid appointments with logging
- Display warning: "Some appointments could not be loaded"
- Continue rendering valid appointments

### Error Recovery

1. **Automatic Retry**: Network errors trigger automatic retry with exponential backoff
2. **Graceful Degradation**: Display cached data when live data unavailable
3. **User Notification**: Clear, actionable error messages
4. **Logging**: All errors logged with context for debugging
5. **Fallback Modes**: HTTP polling when WebSocket unavailable

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests to ensure comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property tests**: Verify universal properties across all inputs using randomized test data

### Property-Based Testing

**Framework**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**:
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `Feature: doctor-calendar-view, Property {N}: {property text}`

**Property Test Coverage**:
- All 17 correctness properties must be implemented as property-based tests
- Each property test should generate random valid inputs
- Tests should verify the property holds across all generated inputs

**Example Property Test Structure**:
```typescript
// Feature: doctor-calendar-view, Property 1: Appointment Rendering Completeness
test('appointment rendering includes all required fields', () => {
  fc.assert(
    fc.property(
      appointmentArbitrary, // Generator for random appointments
      (appointment) => {
        const rendered = renderAppointmentCard(appointment);
        expect(rendered).toContain(appointment.startTime);
        expect(rendered).toContain(appointment.duration);
        expect(rendered).toContain(appointment.patientName);
        expect(rendered).toContain(appointment.appointmentType);
        expect(rendered).toContain(appointment.status);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing

**Focus Areas**:
- Specific examples of appointment rendering
- Edge cases (empty calendars, single appointment, 100+ appointments)
- Error conditions (network failures, invalid data, unauthorized access)
- Integration points (CareSync MCP Client, WebSocket server)
- UI interactions (clicking appointments, navigation, doctor selection)

**Example Unit Tests**:
- Empty calendar displays "No appointments" message
- Clicking appointment opens detail panel
- Medical assistant selector shows only managed doctors
- 403 error when accessing unauthorized calendar
- Retry logic triggers after network failure
- WebSocket fallback to polling when connection lost

### Test Data Generators

**Appointment Generator**:
```typescript
const appointmentArbitrary = fc.record({
  id: fc.uuid(),
  doctorId: fc.uuid(),
  patientName: fc.string({ minLength: 1, maxLength: 50 }),
  appointmentType: fc.constantFrom('checkup', 'followup', 'procedure'),
  startTime: fc.date(),
  duration: fc.integer({ min: 15, max: 120 }),
  status: fc.constantFrom('scheduled', 'completed', 'cancelled', 'no_show')
});
```

**Time Block Generator**:
```typescript
const timeBlockArbitrary = fc.record({
  id: fc.uuid(),
  doctorId: fc.uuid(),
  startTime: fc.date(),
  endTime: fc.date(),
  reason: fc.constantFrom('lunch', 'meeting', 'personal', 'other')
});
```

**Date Range Generator**:
```typescript
const dateRangeArbitrary = fc.tuple(fc.date(), fc.date())
  .filter(([start, end]) => start < end);
```

### Integration Testing

**CareSync MCP Integration**:
- Test appointment fetching with real MCP client
- Verify data transformation from CareSync format to dashboard format
- Test error handling when CareSync unavailable
- Verify subscription to appointment updates

**WebSocket Integration**:
- Test real-time update delivery
- Verify multi-client synchronization
- Test reconnection logic
- Verify fallback to polling

**Access Control Integration**:
- Test role-based filtering with real auth middleware
- Verify medical assistant can only access managed doctors
- Verify doctors can only access their own calendar
- Verify admin can access all calendars

### Performance Testing

**Load Testing**:
- Calendar with 100+ appointments renders within 2 seconds
- Date navigation responds within 500ms
- WebSocket updates delivered within 5 seconds

**Stress Testing**:
- Multiple simultaneous users viewing same calendar
- Rapid date navigation (10+ changes per second)
- High-frequency appointment updates (10+ per minute)

### Coverage Goals

- Unit test coverage: 80% minimum
- All 17 correctness properties implemented as property tests
- Integration tests for all external dependencies
- Error handling tests for all error categories

## Implementation Notes

### Caching Strategy

**Frontend Cache**:
- In-memory cache with 60-second TTL
- Cache key: `${doctorId}-${startDate}-${endDate}`
- Invalidate on real-time updates
- Clear cache on logout

**Backend Cache** (Optional):
- Redis cache for frequently accessed calendars
- 10-second TTL to balance freshness and performance
- Cache key: `calendar:${doctorId}:${startDate}:${endDate}`

### Performance Optimizations

1. **Virtualization**: Use react-window for calendars with 100+ appointments
2. **Lazy Loading**: Load appointment details only when detail panel opened
3. **Debouncing**: Debounce date navigation to prevent excessive queries
4. **Batch Updates**: Batch multiple WebSocket updates into single render
5. **Database Indexes**: Index on (doctor_id, appointment_date) for fast queries

### Responsive Design

**Breakpoints**:
- Desktop: >1024px (weekly view default)
- Tablet: 768px-1024px (daily view default)
- Mobile: <768px (daily view only)

**Mobile Optimizations**:
- Simplified appointment cards (fewer details)
- Swipe gestures for date navigation
- Bottom sheet for appointment details
- Larger touch targets (44px minimum)

### Accessibility

- Keyboard navigation for all interactive elements
- ARIA labels for screen readers
- Focus management for detail panel
- High contrast mode support
- Semantic HTML for calendar structure

### Security Considerations

- PII filtering for patient contact information based on role
- Audit logging for all calendar access
- Rate limiting: 100 requests per minute per user
- Input validation on all date parameters
- SQL injection prevention via parameterized queries
- XSS prevention via content sanitization
