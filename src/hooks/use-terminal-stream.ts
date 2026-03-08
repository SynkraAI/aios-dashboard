/**
 * Terminal SSE Stream Hook
 *
 * Connects to the SSE /api/logs endpoint for real-time agent terminal output.
 * Manages reconnection with `since` parameter for replay of missed lines.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTerminalStore, type TerminalLine } from '@/stores/terminal-store';
import type { AgentId } from '@/types';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_INTERVAL = 3000;

interface UseTerminalStreamOptions {
  agentId: AgentId | 'main';
  terminalId: string;
  enabled?: boolean;
}

export function useTerminalStream({ agentId, terminalId, enabled = true }: UseTerminalStreamOptions) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>(
    'disconnected'
  );
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTimestampRef = useRef<string | null>(null);

  const { appendLine, appendLines, setTerminalStatus } = useTerminalStore();

  const connect = useCallback(() => {
    if (!enabled) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');
    setTerminalStatus(terminalId, 'connecting');
    setError(null);

    let url = `/aiox-dashboard/api/logs?agent=${agentId}`;
    if (lastTimestampRef.current) {
      url += `&since=${encodeURIComponent(lastTimestampRef.current)}`;
    }

    const es = new EventSource(url);

    es.addEventListener('line', (event) => {
      try {
        const line: TerminalLine = JSON.parse(event.data);
        lastTimestampRef.current = line.timestamp;

        if (line.isInitial) {
          appendLine(terminalId, {
            content: line.content,
            timestamp: line.timestamp,
            isInitial: true,
          });
        } else {
          appendLine(terminalId, {
            content: line.content,
            timestamp: line.timestamp,
            isInitial: false,
          });
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener('status', (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          setError(data.message);
        }
      } catch {
        // Ignore
      }
    });

    es.addEventListener('error', (event) => {
      try {
        const data = JSON.parse((event as MessageEvent).data);
        setError(data.message || 'Stream error');
      } catch {
        // Ignore
      }
    });

    es.onopen = () => {
      setStatus('connected');
      setTerminalStatus(terminalId, 'connected');
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setStatus('error');
      setTerminalStatus(terminalId, 'error', 'Connection lost');

      if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, RECONNECT_INTERVAL);
      } else {
        setError('Connection lost. Max reconnect attempts reached.');
        setTerminalStatus(terminalId, 'error', 'Max reconnect attempts reached');
      }
    };

    eventSourceRef.current = es;
  }, [agentId, terminalId, enabled, appendLine, setTerminalStatus]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStatus('disconnected');
    setTerminalStatus(terminalId, 'disconnected');
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS;
  }, [terminalId, setTerminalStatus]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Auto-connect/disconnect on mount/unmount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect, enabled]);

  return {
    status,
    error,
    connect,
    disconnect,
    reconnect,
  };
}
