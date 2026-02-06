import { google } from 'googleapis';
import { Pool } from 'pg';

interface CalendarMapping {
  doctorId: string;
  calendarId: string;
}

export class GoogleCalendarSync {
  private calendar: any;
  private calendarMappings: CalendarMapping[] = [];
  private isConfigured: boolean = false;

  constructor(private db: Pool) {
    // Initialize Google Calendar API
    const credentials = this.getCredentials();
    
    if (!credentials) {
      console.warn('Google Calendar credentials not configured - sync disabled');
      this.isConfigured = false;
      return;
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      });

      this.calendar = google.calendar({ version: 'v3', auth });
      this.isConfigured = true;
    } catch (err) {
      console.error('Failed to initialize Google Calendar API:', err);
      this.isConfigured = false;
    }
  }

  /**
   * Get Google Calendar credentials from environment
   */
  private getCredentials() {
    const credentials = process.env.GOOGLE_CALENDAR_CREDENTIALS;
    if (!credentials) {
      return null;
    }
    try {
      const parsed = JSON.parse(credentials);
      // Validate it's a service account JSON (not an API key)
      if (!parsed.type || !parsed.client_email || !parsed.private_key) {
        console.error('GOOGLE_CALENDAR_CREDENTIALS must be a Service Account JSON file, not an API key');
        return null;
      }
      return parsed;
    } catch (err) {
      console.error('Failed to parse GOOGLE_CALENDAR_CREDENTIALS - must be valid JSON:', err);
      return null;
    }
  }

  /**
   * Set up calendar mappings (doctor ID -> Google Calendar ID)
   */
  setCalendarMappings(mappings: CalendarMapping[]) {
    this.calendarMappings = mappings;
  }

  /**
   * Sync all configured calendars
   */
  async syncAll(): Promise<void> {
    if (!this.isConfigured) {
      console.warn('Google Calendar sync skipped - not configured');
      return;
    }

    console.log(`Starting sync for ${this.calendarMappings.length} calendars...`);

    for (const mapping of this.calendarMappings) {
      try {
        await this.syncCalendar(mapping.doctorId, mapping.calendarId);
        console.log(`✓ Synced calendar for doctor ${mapping.doctorId}`);
      } catch (err) {
        console.error(`✗ Failed to sync calendar for doctor ${mapping.doctorId}:`, err);
      }
    }

    console.log('Sync complete');
  }

  /**
   * Sync a single calendar
   */
  private async syncCalendar(doctorId: string, calendarId: string): Promise<void> {
    // Fetch events from Google Calendar (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const response = await this.calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: thirtyDaysFromNow.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];
    console.log(`  Found ${events.length} events for doctor ${doctorId}`);

    // Sync each event to database
    for (const event of events) {
      await this.syncEvent(doctorId, event);
    }
  }

  /**
   * Sync a single event to database
   */
  private async syncEvent(doctorId: string, event: any): Promise<void> {
    // Skip events without start/end times
    if (!event.start?.dateTime || !event.end?.dateTime) {
      return;
    }

    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000); // minutes

    // Extract patient name from event summary
    const patientName = this.extractPatientName(event.summary || 'Appointment');
    const appointmentType = this.extractAppointmentType(event.summary || '');

    // Check if appointment already exists (by Google event ID)
    const existing = await this.db.query(
      'SELECT id FROM appointments WHERE policy_id = $1',
      [`google:${event.id}`]
    );

    if (existing.rows.length > 0) {
      // Update existing appointment
      await this.db.query(
        `UPDATE appointments 
         SET patient_name = $1, appointment_type = $2, start_time = $3, 
             end_time = $4, duration = $5, notes = $6, updated_at = CURRENT_TIMESTAMP
         WHERE policy_id = $7`,
        [
          patientName,
          appointmentType,
          startTime,
          endTime,
          duration,
          event.description || null,
          `google:${event.id}`,
        ]
      );
    } else {
      // Insert new appointment
      await this.db.query(
        `INSERT INTO appointments 
         (doctor_id, patient_name, appointment_type, start_time, end_time, 
          duration, status, notes, policy_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          doctorId,
          patientName,
          appointmentType,
          startTime,
          endTime,
          duration,
          'scheduled',
          event.description || null,
          `google:${event.id}`,
        ]
      );
    }
  }

  /**
   * Extract patient name from event summary
   * Assumes format like "John Smith - Checkup" or just "John Smith"
   */
  private extractPatientName(summary: string): string {
    const parts = summary.split('-');
    return parts[0].trim();
  }

  /**
   * Extract appointment type from event summary
   * Assumes format like "John Smith - Checkup"
   */
  private extractAppointmentType(summary: string): string {
    const parts = summary.split('-');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return 'Appointment';
  }

  /**
   * Delete appointments that no longer exist in Google Calendar
   */
  async cleanupDeletedEvents(_doctorId: string): Promise<void> {
    // This would require tracking which events were seen in the last sync
    // For MVP, we'll skip this and just let old appointments remain
    // You can implement this later if needed
  }
}

/**
 * Start periodic sync (every 5 minutes)
 */
export function startPeriodicSync(db: Pool, intervalMinutes: number = 5): NodeJS.Timeout | null {
  // Load calendar mappings from environment
  const mappingsJson = process.env.GOOGLE_CALENDAR_MAPPINGS;
  if (!mappingsJson) {
    console.warn('⚠ GOOGLE_CALENDAR_MAPPINGS not set - Google Calendar sync disabled');
    return null;
  }

  const sync = new GoogleCalendarSync(db);

  // Check if sync is properly configured
  if (!(sync as any).isConfigured) {
    console.warn('⚠ Google Calendar sync disabled - credentials not configured');
    console.log('  See GOOGLE_CALENDAR_SETUP.md for setup instructions');
    return null;
  }

  try {
    const mappings = JSON.parse(mappingsJson);
    sync.setCalendarMappings(mappings);
  } catch (err) {
    console.error('Failed to parse GOOGLE_CALENDAR_MAPPINGS:', err);
    return null;
  }

  // Run initial sync
  sync.syncAll().catch(err => {
    console.error('Initial sync failed:', err);
  });

  // Set up periodic sync
  const interval = setInterval(() => {
    sync.syncAll().catch(err => {
      console.error('Periodic sync failed:', err);
    });
  }, intervalMinutes * 60 * 1000);

  console.log(`✓ Google Calendar sync started (every ${intervalMinutes} minutes)`);

  return interval;
}
