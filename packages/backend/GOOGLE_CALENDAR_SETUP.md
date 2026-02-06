# Google Calendar Integration Setup

This guide will help you set up Google Calendar integration to sync appointments from your Google Calendars into the dashboard.

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Name it something like "Medical Facility Dashboard"

## Step 2: Enable Google Calendar API

1. In your Google Cloud project, go to **APIs & Services** > **Library**
2. Search for "Google Calendar API"
3. Click on it and click **Enable**

## Step 3: Create Service Account Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **Service Account**
3. Fill in the details:
   - **Service account name**: `calendar-sync`
   - **Service account ID**: `calendar-sync` (auto-generated)
   - Click **Create and Continue**
4. Skip the optional steps and click **Done**

## Step 4: Generate Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Choose **JSON** format
5. Click **Create** - this will download a JSON file
6. **Keep this file secure!** It contains credentials to access your calendars

## Step 5: Share Calendars with Service Account

For each doctor's Google Calendar you want to sync:

1. Open Google Calendar (calendar.google.com)
2. Find the calendar in the left sidebar
3. Click the three dots next to it > **Settings and sharing**
4. Scroll to **Share with specific people**
5. Click **Add people**
6. Enter the service account email (found in the JSON file, looks like `calendar-sync@your-project.iam.gserviceaccount.com`)
7. Set permission to **See all event details**
8. Click **Send**

## Step 6: Get Calendar IDs

For each calendar you shared:

1. In Google Calendar settings, scroll to **Integrate calendar**
2. Copy the **Calendar ID** (looks like `abc123@group.calendar.google.com` or `your-email@gmail.com`)
3. Note which doctor this calendar belongs to

## Step 7: Configure Environment Variables

Add these to your `.env` file in `packages/backend/`:

```bash
# Google Calendar API Credentials (paste the entire JSON file content)
GOOGLE_CALENDAR_CREDENTIALS='{"type":"service_account","project_id":"your-project",...}'

# Calendar Mappings (doctor ID from database -> Google Calendar ID)
GOOGLE_CALENDAR_MAPPINGS='[
  {
    "doctorId": "doctor-uuid-from-database",
    "calendarId": "calendar1@group.calendar.google.com"
  },
  {
    "doctorId": "another-doctor-uuid",
    "calendarId": "calendar2@group.calendar.google.com"
  }
]'
```

### Getting Doctor IDs

Run this query in your database to get doctor IDs:

```sql
SELECT id, name FROM doctors;
```

## Step 8: Test the Integration

1. Restart your backend server
2. Check the console logs - you should see:
   ```
   ✓ Google Calendar sync started (every 5 minutes)
   Starting sync for 3 calendars...
   ✓ Synced calendar for doctor abc-123
   ```
3. Check your dashboard - appointments from Google Calendar should appear!

## Event Format in Google Calendar

For best results, format your calendar events like this:

**Event Title**: `Patient Name - Appointment Type`

Examples:
- `John Smith - Annual Checkup`
- `Mary Johnson - Follow-up`
- `Robert Brown - Consultation`

The sync service will:
- Extract patient name (before the `-`)
- Extract appointment type (after the `-`)
- Use event description as notes
- Set duration based on event start/end times

## Troubleshooting

### "GOOGLE_CALENDAR_CREDENTIALS not set"
- Make sure you added the credentials to `.env`
- The JSON must be on a single line (no line breaks)
- Wrap it in single quotes

### "Calendar not found" or "Forbidden"
- Make sure you shared the calendar with the service account email
- Check that you gave "See all event details" permission
- Wait a few minutes for permissions to propagate

### "No events syncing"
- Check that events are in the next 30 days
- Make sure events have start and end times (not all-day events)
- Check the console logs for errors

### Events not appearing in dashboard
- Check that the doctor ID in mappings matches the database
- Verify appointments were inserted: `SELECT * FROM appointments WHERE policy_id LIKE 'google:%'`
- Try refreshing the calendar view

## Sync Frequency

By default, calendars sync every **5 minutes**. You can change this in `src/index.ts`:

```typescript
startPeriodicSync(pool, 10); // Sync every 10 minutes
```

## Manual Sync

To trigger a manual sync, restart the backend server. The initial sync runs immediately on startup.
