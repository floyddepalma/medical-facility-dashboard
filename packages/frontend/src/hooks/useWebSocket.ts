/**
 * React Hooks for WebSocket Integration
 * 
 * Provides easy-to-use hooks for consuming real-time updates.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getWebSocketClient, WebSocketEvent } from '../services/websocket';

/**
 * Hook to subscribe to WebSocket events
 */
export function useWebSocketEvent(
  eventType: string,
  handler: (event: WebSocketEvent) => void,
  deps: any[] = []
) {
  const handlerRef = useRef(handler);

  // Update handler ref when it changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const ws = getWebSocketClient();
    if (!ws) {
      console.warn('[useWebSocketEvent] WebSocket not initialized');
      return;
    }

    const wrappedHandler = (event: WebSocketEvent) => {
      handlerRef.current(event);
    };

    const unsubscribe = ws.on(eventType, wrappedHandler);

    return () => {
      unsubscribe();
    };
  }, [eventType, ...deps]);
}

/**
 * Hook to subscribe to a WebSocket room
 */
export function useWebSocketRoom(room: string) {
  useEffect(() => {
    const ws = getWebSocketClient();
    if (!ws) {
      console.warn('[useWebSocketRoom] WebSocket not initialized');
      return;
    }

    ws.subscribe(room);

    return () => {
      ws.unsubscribe(room);
    };
  }, [room]);
}

/**
 * Hook to get WebSocket connection status
 */
export function useWebSocketStatus() {
  const [status, setStatus] = useState<'connecting' | 'open' | 'closing' | 'closed'>('closed');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = getWebSocketClient();
    if (!ws) {
      setStatus('closed');
      setIsConnected(false);
      return;
    }

    const updateStatus = () => {
      const state = ws.getState();
      setStatus(state);
      setIsConnected(state === 'open');
    };

    // Initial status
    updateStatus();

    // Listen for connection events
    const unsubscribeConnected = ws.on('connected', updateStatus);
    const unsubscribeDisconnected = ws.on('disconnected', updateStatus);

    // Poll status periodically (fallback)
    const interval = setInterval(updateStatus, 5000);

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      clearInterval(interval);
    };
  }, []);

  return { status, isConnected };
}

/**
 * Hook for real-time data updates
 * Automatically updates state when WebSocket events arrive
 */
export function useRealtimeData<T>(
  eventType: string,
  initialData: T,
  room?: string
): [T, (data: T) => void] {
  const [data, setData] = useState<T>(initialData);

  // Subscribe to room if provided
  useWebSocketRoom(room || '');

  // Listen for updates
  useWebSocketEvent(eventType, (event) => {
    setData(event.data);
  });

  return [data, setData];
}

/**
 * Hook for real-time list updates
 * Handles create, update, delete operations on arrays
 */
export function useRealtimeList<T extends { id: string }>(
  createEvent: string,
  updateEvent: string,
  deleteEvent: string,
  initialList: T[],
  room?: string
): T[] {
  const [list, setList] = useState<T[]>(initialList);

  // Subscribe to room if provided
  if (room) {
    useWebSocketRoom(room);
  }

  // Handle create
  useWebSocketEvent(createEvent, (event) => {
    setList(prev => [...prev, event.data]);
  });

  // Handle update
  useWebSocketEvent(updateEvent, (event) => {
    setList(prev => 
      prev.map(item => item.id === event.data.id ? event.data : item)
    );
  });

  // Handle delete
  useWebSocketEvent(deleteEvent, (event) => {
    setList(prev => 
      prev.filter(item => item.id !== event.data.id)
    );
  });

  // Update initial list when it changes
  useEffect(() => {
    setList(initialList);
  }, [initialList]);

  return list;
}

/**
 * Hook for toast notifications from WebSocket events
 */
export function useWebSocketNotifications(
  onNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void
) {
  // Listen for action items
  useWebSocketEvent('action:created', (event) => {
    const action = event.data;
    const urgencyType = action.urgency === 'urgent' ? 'error' : 'warning';
    onNotification(`New action required: ${action.title}`, urgencyType);
  });

  // Listen for task assignments
  useWebSocketEvent('task:created', (event) => {
    const task = event.data;
    if (task.assignee === 'staff') {
      onNotification(`New task assigned: ${task.description}`, 'info');
    }
  });

  // Listen for equipment issues
  useWebSocketEvent('equipment:updated', (event) => {
    const equipment = event.data;
    if (equipment.status === 'needs_maintenance' || equipment.status === 'offline') {
      onNotification(`Equipment issue: ${equipment.name}`, 'error');
    }
  });

  // Listen for policy conflicts
  useWebSocketEvent('policy:conflict', (event) => {
    onNotification(`Policy conflict detected: ${event.data.message}`, 'warning');
  });
}
