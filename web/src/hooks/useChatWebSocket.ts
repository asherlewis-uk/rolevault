import { useCallback, useEffect, useRef, useState } from "react";
import { ROLEVAULT_API_URL } from "@/lib/runtimeConfig";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WSChatMessage {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface WSUserEvent {
  type: "user_joined" | "user_left";
  user_id: string;
  display_name?: string | null;
}

export interface WSMessageCreated {
  type: "message_created";
  message: WSChatMessage;
}

export interface WSErrorEvent {
  type: "error";
  detail: string;
}

export type WSEvent = WSMessageCreated | WSUserEvent | WSErrorEvent;

export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

export interface UseChatWebSocketOptions {
  conversationId: string;
  token: string;
  enabled?: boolean;
}

export interface UseChatWebSocketReturn {
  state: ConnectionState;
  sendMessage: (content: string) => void;
  lastEvent: WSEvent | null;
  participants: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;

function buildWsUrl(conversationId: string, token: string): string {
  const base = ROLEVAULT_API_URL.replace(/^https/, "wss").replace(/^http/, "ws");
  return `${base}/api/convos/ws/chat/${encodeURIComponent(conversationId)}?token=${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChatWebSocket({
  conversationId,
  token,
  enabled = true,
}: UseChatWebSocketOptions): UseChatWebSocketReturn {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const [participants, setParticipants] = useState<Map<string, string>>(new Map());

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef<number>(INITIAL_BACKOFF_MS);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const disconnect = useCallback(() => {
    clearRetryTimer();
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.close(1000, "client-disconnect");
      wsRef.current = null;
    }
  }, [clearRetryTimer]);

  const connect = useCallback(() => {
    if (!mountedRef.current || !token || !conversationId) return;

    disconnect();

    const url = buildWsUrl(conversationId, token);
    setState("connecting");

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      backoffRef.current = INITIAL_BACKOFF_MS;
      setState("connected");
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;

      try {
        const parsed: WSEvent = JSON.parse(event.data as string);
        setLastEvent(parsed);

        if (parsed.type === "user_joined" && parsed.user_id) {
          setParticipants((prev) => {
            const next = new Map(prev);
            next.set(parsed.user_id, parsed.display_name ?? parsed.user_id);
            return next;
          });
        } else if (parsed.type === "user_left" && parsed.user_id) {
          setParticipants((prev) => {
            const next = new Map(prev);
            next.delete(parsed.user_id);
            return next;
          });
        }
      } catch {
        // Ignore unparseable messages.
      }
    };

    ws.onerror = () => {
      // The onclose handler fires after onerror; backoff logic lives there.
    };

    ws.onclose = (event: CloseEvent) => {
      if (!mountedRef.current) return;

      wsRef.current = null;
      setParticipants(new Map());

      // Clean close initiated by the client.
      if (event.code === 1000) {
        setState("disconnected");
        return;
      }

      // Auth / not-found — don't retry.
      if (event.code === 4001 || event.code === 4004) {
        setState("disconnected");
        return;
      }

      // Reconnect with exponential backoff.
      setState("reconnecting");
      const delay = backoffRef.current;
      backoffRef.current = Math.min(backoffRef.current * BACKOFF_MULTIPLIER, MAX_BACKOFF_MS);

      retryTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, delay);
    };
  }, [conversationId, token, disconnect]);

  // Send a message through the WebSocket.
  const sendMessage = useCallback(
    (content: string) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;

      ws.send(JSON.stringify({ role: "user", content }));
    },
    [],
  );

  // Auto-connect / reconnect on dependency changes.
  useEffect(() => {
    mountedRef.current = true;

    if (enabled && token && conversationId) {
      connect();
    } else {
      disconnect();
      setState("disconnected");
    }

    return () => {
      mountedRef.current = false;
      clearRetryTimer();
      disconnect();
    };
  }, [enabled, token, conversationId, connect, disconnect, clearRetryTimer]);

  return { state, sendMessage, lastEvent, participants };
}
