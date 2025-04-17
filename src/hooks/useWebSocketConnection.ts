"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

export type WebSocketMessage = Record<string | number, unknown>;

interface WebSocketConnectionOptions {
  url: string;
  onMessage?: (data: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: ErrorEvent) => void;
  reconnectOptions?: {
    maxReconnectionDelay?: number;
    minReconnectionDelay?: number;
    reconnectionDelayGrowFactor?: number;
    connectionTimeout?: number;
    maxRetries?: number;
    debug?: boolean;
  };
}

export function useWebSocketConnection({
  url,
  onMessage,
  onOpen,
  onClose,
  reconnectOptions = {
    maxReconnectionDelay: 5000,
    minReconnectionDelay: 1000,
    reconnectionDelayGrowFactor: 1.3,
    connectionTimeout: 4000,
    maxRetries: 3,
    debug: false,
  },
}: WebSocketConnectionOptions) {
  const socketRef = useRef<ReconnectingWebSocket | null>(null);

  const [isConnected, setIsConnected] = useState(false);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current?.send(JSON.stringify(message));
    }
  }, []);

  useEffect(() => {
    const socket = new ReconnectingWebSocket(url, [], reconnectOptions);

    socketRef.current = socket;

    const handleOpen = () => {
      setIsConnected(true);
      onOpen?.();
    };

    const handleClose = () => {
      setIsConnected(false);
      onClose?.();
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as WebSocketMessage;
        onMessage?.(data);
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("message", handleMessage);

    return () => {
      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("message", handleMessage);
      socket.close();
    };
  }, [url]);

  return {
    socket: socketRef.current,
    isConnected,
    sendMessage,
  };
}
