import { Pool } from 'pg';
import { Appointment, TimeBlock, CalendarQueryParams, CalendarResponse } from '../types/calendar';
import { UserRole } from '../types';

interface CacheEntry {
  data: any;
  timestamp: number;
}

export class CalendarService {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_TTL = 60000; // 60 seconds

  constructor(private db: Pool) {}

  /**
   * Get appointments for a doctor within a date range
   */
  async getAppointments(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Appointment[]> {
    const cacheKey = `appointments:${doctorId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.query(
      `SELECT 
        id, doctor_id, patient_name, patient_contact, appointment_type,
        start_time, end_time, duration, status, notes, policy_id,
        created_at, updated_at
      FROM appointments
      WHERE doctor_id = $1
        AND start_time >= $2
        AND start_time < $3
      ORDER BY start_time ASC`,
      [doctorId, startDate, endDate]
    );

    const appointments = result.rows.map(row => ({
      id: row.id,
      doctorId: row.doctor_id,
      patientName: row.patient_name,
      patientContact: row.patient_contact,
      appointmentType: row.appointment_type,
      startTime: row.start_time,
      endTime: row.end_time,
      duration: row.duration,
      status: row.status,
      notes: row.notes,
      policyId: row.policy_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    this.setCache(cacheKey, appointments);
    return appointments;
  }

  /**
   * Get time blocks for a doctor within a date range
   */
  async getTimeBlocks(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TimeBlock[]> {
    const cacheKey = `timeblocks:${doctorId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.query(
      `SELECT id, doctor_id, start_time, end_time, reason, description
      FROM time_blocks
      WHERE doctor_id = $1
        AND start_time >= $2
        AND start_time < $3
      ORDER BY start_time ASC`,
      [doctorId, startDate, endDate]
    );

    const timeBlocks = result.rows.map(row => ({
      id: row.id,
      doctorId: row.doctor_id,
      startTime: row.start_time,
      endTime: row.end_time,
      reason: row.reason,
      description: row.description,
    }));

    this.setCache(cacheKey, timeBlocks);
    return timeBlocks;
  }

  /**
   * Check if user has access to view doctor's calendar
   */
  async checkAccess(
    userId: string,
    userRole: UserRole,
    doctorId: string
  ): Promise<boolean> {
    // Admins can access all calendars
    if (userRole === 'admin') {
      return true;
    }

    // Check if user is the doctor
    const userResult = await this.db.query(
      'SELECT doctor_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length > 0 && userResult.rows[0].doctor_id === doctorId) {
      return true;
    }

    // Check if medical assistant manages this doctor
    if (userRole === 'medical_assistant') {
      const managedResult = await this.db.query(
        'SELECT 1 FROM user_managed_doctors WHERE user_id = $1 AND doctor_id = $2',
        [userId, doctorId]
      );
      return managedResult.rows.length > 0;
    }

    return false;
  }

  /**
   * Get doctor information
   */
  async getDoctorInfo(doctorId: string): Promise<{ id: string; name: string } | null> {
    const result = await this.db.query(
      'SELECT id, name FROM doctors WHERE id = $1 AND active = true',
      [doctorId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      id: result.rows[0].id,
      name: result.rows[0].name,
    };
  }

  /**
   * Get calendar data (appointments + time blocks + doctor info)
   */
  async getCalendarData(
    userId: string,
    userRole: UserRole,
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarResponse> {
    // Check access
    const hasAccess = await this.checkAccess(userId, userRole, doctorId);
    if (!hasAccess) {
      throw new Error('UNAUTHORIZED');
    }

    // Get doctor info
    const doctor = await this.getDoctorInfo(doctorId);
    if (!doctor) {
      throw new Error('DOCTOR_NOT_FOUND');
    }

    // Get appointments and time blocks in parallel
    const [appointments, timeBlocks] = await Promise.all([
      this.getAppointments(doctorId, startDate, endDate),
      this.getTimeBlocks(doctorId, startDate, endDate),
    ]);

    // Filter patient contact info based on role
    const filteredAppointments = appointments.map(apt => {
      if (userRole === 'medical_assistant' || userRole === 'admin') {
        return apt;
      }
      // Doctors can see their own patients' contact info
      return apt;
    });

    return {
      appointments: filteredAppointments,
      timeBlocks,
      doctor,
    };
  }

  /**
   * Invalidate cache for a doctor
   */
  invalidateCache(doctorId: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(doctorId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get from cache if not expired
   */
  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }
}
