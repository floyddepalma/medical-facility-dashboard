# Medical Facility Dashboard - User Guide

## Overview

The Medical Facility Dashboard is a real-time operational management system designed for small medical practices with multiple doctors. It provides visibility into facility operations, scheduling, and task coordination while an AI agent handles routine operations autonomously.

---

## User Roles

### Medical Assistant
**Primary Responsibilities:**
- Monitor facility operations
- Manage schedules for assigned doctors
- Coordinate rooms and equipment
- Handle action items requiring attention
- Communicate with AI assistant for operational tasks

**Access Level:**
- Full facility status visibility
- Manage assigned doctors' calendars
- Create and complete tasks
- View all action items

### Doctor
**Primary Responsibilities:**
- Focus on patient care
- Review personal schedule
- Manage scheduling policies

**Access Level:**
- Own calendar and appointments
- Own scheduling policies
- Facility status (read-only)
- Limited dashboard access (primarily use Telegram)

### Administrator
**Primary Responsibilities:**
- System configuration
- User management
- Full facility oversight

**Access Level:**
- All features and data
- User administration
- System settings

---

## Dashboard Features

### 1. Facility Status Panel

**Real-Time Metrics:**
- **Patient Flow:** Waiting, In Exam, Treatment, Checkout counts
- **Rooms:** Examination and treatment room availability
  - Total count
  - Available count
  - Utilization percentage (color-coded)
  - Status breakdown (occupied, cleaning)
- **Equipment:** Operational, In Use, Maintenance, Offline counts

**Interactions:**
- Click any metric to see detailed breakdown
- Detail panel slides in from right
- Click elsewhere to close panel

### 2. Action Required

**Purpose:** Items requiring human decision-making

**Information Displayed:**
- Urgency level (urgent, normal, low)
- Time waiting
- Description
- Context

**Actions:**
- **Start:** Begin working on item
- **Complete:** Mark as resolved

**Queue Behavior:**
- Shows most recent 10 items
- Older items indicated with "+X more"
- First-in, first-out display

### 3. Operational Tasks

**Purpose:** Track tasks handled by staff or AI agent

**Information Displayed:**
- Task status (pending, in progress, completed)
- Assignee (AI Agent or staff member)
- Description
- Start time

**Task Breakdown:**
- AI Agent tasks count
- Staff tasks count

**Actions:**
- **Start:** Begin task (if pending)
- **Complete:** Mark as done

**Queue Behavior:**
- Shows most recent 10 items
- Older items indicated with "+X more"

### 4. AI Assistant

**Access:** Click floating chat button (bottom-right)

**Capabilities:**

**For Medical Assistants:**
```
"What's the current wait time?"
→ Provides real-time patient flow data

"Show Dr. Smith's schedule for tomorrow"
→ Switches to doctor calendar context

"Block 2-3pm on Friday for staff meeting"
→ Updates Dr. Smith's calendar

"Create a task to restock Room 3"
→ Creates operational task

"Back to facility view"
→ Returns to facility operations context
```

**For Doctors:**
```
"What's my schedule today?"
→ Shows personal appointments

"How many patients are waiting?"
→ Facility status information
```

**Context Indicator:**
- Top of chat shows current scope
- "Facility Operations" or "Doctor Calendar"
- Automatically switches based on query

### 5. Calendar View

**Access:** Click "Calendar" in navigation

**Views:**
- **Daily:** Single day, 6 AM - 8 PM
- **Weekly:** 7-day view, Monday - Sunday

**Features:**
- Appointment details
- Time blocks (lunch, meetings)
- Doctor selection (for medical assistants)
- Color-coded appointment types

**Interactions:**
- Click appointment for details
- Drag to reschedule (future feature)
- Click empty slot to schedule (future feature)

---

## Common Workflows

### Medical Assistant: Morning Routine

1. **Login** to dashboard
2. **Review Facility Status**
   - Check room availability
   - Verify equipment operational
   - Note patient flow
3. **Address Action Items**
   - Start urgent items first
   - Complete or delegate
4. **Check Doctor Schedules**
   - Use AI Assistant: "Show Dr. [Name]'s schedule"
   - Verify appointments
   - Handle any conflicts
5. **Monitor Throughout Day**
   - Watch for new action items
   - Respond to AI agent requests
   - Coordinate room turnover

### Medical Assistant: Scheduling Appointment

1. **Open AI Assistant**
2. **Switch Context:** "Show Dr. Smith's schedule for next week"
3. **Check Availability:** Review open slots
4. **Schedule:** "Schedule John Doe for Tuesday at 2pm, 30-minute checkup"
5. **Confirm:** AI validates against policies and confirms

### Doctor: Quick Schedule Check

**Option A: Dashboard**
1. Login to dashboard
2. Click Calendar tab
3. View appointments

**Option B: Telegram (Preferred)**
1. Message AI assistant on Telegram
2. "What's my schedule today?"
3. Receive summary

### Handling Policy Conflicts

**Scenario:** Attempting to schedule outside doctor's availability

1. **AI Assistant Detects Conflict**
   - "This scheduling conflicts with Dr. Smith's lunch policy"
   - Explains the conflict
   - Suggests alternatives

2. **Medical Assistant Options:**
   - Choose alternative time
   - Request policy override (if authorized)
   - Consult with doctor

---

## AI Assistant Best Practices

### Effective Queries

**✅ Good:**
- "What's the wait time?"
- "Show Dr. Johnson's availability tomorrow"
- "Create a task to clean Room 5"
- "Why is Room 3 marked as occupied?"

**❌ Avoid:**
- Vague: "What's happening?"
- Too complex: "Schedule all of Dr. Smith's patients for next month"
- Outside scope: "What's the weather?"

### Context Switching

**Natural Language:**
- "Switch to Dr. Smith's calendar"
- "Show facility status"
- "Back to operations view"

**Automatic:**
- Asking about a specific doctor switches context
- Facility questions return to facility context

### Permissions

**Medical Assistants:**
- Can manage assigned doctors only
- Cannot access other doctors' calendars
- Full facility operations access

**Doctors:**
- Own calendar only
- Cannot manage other doctors
- Read-only facility status

---

## Troubleshooting

### Dashboard Not Updating

**Symptoms:** Stale data, no real-time updates

**Solutions:**
1. Check internet connection
2. Refresh browser (Ctrl+R / Cmd+R)
3. Check system status in footer
4. Contact administrator if "System Degraded"

### AI Assistant Not Responding

**Symptoms:** Loading indefinitely, error messages

**Solutions:**
1. Check message is clear and specific
2. Verify you have permission for the action
3. Try rephrasing the question
4. Close and reopen chat panel
5. Contact administrator if persistent

### Cannot See Doctor's Schedule

**Symptoms:** "Permission denied" or empty calendar

**Solutions:**
1. Verify you're assigned to manage this doctor
2. Check you're logged in with correct account
3. Contact administrator to update permissions

### Action Items Not Appearing

**Symptoms:** Expected items missing

**Solutions:**
1. Check urgency filter (if implemented)
2. Verify items not already completed
3. Check queue limit (only 10 shown)
4. Refresh dashboard

---

## Keyboard Shortcuts

### Global
- `Ctrl/Cmd + R` - Refresh dashboard
- `Esc` - Close detail panel

### AI Assistant
- `Enter` - Send message
- `Shift + Enter` - New line in message
- `Esc` - Close chat panel

---

## Mobile Access

**Current Status:** Desktop-optimized

**Recommendations:**
- Use Telegram for mobile AI assistant access
- Dashboard best viewed on tablet or larger
- Mobile-responsive version planned for future release

---

## Support

### Getting Help

1. **AI Assistant:** Ask questions directly in chat
2. **Footer Link:** Click "Help & Support" for contact info
3. **Administrator:** Contact your facility administrator
4. **Email:** support@medfacility.com

### Reporting Issues

**Include:**
- What you were trying to do
- What happened instead
- Your role (Medical Assistant, Doctor, Admin)
- Screenshot if possible
- Time of occurrence

---

## Privacy & Security

### Data Protection
- All data encrypted in transit (HTTPS)
- Database encrypted at rest
- Access logged for audit
- Role-based access control

### Patient Information
- Patient names anonymized in logs
- PII filtered from error messages
- HIPAA-compliant data handling
- Regular security audits

### Best Practices
- Never share login credentials
- Log out when leaving workstation
- Report suspicious activity immediately
- Use strong, unique passwords

---

## Updates & Maintenance

### System Updates
- Automatic updates deployed off-hours
- No downtime for most updates
- Notification of major changes
- Release notes in footer

### Scheduled Maintenance
- Announced 48 hours in advance
- Typically Sunday 2-4 AM
- Dashboard shows maintenance banner
- Emergency contact provided

---

## Glossary

**Action Item:** Task requiring human decision-making, created by AI agent or staff

**AI Agent (CLAW):** Autonomous system handling routine operations

**Context:** Current scope of AI assistant (Facility or Doctor Calendar)

**Medical Assistant (MA):** Staff member managing facility operations and doctor schedules

**Nora RX MCP:** Policy engine managing scheduling rules

**Policy:** Rule governing doctor availability and scheduling

**Task:** Operational work item assigned to staff or AI agent

**Utilization:** Percentage of rooms currently in use
