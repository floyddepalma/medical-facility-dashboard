/**
 * WebSocket Server
 * 
 * Real-time event broadcasting to connected dashboard clients.
 * Supports room-based subscriptions for efficient updates.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { parse } from 'url';

export interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  room?: string;
  doctorId?: string;
}

export interface BroadcastEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface ClientConnection {
  ws: WebSocket;
  rooms: Set<string>;
  doctorId?: string;
  userId?: string;
  isAlive: boolean;
}

export class DashboardWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<WebSocket, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      clientTracking: true
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

    console.log('✓ WebSocket server initialized at /ws');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, request: any): void {
    const { query } = parse(request.url, true);
    const userId = query.userId as string | undefined;
    const doctorId = query.doctorId as string | undefined;

    const client: ClientConnection = {
      ws,
      rooms: new Set(),
      userId,
      doctorId,
      isAlive: true
    };

    this.clients.set(ws, client);
    console.log(`[WebSocket] Client connected (userId: ${userId || 'anonymous'})`);

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connected',
      data: { 
        message: 'Connected to CareSync Dashboard',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message);
      } catch (error) {
        console.error('[WebSocket] Invalid message:', error);
      }
    });

    // Handle pong responses
    ws.on('pong', () => {
      const client = this.clients.get(ws);
      if (client) {
        client.isAlive = true;
      }
    });

    // Handle disconnection
    ws.on('close', () => {
      const client = this.clients.get(ws);
      console.log(`[WebSocket] Client disconnected (userId: ${client?.userId || 'anonymous'})`);
      this.clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
      this.clients.delete(ws);
    });
  }

  /**
   * Handle incoming client messages
   */
  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    const client = this.clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        if (message.room) {
          client.rooms.add(message.room);
          console.log(`[WebSocket] Client subscribed to: ${message.room}`);
          this.sendToClient(ws, {
            type: 'subscribed',
            data: { room: message.room },
            timestamp: new Date().toISOString()
          });
        }
        break;

      case 'unsubscribe':
        if (message.room) {
          client.rooms.delete(message.room);
          console.log(`[WebSocket] Client unsubscribed from: ${message.room}`);
        }
        break;

      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          data: {},
          timestamp: new Date().toISOString()
        });
        break;

      default:
        console.warn(`[WebSocket] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, event: BroadcastEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  /**
   * Broadcast event to all clients in a room
   */
  broadcast(room: string, eventType: string, data: any): void {
    const event: BroadcastEvent = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;

    this.clients.forEach((client, ws) => {
      // Send to clients subscribed to this room or 'all'
      if (client.rooms.has(room) || client.rooms.has('all')) {
        this.sendToClient(ws, event);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`[WebSocket] Broadcast ${eventType} to ${sentCount} clients in room: ${room}`);
    }
  }

  /**
   * Broadcast to specific doctor's clients
   */
  broadcastToDoctor(doctorId: string, eventType: string, data: any): void {
    const event: BroadcastEvent = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;

    this.clients.forEach((client, ws) => {
      if (client.doctorId === doctorId) {
        this.sendToClient(ws, event);
        sentCount++;
      }
    });

    if (sentCount > 0) {
      console.log(`[WebSocket] Broadcast ${eventType} to ${sentCount} clients for doctor: ${doctorId}`);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  broadcastAll(eventType: string, data: any): void {
    const event: BroadcastEvent = {
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;

    this.clients.forEach((client, ws) => {
      this.sendToClient(ws, event);
      sentCount++;
    });

    console.log(`[WebSocket] Broadcast ${eventType} to ${sentCount} clients`);
  }

  /**
   * Heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, ws) => {
        if (!client.isAlive) {
          console.log('[WebSocket] Terminating dead connection');
          ws.terminate();
          this.clients.delete(ws);
          return;
        }

        client.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalClients: this.clients.size,
      rooms: Array.from(this.clients.values())
        .flatMap(c => Array.from(c.rooms))
        .reduce((acc, room) => {
          acc[room] = (acc[room] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
    };
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client, ws) => {
      ws.close(1000, 'Server shutting down');
    });

    this.wss.close(() => {
      console.log('[WebSocket] Server closed');
    });
  }
}

// Singleton instance (initialized in main app)
let wsServer: DashboardWebSocketServer | null = null;

export function initializeWebSocketServer(server: Server): DashboardWebSocketServer {
  if (wsServer) {
    console.warn('[WebSocket] Server already initialized');
    return wsServer;
  }

  wsServer = new DashboardWebSocketServer(server);
  return wsServer;
}

export function getWebSocketServer(): DashboardWebSocketServer | null {
  return wsServer;
}

export function broadcastEvent(room: string, eventType: string, data: any): void {
  if (wsServer) {
    wsServer.broadcast(room, eventType, data);
  } else {
    console.warn('[WebSocket] Server not initialized, cannot broadcast');
  }
}
