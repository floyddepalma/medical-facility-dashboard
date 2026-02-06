/**
 * Open CLAW Agent Client
 * 
 * Handles communication with the Open CLAW autonomous AI agent.
 * Sends facility status updates and receives recommendations.
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

export interface FacilityStatusUpdate {
  timestamp: string;
  facilityId: string;
  rooms: Array<{
    id: string;
    name: string;
    type: 'examination' | 'treatment';
    status: 'available' | 'occupied' | 'needs_cleaning' | 'maintenance';
    currentDoctorId?: string;
    estimatedAvailableAt?: string;
  }>;
  equipment: Array<{
    id: string;
    name: string;
    type: string;
    status: 'operational' | 'in_use' | 'needs_maintenance' | 'offline';
  }>;
  patients: {
    waiting: number;
    inExamination: number;
    inTreatment: number;
    checkingOut: number;
  };
  tasks: Array<{
    id: string;
    type: string;
    status: 'pending' | 'in_progress' | 'completed';
    assignee: string;
  }>;
  actionItems: Array<{
    id: string;
    type: string;
    urgency: 'urgent' | 'normal' | 'low';
    title: string;
  }>;
}

export interface ClawRecommendation {
  recommendation: string;
  confidence: number;
  suggestedActions?: string[];
}

export interface ClawStatus {
  status: 'active' | 'idle' | 'processing' | 'error' | 'offline';
  lastActivity: string;
  uptime: number;
  currentTaskCount: number;
  errorMessage?: string;
}

export class ClawAgentClient {
  private client: AxiosInstance;
  private baseURL: string;
  private isHealthy: boolean = false;
  private lastHealthCheck: Date | null = null;

  constructor() {
    this.baseURL = process.env.CLAW_AGENT_URL || 'http://localhost:8000';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${process.env.CLAW_AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        this.isHealthy = true;
        this.lastHealthCheck = new Date();
        return response;
      },
      (error: AxiosError) => {
        this.isHealthy = false;
        console.error('[CLAW Client] Request failed:', error.message);
        throw error;
      }
    );
  }

  /**
   * Send facility status update to CLAW
   */
  async sendFacilityStatus(status: FacilityStatusUpdate): Promise<void> {
    try {
      const response = await this.client.post('/facility-status', status);
      console.log(`[CLAW Client] Facility status sent. Actions planned: ${response.data.actionsPlanned || 0}`);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          console.warn('[CLAW Client] Agent offline - status update queued');
        } else {
          console.error('[CLAW Client] Failed to send facility status:', error.message);
        }
      }
      throw error;
    }
  }

  /**
   * Query CLAW for a recommendation
   */
  async getRecommendation(context: string): Promise<string> {
    try {
      const response = await this.client.post<ClawRecommendation>('/query', { context });
      return response.data.recommendation;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error('CLAW agent is offline');
        }
        throw new Error(`CLAW query failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Get CLAW agent status
   */
  async getStatus(): Promise<ClawStatus> {
    try {
      const response = await this.client.get<ClawStatus>('/status');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === 'ECONNREFUSED') {
        return {
          status: 'offline',
          lastActivity: this.lastHealthCheck?.toISOString() || new Date().toISOString(),
          uptime: 0,
          currentTaskCount: 0,
          errorMessage: 'Agent is not responding'
        };
      }
      throw error;
    }
  }

  /**
   * Health check - ping CLAW agent
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 3000 });
      this.isHealthy = true;
      this.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Check if CLAW is currently healthy
   */
  isAgentHealthy(): boolean {
    return this.isHealthy;
  }

  /**
   * Get last successful health check time
   */
  getLastHealthCheck(): Date | null {
    return this.lastHealthCheck;
  }

  /**
   * Get base URL for debugging
   */
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Singleton instance
export const clawAgent = new ClawAgentClient();

/**
 * Facility Status Broadcaster
 * 
 * Periodically sends facility status to CLAW agent
 */
export class FacilityStatusBroadcaster {
  private intervalId: NodeJS.Timeout | null = null;
  private interval: number;
  private isRunning: boolean = false;

  constructor(intervalMs: number = 10000) {
    this.interval = intervalMs;
  }

  /**
   * Start broadcasting facility status
   */
  start(getFacilityStatus: () => Promise<FacilityStatusUpdate>): void {
    if (this.isRunning) {
      console.warn('[Status Broadcaster] Already running');
      return;
    }

    console.log(`[Status Broadcaster] Starting (interval: ${this.interval}ms)`);
    this.isRunning = true;

    // Send immediately
    this.broadcast(getFacilityStatus);

    // Then send periodically
    this.intervalId = setInterval(() => {
      this.broadcast(getFacilityStatus);
    }, this.interval);
  }

  /**
   * Stop broadcasting
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Status Broadcaster] Stopped');
  }

  /**
   * Broadcast facility status once
   */
  private async broadcast(getFacilityStatus: () => Promise<FacilityStatusUpdate>): Promise<void> {
    try {
      const status = await getFacilityStatus();
      await clawAgent.sendFacilityStatus(status);
    } catch (error) {
      // Don't log if agent is simply offline
      if (error instanceof Error && !error.message.includes('ECONNREFUSED')) {
        console.error('[Status Broadcaster] Error:', error.message);
      }
    }
  }

  /**
   * Check if broadcaster is running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton broadcaster instance
export const facilityBroadcaster = new FacilityStatusBroadcaster(
  parseInt(process.env.FACILITY_STATUS_INTERVAL || '10000')
);
