import { Appointment, TimeBlock, CalendarResponse } from '../types/calendar';

const API_BASE = 'http://localhost:3000/api';
const CACHE_TTL = 60000; // 60 seconds

interface CacheEntry {
  data: CalendarResponse;
  timestamp: number;
}

class CalendarService {
  private cache: Map<string, CacheEntry> = new Map();
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second

  /**
   * Fetch appointments for a doctor within a date range
   */
  async fetchAppointments(
    doctorId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarResponse> {
    const cacheKey = `${doctorId || 'current'}:${startDate.toISOString()}:${endDate.toISOString()}`;
    
    // Check cache
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Build query params
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (doctorId) {
      params.append('doctorId', doctorId);
    }

    // Fetch with retry
    const data = await this.fetchWithRetry(
      `${API_BASE}/calendar/appointments?${params.toString()}`
    );

    // Parse dates
    const response: CalendarResponse = {
      appointments: data.appointments.map((apt: any) => ({
        ...apt,
        startTime: new Date(apt.startTime),
        endTime: new Date(apt.endTime),
        createdAt: new Date(apt.createdAt),
        updatedAt: new Date(apt.updatedAt),
      })),
      timeBlocks: data.timeBlocks.map((tb: any) => ({
        ...tb,
        startTime: new Date(tb.startTime),
        endTime: new Date(tb.endTime),
      })),
      doctor: data.doctor,
    };

    // Cache the response
    this.setCache(cacheKey, response);

    return response;
  }

  /**
   * Fetch with automatic retry on network errors
   */
  private async fetchWithRetry(url: string, attempt: number = 1): Promise<any> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Request failed');
      }

      return await response.json();
    } catch (err: any) {
      if (attempt < this.retryAttempts && this.isRetryableError(err)) {
        console.log(`Retry attempt ${attempt} for ${url}`);
        await this.delay(this.retryDelay * attempt);
        return this.fetchWithRetry(url, attempt + 1);
      }
      throw err;
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(err: any): boolean {
    // Network errors are retryable
    if (err.message.includes('fetch') || err.message.includes('network')) {
      return true;
    }
    // 5xx errors are retryable
    if (err.status >= 500) {
      return true;
    }
    return false;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get from cache if not expired
   */
  private getFromCache(key: string): CalendarResponse | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   */
  private setCache(key: string, data: CalendarResponse): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate cache for a doctor
   */
  invalidateCache(doctorId?: string): void {
    if (!doctorId) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(doctorId)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

export const calendarService = new CalendarService();
