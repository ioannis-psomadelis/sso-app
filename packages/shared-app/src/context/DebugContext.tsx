import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { debugEmitter, type DebugEvent } from '@repo/auth-client';

interface DebugContextType {
  events: DebugEvent[];
  clearEvents: () => void;
}

const DebugContext = createContext<DebugContextType | null>(null);

const STORAGE_KEY = 'debug_events';
const STORAGE_TIMESTAMP_KEY = 'debug_events_timestamp';
const MAX_EVENTS = 50; // Keep last 50 events
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Check if debug events should be cleared (older than 24 hours)
function shouldClearEvents(): boolean {
  try {
    const timestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
    if (!timestamp) return false;
    const savedTime = parseInt(timestamp, 10);
    return Date.now() - savedTime > MAX_AGE_MS;
  } catch {
    return false;
  }
}

// Load events from localStorage (with 24-hour expiry check)
function loadEventsFromStorage(): DebugEvent[] {
  try {
    // Check if events are older than 24 hours
    if (shouldClearEvents()) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      return [];
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((e: any) => ({
        ...e,
        timestamp: new Date(e.timestamp)
      }));
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

// Save events to localStorage with timestamp
function saveEventsToStorage(events: DebugEvent[]): void {
  try {
    // Keep only the last MAX_EVENTS
    const toSave = events.slice(-MAX_EVENTS).map(e => ({
      ...e,
      timestamp: e.timestamp.toISOString()
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    // Set timestamp if not already set (first event starts the 24h timer)
    if (!localStorage.getItem(STORAGE_TIMESTAMP_KEY)) {
      localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
    }
  } catch {
    // Ignore storage errors
  }
}

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<DebugEvent[]>(() => loadEventsFromStorage());
  const eventsRef = useRef<DebugEvent[]>(events);

  // Keep ref in sync for localStorage saves
  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

  // Save to localStorage whenever events change
  useEffect(() => {
    saveEventsToStorage(events);
  }, [events]);

  // Listen to local debug events from debugEmitter
  useEffect(() => {
    const unsubscribe = debugEmitter.subscribe((event) => {
      setEvents((prev) => {
        // Avoid duplicates
        if (prev.some(e => e.id === event.id)) return prev;
        const newEvents = [...prev, event];
        // Trim to max events
        return newEvents.slice(-MAX_EVENTS);
      });
    });
    return unsubscribe;
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    debugEmitter.clearEvents();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
  }, []);

  return (
    <DebugContext.Provider value={{ events, clearEvents }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) throw new Error('useDebug must be used within DebugProvider');
  return context;
}
