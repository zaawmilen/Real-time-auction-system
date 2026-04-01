import { io, Socket } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

type EventCallback<T = any> = (data: T) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;
    if (this.socket) { this.socket.disconnect(); }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected:', this.socket?.id);
      // Re-attach all stored listeners to the new socket
      this.listeners.forEach((callbacks, event) => {
        // Ensure we don't double-attach callbacks after reconnect
        this.socket?.removeAllListeners(event);
        callbacks.forEach(cb => this.socket?.on(event, cb));
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });

    this.socket.on('error', (data: any) => {
      console.error('[WS] Server error:', data.message);
    });
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }

  joinAuction(auctionId: string): void {
    this.socket?.emit('join_auction', { auctionId });
  }

  leaveAuction(auctionId: string): void {
    this.socket?.emit('leave_auction', { auctionId });
  }

  placeBid(lotId: string, amount: number): void {
    this.socket?.emit('place_bid', { lotId, amount });
  }

  requestLotState(lotId: string): void {
    this.socket?.emit('request_lot_state', { lotId });
  }

  on<T = any>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback);
    this.socket?.on(event, callback as EventCallback);

    // Return unsubscribe function
    return () => {
      this.socket?.off(event, callback as EventCallback);
      this.listeners.get(event)?.delete(callback as EventCallback);
    };
  }

  off(event: string, callback?: EventCallback): void {
    if (callback) {
      this.socket?.off(event, callback);
      this.listeners.get(event)?.delete(callback);
    } else {
      this.socket?.removeAllListeners(event);
      this.listeners.delete(event);
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get socketId(): string | undefined {
    return this.socket?.id;
  }
}

export const wsService = new WebSocketService();
export default wsService;
