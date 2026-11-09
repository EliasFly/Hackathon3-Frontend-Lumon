import { useEffect, useRef, useState, useCallback } from 'react';
import { eventsService } from '../api/services';
import { clearSession, getAccessToken } from '../api/client';
import type { ContingencyActivated } from '../types/lumon';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://lumon-api.vercel.app/api/v1').replace(/\/$/, '');

export function useLumonEvents(enabled = true) {
  const [activeContingency, setActiveContingency] = useState<ContingencyActivated | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<{ event: string; data: unknown } | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastEventIdRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);
  const retryDelayRef = useRef<number>(1000);
  const isConnectingRef = useRef<boolean>(false);

  const connect = useCallback(async () => {
    if (!enabled || !getAccessToken() || isConnectingRef.current) return;
    isConnectingRef.current = true;

    try {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Step 1: Request single-use ticket
      const { ticket } = await eventsService.getStreamTicket();

      // Step 2: Open EventSource with ticket and lastEventId
      let url = `${API_BASE_URL}/events/stream?ticket=${ticket}`;
      if (lastEventIdRef.current !== null) {
        url += `&lastEventId=${lastEventIdRef.current}`;
      }

      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.onopen = () => {
        setIsConnected(true);
        retryDelayRef.current = 1000;
        isConnectingRef.current = false;
      };

      const handleGenericEvent = (ev: MessageEvent, name: string) => {
        if (ev.lastEventId) {
          lastEventIdRef.current = Number(ev.lastEventId);
        }
        try {
          const parsed = JSON.parse(ev.data);
          setLastEvent({ event: name, data: parsed });
        } catch {
          setLastEvent({ event: name, data: ev.data });
        }
      };

      es.addEventListener('refiner.updated', (ev) => handleGenericEvent(ev, 'refiner.updated'));
      es.addEventListener('refinement.created', (ev) => handleGenericEvent(ev, 'refinement.created'));
      es.addEventListener('file.completed', (ev) => handleGenericEvent(ev, 'file.completed'));

      es.addEventListener('contingency.activated', (ev) => {
        if (ev.lastEventId) lastEventIdRef.current = Number(ev.lastEventId);
        try {
          const data = JSON.parse(ev.data) as ContingencyActivated;
          setActiveContingency(data);
          setLastEvent({ event: 'contingency.activated', data });
        } catch {
          // ignore
        }
      });

      es.addEventListener('contingency.resolved', (ev) => {
        if (ev.lastEventId) lastEventIdRef.current = Number(ev.lastEventId);
        setActiveContingency(null);
        setLastEvent({ event: 'contingency.resolved', data: ev.data });
      });

      es.addEventListener('session.revoked', () => {
        clearSession();
        es.close();
      });

      es.addEventListener('stream.reset', (ev) => {
        try {
          const d = JSON.parse(ev.data);
          if (d.id) lastEventIdRef.current = d.id;
        } catch {
          // ignore
        }
      });

      es.addEventListener('stream.superseded', () => {
        es.close();
        setIsConnected(false);
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setIsConnected(false);
        isConnectingRef.current = false;

        // Reconnect with backoff
        const nextDelay = Math.min(retryDelayRef.current * 1.5, 30000);
        retryDelayRef.current = nextDelay;
        if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, nextDelay);
      };
    } catch {
      setIsConnected(false);
      isConnectingRef.current = false;
      const nextDelay = Math.min(retryDelayRef.current * 1.5, 30000);
      retryDelayRef.current = nextDelay;
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, nextDelay);
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      connect();
    }
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [enabled, connect]);

  const ackContingency = async () => {
    if (!activeContingency) return;
    try {
      await eventsService.ackContingency(activeContingency.id);
      setActiveContingency(null);
    } catch {
      // mode chaos might fail with 503, modal stays open to retry
    }
  };

  return {
    isConnected,
    lastEvent,
    activeContingency,
    ackContingency,
  };
}
