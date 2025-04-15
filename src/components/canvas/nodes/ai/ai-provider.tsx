"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

interface AIProviderProps {
  children: React.ReactNode;
  roomId: string;
  serverUrl: string;
}

interface AIContextType {
  sendMessage: (message: string) => void;
  messages: Message[];
  updateConfig: (config: Config) => void;
  config: Config;
  isRunning: boolean;
}

interface Message {
  id: number;
  message: string;
  messageType: string;
  timestamp: Date;
}

interface Config {
  model: string;
  temperature: number;
  maxTokens: number;
  prompt: string;
}

const defaultConfig: Config = {
  model: "openai:o3-mini",
  temperature: 0.7,
  maxTokens: 1024,
  prompt: "",
};
const AIContext = createContext<AIContextType>({
  sendMessage: () => {},
  messages: [],
  updateConfig: () => {},
  config: defaultConfig,
  isRunning: false,
});

export function useAI() {
  return useContext(AIContext);
}

export function AIProvider({ children, roomId, serverUrl }: AIProviderProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [isRunning, setIsRunning] = useState(false);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);

  useEffect(() => {
    if (!roomId || !serverUrl) return;

    const socket = new ReconnectingWebSocket(
      `${serverUrl}/ai?id=${roomId}`,
      [],
      {
        maxReconnectionDelay: 5000,
        minReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: 4000,
        maxRetries: 3,
        debug: false,
      }
    );

    socketRef.current = socket;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages((prev) => {
            const doesExist = prev.find((msg) => msg.id === data.id);
            if (doesExist) {
              return prev.map((msg) =>
                msg.id === data.id ? { ...msg, message: data.message } : msg
              );
            }
            return [...prev, data];
          });
        } else if (data.type === "config") {
          setConfig(data.config);
        } else if (data.type === "status") {
          setIsRunning(data.isRunning);
        } else if (data.type === "chat-history") {
          setMessages(data.messages);
        } else if (data.type === "chunk") {
          setMessages((prev) => {
            const doesExist = prev.find((msg) => msg.id === data.id);
            if (doesExist) {
              return prev.map((msg) =>
                msg.id === data.id
                  ? { ...msg, message: msg.message + data.content }
                  : msg
              );
            }
            return prev;
          });
        }
      } catch (error) {
        console.error("Error parsing AI message:", error);
      }
    };
    const handleOpen = () => {
      // Send join message
      socket.send(
        JSON.stringify({
          type: "join",
          roomId,
        })
      );
    };

    socket.addEventListener("message", handleMessage);
    socket.addEventListener("open", handleOpen);

    return () => {
      socket.removeEventListener("message", handleMessage);
      socket.removeEventListener("open", handleOpen);
      socket.close();
    };
  }, [roomId, serverUrl]);

  const updateConfig = (config: Config) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(JSON.stringify({ type: "config", config }));
  };

  const sendMessage = (content: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: "message",
      message: content,
      messageType: "user",
    };

    socketRef.current.send(JSON.stringify(message));
  };

  return (
    <AIContext.Provider
      value={{ sendMessage, messages, updateConfig, config, isRunning }}
    >
      {children}
    </AIContext.Provider>
  );
}
