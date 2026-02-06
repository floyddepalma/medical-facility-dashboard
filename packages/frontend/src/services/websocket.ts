/**
 * WebSocket Client Service
 * 
 * Manages real-time connection to backend for live updates.
 * Features auto-reconnection, room subscriptions, and event handling.
 */

export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: string;
}

export type EventHandler = (event: WebSocketEvent) => void;

export class DashboardWebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private reconnectTimer: number | null = null;
  private isIntentionallyClosed: boolean = false;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private subscribedRooms: Set<string> = new Set();
  private userId?: string;
  private doctorId?: string;

  constructor(baseUrl: string, userId?: string, doctorId?: string) {
    // Convert http/https to ws/wss
    const wsUrl = baseUrl.replace(/^http/, 'ws');
    this.url = `${wsUrl}/ws`;
    this.userId = userId;
    this.doctorId = doctorId;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    this.isIntentionallyClosed = false;

    // Add query parameters
    const params = new URLSearchParams();
    if (this.userId) params.append('userId', this.userId);
    if (this.doctorId) params.append('doctorId', this.doctorId);
    
    const urlWithParams = params.toString() 
      ? `${this.url}?${params.toString()}`
      : this.url;

    console.log('[WebSocket] Connecting to:', urlWithParams);

    try {
      this.ws = new WebSocket(urlWithParams);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
        
        // Resubscribe to rooms
        this.subscribedRooms.forEach(room => {
          this.sendMessage({ type: 'subscribe', room });
        });

        // Emit connected event
        this.emitEvent({
          type: 'connected',
          data: {},
          timestamp: new Date().toISOString()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketEvent = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        this.emitEvent({
          type: 'error',
          data: { error },
          timestamp: new Date().toISOString()
        });
      };

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected:', event.code, event.reason);
        this.ws = null;

        this.emitEvent({
          type: 'disconnected',
          data: { code: event.code, reason: event.reason },
          timestamp: new Date().toISOString()
        });

        // Attempt reconnection if not intentionally closed
        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };

    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    console.log('[WebSocket] Disconnected');
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emitEvent({
        type: 'reconnect_failed',
        data: { attempts: this.reconnectAttempts },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  /**
   * Subscribe to a room for updates
   */
  subscribe(room: string): void {
    this.subscribedRooms.add(room);
    
    if (this.isConnected()) {
      this.sendMessage({ type: 'subscribe', room });
    }
  }

  /**
   * Unsubscribe from a room
   */
  unsubscribe(room: string): void {
    this.subscribedRooms.delete(room);
    
    if (this.isConnected()) {
      this.sendMessage({ type: 'unsubscribe', room });
    }
  }

  /**
   * Register event handler
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    
    this.eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(eventType, handler);
    };
  }

  /**
   * Unregister event handler
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Send message to server
   */
  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketEvent): void {
    this.emitEvent(message);
  }

  /**
   * Emit event to registered handlers
   */
  private emitEvent(event: WebSocketEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[WebSocket] Handler error for ${event.type}:`, error);
        }
      });
    }

    // Also emit to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error('[WebSocket] Wildcard handler error:', error);
        }
      });
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): 'connecting' | 'open' | 'closing' | 'closed' {
    if (!this.ws) return 'closed';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'closed';
    }
  }
}

// Singleton instance
let wsClient: DashboardWebSocketClient | null = null;

export function initializeWebSocket(
  baseUrl: string, 
  userId?: string, 
  doctorId?: string
): DashboardWebSocketClient {
  if (wsClient) {
    console.warn('[WebSocket] Client already initialized');
    return wsClient;
  }

  wsClient = new DashboardWebSocketClient(baseUrl, userId, doctorId);
  wsClient.connect();
  
  return wsClient;
}

export function getWebSocketClient(): DashboardWebSocketClient | null {
  return wsClient;
}

export function disconnectWebSocket(): void {
  if (wsClient) {
    wsClient.disconnect();
    wsClient = null;
  }
}
