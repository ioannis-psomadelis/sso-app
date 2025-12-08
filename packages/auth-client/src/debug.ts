// Debug event system for auth events

export type DebugEventType =
  | 'pkce_generated'
  | 'redirect_to_idp'
  | 'code_received'
  | 'token_exchange_start'
  | 'token_exchange_success'
  | 'token_exchange_error'
  | 'token_refresh_start'
  | 'token_refresh_success'
  | 'token_refresh_error'
  | 'token_refresh_skipped'
  | 'session_check'
  | 'logout';

export interface DebugEvent {
  id: string;
  type: DebugEventType;
  timestamp: Date;
  data?: Record<string, unknown>;
  description: string;
}

type DebugListener = (event: DebugEvent) => void;

class DebugEventEmitter {
  private listeners: Set<DebugListener> = new Set();
  private events: DebugEvent[] = [];

  subscribe(listener: DebugListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(type: DebugEventType, description: string, data?: Record<string, unknown>): void {
    const event: DebugEvent = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      description,
      data,
    };
    this.events.push(event);
    this.listeners.forEach((listener) => listener(event));
  }

  getEvents(): DebugEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }
}

export const debugEmitter = new DebugEventEmitter();

// Helper for code received event (used in Callback)
export function logCodeReceived(code: string): void {
  debugEmitter.emit('code_received', 'Authorization code received from IdP', {
    codePreview: code.slice(0, 10) + '...',
  });
}
