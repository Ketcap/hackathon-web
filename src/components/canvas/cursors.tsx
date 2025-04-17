"use client";

import { useCallback, useEffect } from "react";
import { useReactFlow, useStore, useViewport } from "reactflow";
import { useRoom } from "../room/room-context";
import { MousePointer2 } from "lucide-react";
import { CursorUpdateInput } from "../../../cloudflare/types/cursor-room";
import { WebSocketMessage } from "@/hooks/useWebSocketConnection";

interface ReactFlowCursorTrackerProps {
  userId: string;
  roomId: string;
}

export function ReactFlowCursorTracker({
  userId,
  roomId,
}: ReactFlowCursorTrackerProps) {
  const { cursors, idNames, sendMessage } = useRoom();
  const { getViewport } = useReactFlow();
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

  useEffect(() => {
    let lastUpdate = 0;
    const THROTTLE_MS = 33; // ~30 updates per second

    const updateCursorPosition = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastUpdate < THROTTLE_MS) return;
      lastUpdate = now;

      try {
        // Get flow position and absolute canvas position
        const { x, y, canvasX, canvasY } = getFlowPosition(
          e.clientX,
          e.clientY
        );

        const updateData = {
          type: "cursor-update",
          id: userId,
          roomId,
          x,
          y,
          canvasX,
          canvasY,
        } as CursorUpdateInput;

        sendMessage(updateData as unknown as WebSocketMessage);
      } catch (error) {
        console.error("Error tracking mouse movement:", error);
      }
    };

    // Add event listeners for all mouse events
    window.addEventListener("mousemove", updateCursorPosition);

    return () => {
      window.removeEventListener("mousemove", updateCursorPosition);
    };
  }, [getViewport, roomId, sendMessage, getFlowPosition, userId]);

  return Object.entries(cursors).map(([id, cursor]) => {
    if (id === userId) return null;

    const userInfo = idNames[id];
    if (!userInfo) return null;

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
          fill={userInfo.color || "transparent"}
          size={36 * viewport.zoom}
        />
      </div>
    );
  });
}
