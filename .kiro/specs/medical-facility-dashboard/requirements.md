# Requirements Document

## Introduction

The Medical Facility Dashboard is an operational management system designed for small medical practices with multiple doctors. The dashboard serves as a central hub that helps staff understand the current state of all facility operations, tasks, and resources. By providing real-time visibility into what needs to be done, what is in progress, and what has been completed, the dashboard enables staff to focus on delivering quality patient care. An Open CLAW AI agent (Open Claude) autonomously handles routine operational tasks, and the dashboard surfaces the information staff need to make decisions, intervene when necessary, and ensure smooth facility operations.

## Glossary

- **Dashboard**: The web-based operational hub for managing facility tasks, resources, and patient flow
- **Open_CLAW_Agent**: The AI assistant (Open Claude) that autonomously handles routine operational tasks
- **Examination_Room**: A standard room used for patient examinations
- **Treatment_Room**: A specialized room equipped with medical equipment (EKG machines, etc.)
- **Resource**: Any facility asset including rooms, equipment, or personnel
- **Task**: A discrete unit of work that needs to be completed for facility operations (e.g., room preparation, equipment checks, patient scheduling)
- **Operational_Task**: Work items that support facility operations and patient care delivery
- **Patient_Flow**: The movement and status of patients through the facility
- **Staff_Member**: Any doctor, nurse, or administrative personnel using the dashboard
- **Doctor**: A medical provider whose schedule is managed by Scheduling_Policies and who sees patients
- **Medical_Assistant**: Administrative staff who manages scheduling, room preparation, and operational tasks for one or more Doctors
- **Action_Required**: A task or situation that needs human attention or decision-making
- **Medical_Facility**: The small practice with multiple doctors using the dashboard system
- **Scheduling_Policy**: A rule that governs doctor availability and appointment booking (AVAILABILITY, BLOCK, OVERRIDE, DURATION, APPOINTMENT_TYPE, BOOKING_WINDOW)
- **Policy_Conflict**: A situation where a scheduling action violates one or more Scheduling_Policies
- **Doctor**: A medical provider whose schedule is managed by Scheduling_Policies

## Requirements

### Requirement 1: Display Facility Operational Status

**User Story:** As a medical facility staff member, I want to see the current operational status of the facility at a glance, so that I can quickly understand what needs my attention and prioritize my work.

#### Acceptance Criteria

1. THE Dashboard SHALL display the current status of all Examination_Rooms (available, occupied, needs cleaning, ready for next patient)
2. THE Dashboard SHALL display the current status of all Treatment_Rooms with their associated equipment status
3. THE Dashboard SHALL display a count of patients currently in the facility by status (waiting, in examination, in treatment, checking out)
4. THE Dashboard SHALL highlight any rooms or resources that require immediate Staff_Member attention
5. THE Dashboard SHALL display the current time and facility operating hours

### Requirement 2: Show Tasks Requiring Human Attention

**User Story:** As a medical facility staff member, I want to see all tasks that need my attention or decision-making, so that I can address them promptly and keep operations running smoothly.

#### Acceptance Criteria

1. THE Dashboard SHALL display a prioritized list of all Action_Required items with urgency indicators (urgent, normal, low)
2. WHEN a new Action_Required item is created, THE Dashboard SHALL display it within 5 seconds
3. FOR each Action_Required item, THE Dashboard SHALL display the task description, affected resource, and time waiting
4. THE Dashboard SHALL allow Staff_Members to mark Action_Required items as completed or in progress
5. WHEN an Action_Required item is marked completed, THE Dashboard SHALL remove it from the active list within 3 seconds

### Requirement 3: Track Patient Flow and Room Utilization

**User Story:** As a medical facility administrator, I want to understand patient flow through the facility, so that I can identify bottlenecks and optimize scheduling.

#### Acceptance Criteria

1. THE Dashboard SHALL display the average patient wait time for the current day
2. THE Dashboard SHALL display the current occupancy rate for Examination_Rooms and Treatment_Rooms
3. THE Dashboard SHALL show which doctor is assigned to each occupied room
4. THE Dashboard SHALL display the estimated time until each room becomes available
5. THE Dashboard SHALL provide a visual timeline showing room usage patterns for the current day

### Requirement 4: Manage Operational Tasks and Workflows

**User Story:** As a medical facility staff member, I want to see what operational tasks are in progress and completed, so that I can coordinate with colleagues and ensure nothing is missed.

#### Acceptance Criteria

1. THE Dashboard SHALL display all Operational_Tasks currently in progress with assigned staff or Open_CLAW_Agent
2. THE Dashboard SHALL display completed Operational_Tasks from the current day
3. FOR each Operational_Task, THE Dashboard SHALL display the task type, assignee, start time, and current status
4. THE Dashboard SHALL allow Staff_Members to manually create new Operational_Tasks
5. THE Dashboard SHALL allow Staff_Members to reassign tasks between staff or the Open_CLAW_Agent

### Requirement 5: Provide Equipment and Resource Status

**User Story:** As a medical facility staff member, I want to know the status of medical equipment and supplies, so that I can ensure everything is ready for patient care.

#### Acceptance Criteria

1. THE Dashboard SHALL display the operational status of all medical equipment (operational, in use, needs maintenance, offline)
2. WHEN equipment status changes to needs maintenance or offline, THE Dashboard SHALL create an Action_Required item
3. THE Dashboard SHALL display supply levels for critical items with low stock warnings
4. THE Dashboard SHALL show the last maintenance date for each piece of equipment
5. THE Dashboard SHALL allow Staff_Members to update equipment status and log maintenance activities

### Requirement 6: Enable Quick Decision Making with Context

**User Story:** As a medical facility staff member, I want to see relevant context when reviewing tasks or alerts, so that I can make informed decisions quickly without searching for information.

#### Acceptance Criteria

1. WHEN a Staff_Member selects an Action_Required item, THE Dashboard SHALL display full context including related patient, room, equipment, and task history
2. THE Dashboard SHALL display recent activity related to each room when viewing room status
3. THE Dashboard SHALL show the reasoning or trigger that created each Action_Required item
4. THE Dashboard SHALL provide quick access to related tasks and resources from any dashboard view
5. THE Dashboard SHALL display relevant historical data to support decision-making (e.g., typical task duration, previous similar situations)

### Requirement 7: Support Staff Coordination and Communication

**User Story:** As a medical facility staff member, I want to coordinate with my colleagues through the dashboard, so that we can work together efficiently without constant verbal communication.

#### Acceptance Criteria

1. THE Dashboard SHALL allow Staff_Members to add notes to Operational_Tasks visible to all staff
2. THE Dashboard SHALL display which Staff_Members are currently active in the dashboard
3. THE Dashboard SHALL show who is assigned to or working on each task
4. THE Dashboard SHALL allow Staff_Members to request assistance on specific tasks
5. THE Dashboard SHALL display a notification when another Staff_Member requests assistance

### Requirement 8: Provide Daily Operations Summary

**User Story:** As a medical facility administrator, I want to see summary metrics for daily operations, so that I can evaluate facility performance and identify improvement opportunities.

#### Acceptance Criteria

1. THE Dashboard SHALL display the total number of patients seen in the current day
2. THE Dashboard SHALL display the average patient visit duration for the current day
3. THE Dashboard SHALL display the number of Operational_Tasks completed by staff versus the Open_CLAW_Agent
4. THE Dashboard SHALL show room utilization percentages for the current day
5. THE Dashboard SHALL provide a comparison of current day metrics to the previous 7-day average

### Requirement 9: Handle AI Agent Limitations Gracefully

**User Story:** As a medical facility staff member, I want to be notified when the AI agent cannot complete a task, so that I can take over and ensure continuity of operations.

#### Acceptance Criteria

1. WHEN the Open_CLAW_Agent cannot complete an Operational_Task, THE Dashboard SHALL create an Action_Required item with task details
2. WHEN the Open_CLAW_Agent is unavailable, THE Dashboard SHALL display a notice and route all new tasks to Staff_Members
3. THE Dashboard SHALL display which tasks are currently being handled by the Open_CLAW_Agent versus Staff_Members
4. THE Dashboard SHALL allow Staff_Members to manually take over any task from the Open_CLAW_Agent
5. WHEN the Open_CLAW_Agent requests human input or approval, THE Dashboard SHALL create an Action_Required item with the specific question or decision needed

### Requirement 10: Ensure Responsive and Accessible Interface

**User Story:** As a medical facility staff member, I want the dashboard to be fast and easy to use during busy periods, so that I can quickly access information without technical friction.

#### Acceptance Criteria

1. THE Dashboard SHALL load the initial view within 3 seconds on standard network connections
2. THE Dashboard SHALL respond to user interactions (clicks, task updates, filters) within 500 milliseconds
3. THE Dashboard SHALL be accessible from desktop browsers (Chrome, Firefox, Safari, Edge) and tablets
4. THE Dashboard SHALL update all displayed information in real-time without requiring page refresh
5. THE Dashboard SHALL maintain usability when displaying up to 100 concurrent tasks and 20 rooms

### Requirement 11: Maintain Security and Audit Trail

**User Story:** As a medical facility administrator, I want the dashboard to protect sensitive information and track all actions, so that we maintain compliance and accountability.

#### Acceptance Criteria

1. THE Dashboard SHALL require user authentication before displaying any information
2. THE Dashboard SHALL use encrypted connections (HTTPS/TLS) for all data transmission
3. THE Dashboard SHALL log all Staff_Member actions (task updates, status changes, notes) with timestamps and user identification
4. THE Dashboard SHALL automatically log out inactive users after 30 minutes
5. THE Dashboard SHALL not display patient identifiable information (names, medical record numbers) in task descriptions or logs

### Requirement 12: Manage Doctor Scheduling Policies

**User Story:** As a medical assistant, I want to view and manage doctor scheduling policies for the doctors I support, so that I can ensure appointment booking rules are correct and handle scheduling conflicts.

#### Acceptance Criteria

1. THE Dashboard SHALL display all active Scheduling_Policies for each Doctor organized by policy type (AVAILABILITY, BLOCK, OVERRIDE, DURATION, APPOINTMENT_TYPE, BOOKING_WINDOW)
2. WHERE a Medical_Assistant supports multiple Doctors, THE Dashboard SHALL allow switching between doctor views
3. THE Dashboard SHALL allow Medical_Assistants to create new Scheduling_Policies with validation against existing policies
4. THE Dashboard SHALL allow Medical_Assistants to update or delete existing Scheduling_Policies
5. WHEN a Policy_Conflict is detected by the Open_CLAW_Agent, THE Dashboard SHALL create an Action_Required item with conflict details and suggested resolutions
6. THE Dashboard SHALL display a human-readable explanation of each Scheduling_Policy when selected

### Requirement 13: Validate Scheduling Actions

**User Story:** As a medical assistant, I want to check if a scheduling action is valid before committing it, so that I can avoid booking conflicts and policy violations.

#### Acceptance Criteria

1. THE Dashboard SHALL allow Medical_Assistants to validate a proposed scheduling action (e.g., "Book appointment at 2PM Tuesday") before execution
2. WHEN a validation check is requested, THE Dashboard SHALL return results within 2 seconds
3. WHEN a proposed action violates a Scheduling_Policy, THE Dashboard SHALL display which policies are violated and why
4. WHEN a proposed action is valid, THE Dashboard SHALL display confirmation and allow immediate execution
5. THE Dashboard SHALL show the reasoning behind validation results in human-readable format

### Requirement 14: Support Multi-Doctor Management

**User Story:** As a medical assistant managing multiple doctors, I want to view and compare schedules across all my doctors, so that I can efficiently coordinate appointments and resources.

#### Acceptance Criteria

1. WHERE a Medical_Assistant manages multiple Doctors, THE Dashboard SHALL display a unified view of all doctors' schedules
2. THE Dashboard SHALL allow filtering and sorting of tasks and Action_Required items by Doctor
3. THE Dashboard SHALL display which Doctor each room is currently being used by
4. THE Dashboard SHALL allow Medical_Assistants to quickly switch context between different Doctors
5. THE Dashboard SHALL highlight scheduling conflicts or resource contention between multiple Doctors
