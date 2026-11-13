import { useEffect, useRef } from 'react';
import { DirectMessage, Order, User } from '../types';

interface RealtimeHandlers {
  onChatMessage?: (message: DirectMessage) => void;
  onOrderCreated?: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onArrivalVerified?: (order: Order) => void;
}

export function useRealtimeSocket(currentUser: User | null, handlers: RealtimeHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!currentUser) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws?userId=${encodeURIComponent(currentUser.id)}&role=${encodeURIComponent(currentUser.role)}`;

      try {
        ws = new WebSocket(url);

        ws.onopen = () => {
          ws?.send(
            JSON.stringify({
              type: 'auth',
              userId: currentUser.id,
              role: currentUser.role,
            })
          );
        };

        ws.onmessage = event => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.type === 'chat:message' && payload.message) {
              handlersRef.current.onChatMessage?.(payload.message);
            } else if (payload.type === 'order:created' && payload.order) {
              handlersRef.current.onOrderCreated?.(payload.order);
            } else if (payload.type === 'order:arrival_verified' && payload.order) {
              handlersRef.current.onArrivalVerified?.(payload.order);
            } else if (payload.type === 'order:updated' && payload.order) {
              handlersRef.current.onOrderUpdated?.(payload.order);
            }
          } catch {
            // Ignore malformed socket frames
          }
        };

        ws.onclose = () => {
          if (!disposed) {
            reconnectTimer = setTimeout(connect, 2500);
          }
        };
      } catch {
        if (!disposed) {
          reconnectTimer = setTimeout(connect, 3000);
        }
      }
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      } else if (ws) {
        ws.close();
      }
    };
  }, [currentUser?.id, currentUser?.role]);
}
