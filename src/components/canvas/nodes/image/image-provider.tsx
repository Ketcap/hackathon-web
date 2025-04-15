"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import {
  ImageModel,
  ImageRun,
} from "../../../../../cloudflare/types/image-room";
import React, { Dispatch } from "react";

interface ImageProviderProps {
  children: React.ReactNode;
  roomId: string;
  serverUrl: string;
}

interface Config {
  model: string;
  aspect_ratio: string;
  style: string;
  image_size: string;
}

const defaultConfig: Config = {
  model: "",
  aspect_ratio: "",
  style: "",
  image_size: "",
};

interface ImageContextType {
  runs: ImageRun[];
  models: ImageModel[];
  generateImage: (prompt: string) => void;
  updateConfig: (config: Config) => void;
  config: Config;
  isRunning: boolean;
  setConfig: Dispatch<React.SetStateAction<Config>>;
}

const ImageContext = createContext<ImageContextType>({
  runs: [],
  models: [],
  generateImage: () => {},
  updateConfig: () => {},
  config: defaultConfig,
  isRunning: false,
  setConfig: () => {},
});

export function useImage() {
  return useContext(ImageContext);
}

export function ImageProvider({
  children,
  roomId,
  serverUrl,
}: ImageProviderProps) {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [isRunning, setIsRunning] = useState(false);
  const socketRef = useRef<ReconnectingWebSocket | null>(null);
  const [runs, setRuns] = useState<ImageRun[]>([]);
  const [models, setModels] = useState<ImageModel[]>([]);

  useEffect(() => {
    if (!roomId || !serverUrl) return;

    const socket = new ReconnectingWebSocket(
      `${serverUrl}/image?id=${roomId}`,
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
        if (data.type === "runs") {
          setRuns(data.runs);
        } else if (data.type === "available-models") {
          setModels(data.models);
        } else if (data.type === "isRunning") {
          setIsRunning(data.isRunning);
        } else if (data.type === "message") {
          setRuns((prev) => {
            const isExists = prev.find((run) => run.id === data.id);
            if (isExists) {
              return prev.map((run) =>
                run.id === data.id ? { ...run, ...data } : run
              );
            }
            return [...prev, data];
          });
        } else if (data.type === "config") {
          setConfig(data.config);
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

  const generateImage = (prompt: string) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = {
      type: "message",
      prompt,
    };

    socketRef.current.send(JSON.stringify(message));
  };

  return (
    <ImageContext.Provider
      value={{
        generateImage,
        updateConfig,
        config,
        isRunning,
        runs,
        models,
        setConfig,
      }}
    >
      {children}
    </ImageContext.Provider>
  );
}
