"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { MousePointer2 } from "lucide-react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { useNodesState, useReactFlow, useStore, useViewport } from "reactflow";

interface CursorPosition {
  id: string;
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  color: string;
}

interface ReactFlowCursorTrackerProps {
  userId: string;
  roomId?: string;
  serverUrl: string;
}

export default function ReactFlowCursorTracker({
  userId,
  roomId = "default",
  serverUrl,
}: ReactFlowCursorTrackerProps) {
  const [cursors, setCursors] = useState<Record<string, CursorPosition>>({});
  const socketRef = useRef<ReconnectingWebSocket | null>(null);

  // Get React Flow instance and DOM node
  const { screenToFlowPosition } = useReactFlow();
  const reactFlowWrapper = useStore((state) => state.domNode);

  // Get viewport and transform directly from the store
  const viewport = useViewport();

  // Transform screen coordinates to flow coordinates
  const getFlowPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!reactFlowWrapper || !viewport) {
        return { x: 0, y: 0, canvasX: 0, canvasY: 0 };
      }

      try {
        const reactFlowBounds = reactFlowWrapper.getBoundingClientRect();
        const screenPoint = {
          x: clientX - reactFlowBounds.left,
          y: clientY - reactFlowBounds.top,
        };

        // Convert screen to flow position
        const flowPoint = screenToFlowPosition(screenPoint);

        // Calculate absolute canvas position (independent of viewport)
        const canvasX = (screenPoint.x - viewport.x) / viewport.zoom;
        const canvasY = (screenPoint.y - viewport.y) / viewport.zoom;

        return {
          x: flowPoint.x,
          y: flowPoint.y,
          canvasX,
          canvasY,
        };
      } catch {
        return { x: 0, y: 0, canvasX: 0, canvasY: 0 };
      }
    },
    [reactFlowWrapper, viewport, screenToFlowPosition]
  );

  // Initialize WebSocket connection
  useEffect(() => {
    if (!userId || !serverUrl) return;

    // Create a reconnecting WebSocket
    const socket = new ReconnectingWebSocket(`${serverUrl}?id=${roomId}`, [], {
      maxReconnectionDelay: 5000,
      minReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1.3,
      connectionTimeout: 4000,
      maxRetries: 3,
      debug: false,
    });

    socketRef.current = socket;

    const handleOpen = () => {
      // Send join message
      socket.send(
        JSON.stringify({
          type: "join",
          userId,
          roomId,
        })
      );
    };

    const handleClose = () => {
      console.log("React Flow cursor tracker disconnected");
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "cursor-update") {
          setCursors((prev) => ({
            ...prev,
            [data.userId]: data,
          }));
        } else if (data.type === "cursor-leave") {
          setCursors((prev) => {
            const newCursors = { ...prev };
            delete newCursors[data.userId];
            return newCursors;
          });
        } else if (data.type === "cursors-state") {
          setCursors(data.cursors);
        }
      } catch (error) {
        console.error("Error parsing cursor message:", error);
      }
    };

    socket.addEventListener("open", handleOpen);
    socket.addEventListener("close", handleClose);
    socket.addEventListener("message", handleMessage);

    return () => {
      // Send leave message if connected
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(
          JSON.stringify({
            type: "leave",
            userId,
            roomId,
          })
        );
      }

      socket.removeEventListener("open", handleOpen);
      socket.removeEventListener("close", handleClose);
      socket.removeEventListener("message", handleMessage);
      socket.close();
    };
  }, [userId, roomId, serverUrl]);

  // Track mouse movement on React Flow canvas
  useEffect(() => {
    if (!reactFlowWrapper || !socketRef.current) return;

    let lastUpdate = 0;
    const THROTTLE_MS = 10; // ~30 updates per second

    const handleMouseMove = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;

      lastUpdate = now;

      try {
        // Get flow position and absolute canvas position
        const { x, y, canvasX, canvasY } = getFlowPosition(
          e.clientX,
          e.clientY
        );

        // Only send if connected
        if (
          socketRef.current &&
          socketRef.current.readyState === WebSocket.OPEN
        ) {
          const updateData = {
            type: "cursor-update",
            userId,
            roomId,
            x,
            y,
            canvasX,
            canvasY,
          };

          socketRef.current.send(JSON.stringify(updateData));
        }
      } catch (error) {
        console.error("Error tracking mouse movement:", error);
      }
    };

    reactFlowWrapper.addEventListener("mousemove", handleMouseMove);

    return () => {
      reactFlowWrapper.removeEventListener("mousemove", handleMouseMove);
    };
  }, [userId, roomId, reactFlowWrapper, getFlowPosition]);

  useEffect(() => {
    if (!viewport) return;
    setCursors((prev) => ({ ...prev }));
  }, [viewport]);

  if (!reactFlowWrapper) return null;

  return Object.values(cursors).map((cursor) => {
    console.log(cursor, userId);
    if (cursor.id === userId) return null;
    // Use the absolute canvas position and transform it to the current viewport
    const cursorX = cursor.canvasX * viewport.zoom + viewport.x;
    const cursorY = cursor.canvasY * viewport.zoom + viewport.y;
    return (
      <div
        key={cursor.id}
        className="absolute pointer-events-none"
        style={{
          position: "absolute",
          left: `${cursorX}px`,
          top: `${cursorY}px`,
          zIndex: 1000,
        }}
      >
        <MousePointer2
          color="transparent"
          fill={cursor.color}
          size={24 * viewport.zoom}
        />
      </div>
    );
  });
}
