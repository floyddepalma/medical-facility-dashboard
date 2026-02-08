import { User, FacilityStatus, Room, Equipment, ActionItem, Task, DailyMetrics, Doctor } from '../types';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
      throw new Error(error.error?.message || 'Request failed');
    }

    return response.json();
  }

  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' });
    this.clearToken();
  }

  async getCurrentUser(): Promise<{ user: User }> {
    return this.request('/auth/me');
  }

  // Facility
  async getFacilityStatus(): Promise<FacilityStatus> {
    return this.request('/facility/status');
  }

  async getRooms(): Promise<{ rooms: Room[] }> {
    return this.request('/facility/rooms');
  }

  async getEquipment(): Promise<{ equipment: Equipment[] }> {
    return this.request('/facility/equipment');
  }

  // Actions
  async getActions(params?: { status?: string; urgency?: string }): Promise<{ actions: ActionItem[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/actions${query ? `?${query}` : ''}`);
  }

  async updateAction(id: string, updates: { status?: string }): Promise<{ action: ActionItem }> {
    return this.request(`/actions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Tasks
  async getTasks(params?: { status?: string; assignee?: string }): Promise<{ tasks: Task[] }> {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  async createTask(task: { type: string; description: string; assignee: string }): Promise<{ task: Task }> {
    return this.request('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(id: string, updates: { status?: string; notes?: string }): Promise<{ task: Task }> {
    return this.request(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Metrics
  async getDailyMetrics(date?: string): Promise<DailyMetrics> {
    const query = date ? `?date=${date}` : '';
    return this.request(`/metrics/daily${query}`);
  }

  // Utilization / Analytics
  async getUtilization(): Promise<{
    rooms: Array<{
      roomId: string;
      roomName: string;
      roomType: string;
      currentStatus: string;
      todayTotalSeconds: number;
      todaySessionCount: number;
      avgSessionSeconds: number;
      activeSession: { startedAt: string; currentDuration: number } | null;
      color: string;
    }>;
    hourlyBreakdown: Array<{ hour: number; sessions: number; minutes: number }>;
    avgHourlyBreakdown: Array<{ hour: number; avgSessions: number; avgMinutes: number }>;
    hourlyByRoom: Record<number, Array<{
      roomId: string;
      roomName: string;
      minutes: number;
      sessions: number;
      color: string;
    }>>;
    roomColors: Record<string, string>;
    peakHour: { hour: number; sessions: number; label: string };
    generatedAt: string;
  }> {
    return this.request('/facility/utilization');
  }

  // Doctors
  async getDoctors(): Promise<{ doctors: Doctor[] }> {
    return this.request('/doctors');
  }

  // Chat
  async sendChatMessage(
    message: string,
    context: {
      currentContext: 'facility' | 'doctor_calendar';
      activeDoctorId?: string;
      conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    }
  ): Promise<{
    message: string;
    context: {
      currentContext: 'facility' | 'doctor_calendar';
      activeDoctorId?: string;
      conversationHistory: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
    };
    toolCalls?: Array<{ name: string; arguments: Record<string, any>; result?: any }>;
  }> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    });
  }
}

export const api = new ApiClient();
