# Requirements Document

## Introduction

The OpenCV Facility Monitoring system integrates computer vision capabilities into the medical facility dashboard to automatically monitor facility operations through camera feeds. The system processes video streams in real-time to detect room occupancy, equipment usage, and patient flow patterns, generating actionable insights and alerts for staff while maintaining strict privacy standards. This integration extends the existing dashboard's human-in-the-loop approach by providing automated visual monitoring that surfaces only what requires human attention.

## Glossary

- **Vision_Service**: Python-based service that processes video feeds using OpenCV and generates facility events
- **Camera_Feed**: Video stream from facility-mounted cameras (examination rooms, hallways, equipment areas)
- **Detection_Event**: Structured data output from computer vision processing (room status change, equipment detection, patient movement)
- **Anonymized_Tracking**: Patient flow tracking using non-identifying visual markers (position, movement) without facial recognition or PII capture
- **Action_Item**: Dashboard notification requiring human attention (existing system entity)
- **Room_Status**: Current state of a room (available, occupied, needs_cleaning, maintenance)
- **Equipment_Status**: Current state of equipment (operational, in_use, needs_maintenance, offline)
- **Patient_Flow_Metrics**: Aggregated statistics about patient movement and wait times
- **Dashboard_Backend**: Existing Node.js/Express API server
- **WebSocket_Server**: Real-time communication channel for dashboard updates
- **Open_CLAW_Agent**: AI agent that handles autonomous task creation and execution
- **Processing_Latency**: Time from camera frame capture to dashboard update delivery

## Requirements

### Requirement 1: Video Feed Processing

**User Story:** As a facility administrator, I want the system to process video feeds from facility cameras, so that room and equipment status can be automatically monitored without manual checks.

#### Acceptance Criteria

1. WHEN a camera feed is configured, THE Vision_Service SHALL connect to the video stream and begin processing frames
2. WHEN processing video frames, THE Vision_Service SHALL achieve a processing latency of less than 2 seconds from capture to event generation
3. WHEN a camera feed becomes unavailable, THE Vision_Service SHALL log the error and create an urgent Action_Item for technical attention
4. WHEN processing frames, THE Vision_Service SHALL process at a minimum rate of 1 frame per second per camera
5. THE Vision_Service SHALL support multiple concurrent camera feeds (minimum 8 cameras)
6. WHEN the Vision_Service starts, THE Vision_Service SHALL validate all configured camera connections before beginning monitoring

### Requirement 2: Room Occupancy Detection

**User Story:** As a medical assistant, I want automatic detection of room occupancy status, so that I can see real-time room availability without physically checking each room.

#### Acceptance Criteria

1. WHEN a room transitions from empty to occupied, THE Vision_Service SHALL detect the change and generate a Detection_Event within 2 seconds
2. WHEN a room transitions from occupied to empty, THE Vision_Service SHALL detect the change and generate a Detection_Event within 2 seconds
3. WHEN a room has been empty for more than 5 minutes after being occupied, THE Vision_Service SHALL generate a "needs_cleaning" Detection_Event
4. WHEN detecting room occupancy, THE Vision_Service SHALL use motion detection and object presence without facial recognition
5. THE Vision_Service SHALL maintain a confidence score for each room status detection (minimum 0.7 threshold for status changes)
6. WHEN a room status detection has low confidence (below 0.7), THE Vision_Service SHALL log the uncertainty but not update room status

### Requirement 3: Equipment Detection and Monitoring

**User Story:** As a facility manager, I want automatic monitoring of medical equipment usage and location, so that equipment issues can be identified quickly.

#### Acceptance Criteria

1. WHEN equipment is detected in use, THE Vision_Service SHALL update the equipment status to "in_use" via Detection_Event
2. WHEN equipment returns to idle state after use, THE Vision_Service SHALL update the equipment status to "operational" via Detection_Event
3. WHEN equipment is detected outside its designated room, THE Vision_Service SHALL create an urgent Action_Item for equipment relocation
4. WHEN equipment has been in continuous use for more than 4 hours, THE Vision_Service SHALL create a normal-urgency Action_Item for equipment check
5. THE Vision_Service SHALL detect equipment using visual markers or distinctive visual features (shape, color, size)
6. WHEN equipment cannot be located in its designated area for more than 10 minutes, THE Vision_Service SHALL create an Action_Item for missing equipment

### Requirement 4: Privacy-Preserving Patient Flow Tracking

**User Story:** As a facility administrator, I want to track patient flow through the facility without capturing personally identifiable information, so that we can optimize operations while respecting patient privacy.

#### Acceptance Criteria

1. THE Vision_Service SHALL NOT perform facial recognition or capture facial images
2. THE Vision_Service SHALL NOT store or transmit video frames or images
3. WHEN tracking patient movement, THE Vision_Service SHALL use only position coordinates and movement vectors
4. WHEN a person enters the facility, THE Vision_Service SHALL assign an anonymous tracking identifier that expires after 24 hours
5. WHEN tracking patient flow, THE Vision_Service SHALL generate aggregated metrics (wait times, bottlenecks) without individual identification
6. THE Vision_Service SHALL process all video data in memory and discard frames immediately after processing
7. WHEN generating Detection_Events, THE Vision_Service SHALL include only anonymized position data and movement statistics

### Requirement 5: Real-Time Dashboard Integration

**User Story:** As a medical staff member, I want computer vision detections to appear in the dashboard immediately, so that I can respond quickly to facility events.

#### Acceptance Criteria

1. WHEN the Vision_Service generates a Detection_Event, THE Dashboard_Backend SHALL receive the event within 500 milliseconds
2. WHEN a Detection_Event updates room status, THE Dashboard_Backend SHALL update the database and broadcast via WebSocket_Server within 1 second
3. WHEN a Detection_Event creates an Action_Item, THE Dashboard_Backend SHALL persist it to the database and notify connected clients within 1 second
4. THE Vision_Service SHALL communicate with Dashboard_Backend via REST API for Action_Item creation
5. THE Vision_Service SHALL communicate with Dashboard_Backend via WebSocket for real-time status updates
6. WHEN the Vision_Service connection is lost, THE Dashboard_Backend SHALL continue operating with last-known status and create an Action_Item for service restoration

### Requirement 6: Action Item Generation

**User Story:** As a medical assistant, I want the system to automatically create action items when issues are detected, so that I am notified of problems requiring attention.

#### Acceptance Criteria

1. WHEN a room needs cleaning is detected, THE Vision_Service SHALL create a normal-urgency Action_Item with type "room_issue"
2. WHEN equipment is misplaced or missing, THE Vision_Service SHALL create an urgent Action_Item with type "equipment_issue"
3. WHEN a camera feed fails, THE Vision_Service SHALL create an urgent Action_Item with type "manual" for technical support
4. WHEN creating an Action_Item, THE Vision_Service SHALL include context data (room_id, equipment_id, detection confidence, timestamp)
5. WHEN creating an Action_Item, THE Vision_Service SHALL include reasoning text explaining what was detected and why attention is needed
6. THE Vision_Service SHALL NOT create duplicate Action_Items for the same issue within a 30-minute window

### Requirement 7: Open CLAW Agent Integration

**User Story:** As a facility administrator, I want the AI agent to automatically respond to detected events, so that routine issues can be handled without human intervention.

#### Acceptance Criteria

1. WHEN a Detection_Event is generated, THE Vision_Service SHALL send event data to the Open_CLAW_Agent via HTTP API
2. WHEN the Open_CLAW_Agent is unavailable, THE Vision_Service SHALL fall back to creating Action_Items for human attention
3. WHEN the Open_CLAW_Agent acknowledges an event, THE Vision_Service SHALL log the agent response and not create an Action_Item
4. WHEN the Open_CLAW_Agent rejects an event or requests human review, THE Vision_Service SHALL create an Action_Item with agent reasoning included
5. THE Vision_Service SHALL include detection confidence and context in all agent communications
6. WHEN communicating with the Open_CLAW_Agent, THE Vision_Service SHALL timeout after 5 seconds and fall back to Action_Item creation

### Requirement 8: Patient Flow Metrics

**User Story:** As a facility manager, I want aggregated metrics about patient flow and wait times, so that I can identify operational bottlenecks and improve efficiency.

#### Acceptance Criteria

1. WHEN patients move through the facility, THE Vision_Service SHALL calculate average wait times per area (waiting room, examination rooms, checkout)
2. WHEN calculating metrics, THE Vision_Service SHALL aggregate data over 15-minute intervals
3. THE Vision_Service SHALL identify bottleneck areas where patient wait times exceed 15 minutes
4. WHEN a bottleneck is detected, THE Vision_Service SHALL create a normal-urgency Action_Item for workflow review
5. THE Vision_Service SHALL update the patient_flow table with anonymized tracking data for dashboard metrics
6. THE Vision_Service SHALL calculate occupancy rates for each room type (examination, treatment) over rolling 1-hour windows

### Requirement 9: Configuration and Calibration

**User Story:** As a system administrator, I want to configure camera feeds and detection parameters, so that the system can be adapted to different facility layouts and equipment.

#### Acceptance Criteria

1. THE Vision_Service SHALL load camera configurations from a JSON configuration file at startup
2. WHEN configuring a camera, THE Vision_Service SHALL require camera URL, room mapping, and detection zones
3. THE Vision_Service SHALL support configuration of detection thresholds (confidence, timing, sensitivity) per camera
4. WHEN configuration is invalid, THE Vision_Service SHALL log detailed error messages and refuse to start
5. THE Vision_Service SHALL provide a calibration mode that displays detection overlays for setup verification
6. WHEN in calibration mode, THE Vision_Service SHALL log all detections with confidence scores without updating production data

### Requirement 10: Error Handling and Resilience

**User Story:** As a facility administrator, I want the vision system to handle errors gracefully, so that temporary issues don't disrupt facility operations.

#### Acceptance Criteria

1. WHEN a camera feed drops frames, THE Vision_Service SHALL continue processing available frames without crashing
2. WHEN the Dashboard_Backend API is unreachable, THE Vision_Service SHALL queue events and retry with exponential backoff (max 5 retries)
3. WHEN event queue exceeds 100 pending events, THE Vision_Service SHALL log a critical error and create an urgent Action_Item
4. WHEN OpenCV processing fails for a frame, THE Vision_Service SHALL log the error and continue with the next frame
5. THE Vision_Service SHALL implement health check endpoint that reports processing status for all cameras
6. WHEN the Vision_Service restarts, THE Vision_Service SHALL resume monitoring without requiring manual intervention

### Requirement 11: Logging and Observability

**User Story:** As a system administrator, I want detailed logs of vision system operations, so that I can troubleshoot issues and verify correct operation.

#### Acceptance Criteria

1. THE Vision_Service SHALL log all Detection_Events with timestamp, camera ID, detection type, and confidence score
2. THE Vision_Service SHALL log all Action_Item creations with reasoning and context
3. THE Vision_Service SHALL log all communication with Dashboard_Backend and Open_CLAW_Agent (requests, responses, errors)
4. THE Vision_Service SHALL log performance metrics (frames processed per second, processing latency) every 60 seconds
5. THE Vision_Service SHALL use structured logging (JSON format) for machine-readable log analysis
6. WHEN logging, THE Vision_Service SHALL NOT include any video frame data or personally identifiable information

### Requirement 12: Demo Readiness

**User Story:** As a product demonstrator, I want a working demo of the OpenCV integration, so that stakeholders can see the system in action by Monday 9 AM CT.

#### Acceptance Criteria

1. THE Vision_Service SHALL support demo mode using pre-recorded video files instead of live camera feeds
2. WHEN in demo mode, THE Vision_Service SHALL process video files at real-time speed to simulate live monitoring
3. THE Vision_Service SHALL include sample video files demonstrating room occupancy changes, equipment detection, and patient flow
4. THE Vision_Service SHALL provide a demo configuration file with all cameras pre-configured for sample videos
5. THE Vision_Service SHALL include a README with step-by-step demo setup instructions
6. WHEN running the demo, THE Vision_Service SHALL generate realistic Detection_Events and Action_Items visible in the dashboard


### Requirement 13: Feature Configuration and Progressive Adoption

**User Story:** As a facility administrator, I want to configure which automation features are enabled, so that I can gradually adopt computer vision capabilities as staff becomes comfortable with the technology.

#### Acceptance Criteria

1. THE Vision_Service SHALL support configurable feature flags for room detection, equipment monitoring, patient flow tracking, action item creation, agent integration, and automatic status updates
2. WHEN a feature is disabled via configuration, THE Vision_Service SHALL not execute that feature's functionality
3. THE Dashboard_Backend SHALL provide an admin-only API endpoint for viewing and updating feature configuration
4. WHEN configuration is updated, THE Dashboard_Backend SHALL store the change in an audit log with user ID, timestamp, and change reason
5. THE Vision_Service SHALL refresh its feature configuration from the Dashboard_Backend every 5 minutes
6. WHEN configuration changes are detected, THE Vision_Service SHALL apply the new configuration without requiring a restart
7. THE Dashboard_Backend SHALL support three preset adoption levels (monitoring, assisted, full) with predefined feature flag combinations
8. WHEN an automation feature is first enabled, THE Dashboard_Backend SHALL create a notification Action_Item informing staff of the change
9. THE Dashboard_Backend SHALL provide an API endpoint to revert to a previous configuration from the audit log
10. WHEN reverting configuration, THE Dashboard_Backend SHALL create an audit log entry documenting the reversion
11. THE Dashboard SHALL display current adoption level and feature flags in an admin settings interface
12. WHEN viewing configuration history, THE Dashboard SHALL show all configuration changes with timestamps, users, and reasons


### Requirement 14: Open CLAW Agent Training and Onboarding

**User Story:** As a facility administrator, I want a structured training program for the Open CLAW agent, so that the agent learns to handle facility-specific operations correctly and can be progressively trusted with autonomous decision-making.

#### Acceptance Criteria

1. THE Dashboard_Backend SHALL provide an API endpoint to load training scenarios into the database
2. THE Dashboard_Backend SHALL support three agent learning phases (observation, assisted, autonomous) with different behavior for each phase
3. WHEN in observation mode, THE Open_CLAW_Agent SHALL log proposed decisions without taking action, and staff SHALL review decisions daily
4. WHEN in assisted mode, THE Open_CLAW_Agent SHALL create tasks that require staff approval before execution
5. WHEN in autonomous mode, THE Open_CLAW_Agent SHALL handle routine tasks autonomously and escalate edge cases to staff
6. THE Dashboard_Backend SHALL provide an API endpoint for staff to submit feedback on agent decisions
7. WHEN staff provides feedback on an agent decision, THE Dashboard_Backend SHALL store the feedback and update agent performance metrics
8. THE Dashboard_Backend SHALL calculate agent performance metrics (accuracy, total decisions, autonomous vs. escalated) daily
9. THE Dashboard SHALL display agent training dashboard showing current phase, performance metrics, and recent decisions
10. THE Dashboard SHALL allow admins to progress the agent through learning phases (observation → assisted → autonomous)
11. THE Dashboard_Backend SHALL automatically generate training data from real operations (staff task creation, agent overrides, task completions)
12. THE Dashboard_Backend SHALL provide training scenario library with predefined scenarios for room management, equipment handling, patient flow, and emergencies
